const socket = io();

const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (message) {
    appendMessage('You', message, 'user');
    socket.emit('chat message', message);
    input.value = '';
    input.focus();
  }
});

socket.on('chat reply', (msg) => {
  appendMessage('AI', msg, 'ai');
});


let currentAIMessage = null;

socket.on('chat reply stream', (msg) => {
  if (!currentAIMessage) {
    currentAIMessage = appendMessage('AI', '', 'ai');
  }
  currentAIMessage.textContent += msg;
});

socket.on('chat reply end', () => {
  currentAIMessage = null;
});

//audio
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioBufferQueue = [];
let isPlaying = false;

// G.711 μ-law to PCM conversion table
const ULAW_TO_PCM = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  const ulaw = ~i;
  let t = ((ulaw & 0x0F) << 3) + 0x84;
  t <<= ((ulaw & 0x70) >> 4);
  ULAW_TO_PCM[i] = (ulaw & 0x80) ? (0x84 - t) : (t - 0x84);
}

// Function to convert G.711 μ-law to PCM
function ulawToPcm(ulawData) {
  const pcmData = new Int16Array(ulawData.length);
  for (let i = 0; i < ulawData.length; i++) {
    pcmData[i] = ULAW_TO_PCM[ulawData[i]];
  }
  return pcmData;
}


// Function to add WAV header to PCM data
function addWavHeader(pcmData) {
  const numOfChannels = 1; // Mono
  const sampleRate = 8000; // Sample rate used by OpenAI (adjust if different)
  const bitsPerSample = 8; // 8 bits per sample for u-law
  const audioFormat = 7; // Audio format code for u-law encoding (0x0007)

  const blockAlign = numOfChannels * bitsPerSample / 8;
  const byteRate = sampleRate * blockAlign;
  const wavDataByteLength = pcmData.byteLength;
  const totalDataLength = wavDataByteLength + 44;

  const buffer = new ArrayBuffer(44 + wavDataByteLength);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* File length */
  view.setUint32(4, 36 + wavDataByteLength, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* Format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* Format chunk length */
  view.setUint32(16, 16, true);
  /* Audio format (7 = μ-law) */
  view.setUint16(20, audioFormat, true);
  /* Number of channels */
  view.setUint16(22, numOfChannels, true);
  /* Sample rate */
  view.setUint32(24, sampleRate, true);
  /* Byte rate (sampleRate * blockAlign) */
  view.setUint32(28, byteRate, true);
  /* Block align (numOfChannels * bitsPerSample / 8) */
  view.setUint16(32, blockAlign, true);
  /* Bits per sample */
  view.setUint16(34, bitsPerSample, true);
  /* Data chunk identifier */
  writeString(view, 36, 'data');
  /* Data chunk length */
  view.setUint32(40, wavDataByteLength, true);

  // Write PCM data
  const pcmDataView = new Uint8Array(buffer, 44);
  pcmDataView.set(new Uint8Array(pcmData));

  return buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

socket.on('chat audio stream', (audioBase64) => {
  // Convert base64 string to Uint8Array
  const ulawData = new Uint8Array(atob(audioBase64).split('').map(char => char.charCodeAt(0)));

  // Convert G.711 μ-law to PCM
  const pcmData = ulawToPcm(ulawData);

  // Create an AudioBuffer
  const buffer = audioContext.createBuffer(1, pcmData.length, 8000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < pcmData.length; i++) {
    channelData[i] = pcmData[i] / 32768; // Normalize to [-1, 1]
  }

  audioBufferQueue.push(buffer);
  if (!isPlaying) {
    playAudioQueue();
  }
});

function playAudioQueue() {
  if (audioBufferQueue.length > 0) {
    isPlaying = true;
    const buffer = audioBufferQueue.shift();
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    source.onended = () => {
      playAudioQueue();
    };
  } else {
    isPlaying = false;
  }
}


function appendMessage(sender, message, className) {
  const messageElement = document.createElement('div');
  messageElement.classList.add(className);
  messageElement.innerHTML = `<strong>${sender}:</strong> <span>${message}</span>`;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return messageElement.querySelector('span');
}




