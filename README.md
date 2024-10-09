# Socket.IO Websocket server boilerplate for OPENAI realtime api

This project is a real-time chat application that uses Socket.IO for communication and integrates with the new realtime OpenAI API for AI-powered responses automatic responses. It features both text and audio responses from the AI.

I created this package because directly interacting, and passing headers in the websocket in the web or React native implentations is not straightforward.

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
   git clone https://github.com/yourusername/socket-io-chat-openai.git
   cd socket-io-chat-openai
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

