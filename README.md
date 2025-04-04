# Voice to Text Application

A simple application that converts speech to text using the Web Speech API and sends the text to a FastAPI backend via WebSocket.

## Project Structure

- `backend/`: Contains the FastAPI server
- `frontend/`: Contains the HTML/JavaScript client

## Setup and Running

### Backend

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create and activate a virtual environment:
   ```
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run the server:
   ```
   uvicorn main:app --reload
   ```

The server will start at http://localhost:8000

### Frontend

1. Open the `frontend/index.html` file in a web browser.

2. Allow microphone access when prompted.

3. Start speaking, and your speech will be converted to text and sent to the backend.

## Features

- Real-time speech recognition
- WebSocket communication between frontend and backend
- Automatic reconnection if the connection is lost
- Visual feedback on connection status

## Requirements

- Python 3.7+
- Modern web browser with Web Speech API support (Chrome, Edge, etc.)
- Microphone access 