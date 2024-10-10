# Socket.IO Websocket server boilerplate for OpenAI realtime api
Websocket server boilerplate for interacting with a variety of clients, with support for text and audio responses from OPENAI realtime api.

I created this package because directly interacting, and passing headers in the websocket in the web or React native implentations is not straightforward.

-> You should be able to use this with react native, and with web applications.

This uses the socket.io framework to fetch realtime api data from openai, and then pass it back to the application or device.

## Features

- Real-time chat using Socket.IO
- AI-powered responses using OpenAI realtime api
- Text-to-speech functionality for AI responses
- included test web interface (not maintained)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js installed (version 12.x or higher)
- npm (Node Package Manager) installed
- OpenAI API key
## Installation

1. Clone the repository:
   ```
   https://github.com/Mazzz-zzz/OpenAI-Realtime-Server.git
   cd OpenAI-Realtime-Server
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   OPENAI_WS_URL=wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview
   PORT=8383
   AUTH_PASSWORD="set a password for auth here"
   ```

## Usage

1. Start the server:
   ```
   node server.js
   ```

2. Open your web browser and navigate to `http://localhost:8383` (or the port specified in your server configuration).

3. Start chatting with the AI!

## Project Structure

- `public/index.html`: The main HTML file for the chat interface
- `public/script.js`: Client-side JavaScript for handling chat functionality
- `server.js`: Server-side code for Socket.IO and OpenAI integration

## How to use with react native???
Here's my example of how to connect to the server from react native:

```
const newSocket = io('http://<<Ip Goes here>>:8383', {
                    transports: ['websocket'],
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                    auth: {
                        password: '<<password goes here>>'
                      }
                });

```

