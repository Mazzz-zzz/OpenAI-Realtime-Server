const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const WebSocket = require('ws');
const axios = require('axios');

require('dotenv').config();

const config = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_WS_URL: process.env.OPENAI_WS_URL,
  PORT: process.env.PORT || 8383
};

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const sessions = new Map();

async function createResponse(ws, type, userMessage) {

  if (type == 'text input') {
  // Send the user's message as a conversation item
    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: userMessage
          }
        ]
      }
    }));

    // After sending the user's message, create a response to generate assistant's reply
    ws.send(JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["text", "audio"],
        instructions: "You are acting as an alarm clock for the user. Your job is to wake the user up, and no matter what they say, you must do anything to wake them up, be aware that they will lie to you to stop the alarm, you must be very persistent and vigilant. once you can confirm the user is no longer sleepy, you can call the stop_alarm function.",
        voice: "alloy",
        tools: [
          {
            "type": "function",
            "name": "stop_alarm",
            "description": "Stops the alarm.",
            "parameters": {
              "type": "object",
              "properties": {
                "is_out_of_bed": { "type": "boolean" },
                "alertness_level": { 
                  "type": "string",
                  "enum": ["fully_awake", "somewhat_awake", "still_sleepy"]
                }
              },
            }
          }
        ],
        tool_choice: "auto",
        output_audio_format: "g711_ulaw",
        
      },
      
    }));
  }
  else if (type == 'audio input') {
    //using VAD mode. will commit to buffer automatically and give response when stop detected. 
    ws.send(JSON.stringify({
      "type": "input_audio_buffer.append",
      "audio": userMessage
    }));
  }


}

function createWebsocketConnection() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(config.OPENAI_WS_URL, {
      headers: {
        "Authorization": `Bearer ${config.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    ws.on("open", () => {
      console.log("Connected to OpenAI Realtime API.");

      // Send a request to create a new response
      ws.send(JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["text", "audio"],
          instructions: "You are acting as an alarm clock for the user. Your job is to wake the user up, and no matter what they say, you must do anything to wake them up. once you can confirm the user is no longer sleepy, you can call the stop_alarm function.",
          voice: "alloy",
          tools: [
            {
              "type": "function",
              "name": "stop_alarm",
              "description": "Stops the alarm.",
              "parameters": {
                "type": "object",
                "properties": {
                  "is_out_of_bed": { "type": "boolean" },
                  "alertness_level": { 
                    "type": "string",
                    "enum": ["fully_awake", "somewhat_awake", "still_sleepy"]
                  }
                },
              }
            }
          ],
          tool_choice: "auto",
          output_audio_format: "g711_ulaw",
        }
      }))

      resolve(ws); // Resolve the Promise with the connected WebSocket
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      reject(error); // Reject the Promise if there's an error
    });
  });
}

// Separate WebSocket handling into its own function
function listenToWebSocket(ws, socket) {
  ws.on('message', (data) => {
    const response = JSON.parse(data);
    console.log("Received response:", response.type);

    switch (response.type) {

    //new session created. 
    case 'session.created':
      //console.log('Session created:', response);
      sessions.set(response.session.id, ws);
      break;

      //new conversation item created. 
    case 'conversation.item.created':
      //console.log('Conversation item created:', response.item.content);
      break;


      //new response output item added. 
    case 'response.output_item.added':
      //console.log('Response output item added:', response.output_item.output);
      break;

      //new response created. 
    case 'response.created':
      //console.log('Response created:', response.response_id);
      break;

    case 'response.text.delta':
      console.log('Response text delta:', response.delta);
      socket.emit('chat reply stream', response.delta);
      break;

    case 'response.audio.delta':
      //console.log('Response audio delta:', response.delta);
      socket.emit('chat audio stream', response.delta);
      break;

      //response is done. 
    case 'response.done':
      //console.log('Response done:', response);
      socket.emit('chat reply end');
      break;

    case 'response.content_part.added':
      //console.log('Response content part added:', response);
      //socket.emit('chat reply', response.content_part);
      break;

      // Corrected case (previously 'response.conversation.item.ad'):
    case 'response.conversation.item.added':
      console.log('Conversation item added:', response);
      socket.emit('chat reply', response.content_part);
      break;

    case 'response.error':
      console.error('API error:', response.error);
      socket.emit('chat reply', `Error: ${response.error.message}`);
      ws.close();
      break;

    case 'rate_limits.updated':
      //console.log('Rate limits updated:', response.rate_limits);
      break;

    case 'response.audio_transcript.done':
      //console.log('Audio transcript done:', response.audio_transcript);
      break;

    case 'response.audio.done':
      //do nothing. In the future we can use this to add a pause to the audio stream. 
      break;

    case 'response.content_part.done':
      //do nothing.
      break;

    case 'response.output_item.done':
      //do nothing.
      break;

    case 'response.audio_transcript.delta':
      //console.log('Audio transcript done:', response.audio_transcript);
      //transcript is received. 
      socket.emit('chat reply stream', response.delta);
      break;


    case 'response.function_call_arguments.done':
      console.log('Function call arguments done:', response.name);
      console.log('called wake up function');
      socket.emit('stop alarm', response.arguments);
      break;

    case 'input_audio_buffer.speech_started':
      //speech has been detected using VAD.
      break;

    case 'input_audio_buffer.speech_stopped':
      //speech has stopped in turn detection. Server will now send us audio data. 
      //might be smart to stop audio stream on client side here. 
      break;

    case 'input_audio_buffer.committed':
      //so the audio buffer is committed. likely by server in VAD detection mode.
      break;



    case 'error':
      console.log('Error:', response.error);
      break;


  

    default:
      console.log('Unhandled event type:', response.type);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    socket.emit('chat reply end');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    socket.emit('chat reply', 'Sorry, an error occurred.');
    ws.close();
  });
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected');
  let ws;

  createWebsocketConnection()
    .then((websocket) => {
      ws = websocket;
      listenToWebSocket(ws, socket);
      socket.emit('chat reply', 'Connected to the AI service.');

      socket.on('chat message', async (msg, type = 'text input') => {
        console.log(`Message from user: ${msg}`);
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            await createResponse(ws, type, msg);
          } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('chat reply', 'Sorry, an error occurred while processing your message.');
          }
        } else {
          console.error('WebSocket is not open');
          socket.emit('chat reply', 'Sorry, the AI service is not connected. Please try again later.');
        }
      });
    })
    .catch((error) => {
      console.error('Error creating WebSocket connection:', error);
      socket.emit('chat reply', 'Sorry, an error occurred while connecting to the AI service.');
    });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    if (ws) {
      ws.close();
    }
  });
});


// Start the server
server.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});
