# Real-Time Chat Application

This is a real-time chat application where users can send and receive messages instantly. The application uses **Go** for the backend with a **RESTful API**, **React** with **TypeScript** for the frontend, and **MongoDB** for storing messages. Real-time message updates are handled using **WebSockets** for efficient communication.

## Features

- **Real-time messaging**: Messages are delivered and displayed instantly to all connected users.
- **RESTful API**: For adding, retrieving, and managing messages.
- **MongoDB**: To store messages persistently.
- **WebSocket support**: For real-time communication between the client and the server.
- **Parallel processing**: Backend operations such as handling requests and message persistence are executed concurrently for improved efficiency.

## Tech Stack

- **Backend**: Go (Golang), Gorilla WebSocket, Gin framework
- **Frontend**: React, TypeScript, CSS
- **Database**: MongoDB
- **Tools**: WebSockets, Axios (for HTTP requests), Docker (optional for containerization)

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Go** (v1.16+)
- **Node.js** (v14+)
- **MongoDB** (locally or via a cloud service like MongoDB Atlas)
- **Git** for version control

## Getting Started

### Backend Setup (Go)

1. Clone the repository:
   ```bash
   git clone https://github.com/SplinterPezz/go-react-chat-real-time.git
   cd go-react-chat-real-time/backend
   ```

2. Install dependencies:
   ```bash
   go mod tidy
   ```

3. Set up MongoDB:
   - If you're using **MongoDB Atlas**, get your connection string and replace the placeholder in the code.
   - For local MongoDB, ensure it's running on `localhost:27017`.

4. Run the backend:
   ```bash
   go run main.go
   ```
   The backend will start running on `http://localhost:8080`.

### Frontend Setup (React)

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```
   The frontend will be accessible at `http://localhost:3000`.

## Endpoints

- **POST /messages**: Send a new message. (Body: `{ "user": "username", "message": "text" }`)
- **GET /messages**: Retrieve all messages from the database.
- **WebSocket** (`/ws`): Connect to the WebSocket for real-time messaging.

## How it Works

- **WebSockets**: When the user connects to the WebSocket endpoint (`/ws`), they can send and receive messages instantly.
- **REST API**: You can retrieve all messages or add new ones through the API.
- **MongoDB**: Messages are stored in MongoDB, ensuring they persist even when the server restarts.

## Testing

1. Test the WebSocket by connecting with any WebSocket client (e.g., Postman or directly through the frontend).
2. Use **Postman** or **cURL** to test the RESTful API for adding and fetching messages.

## Future Improvements

- **User Authentication**: Add JWT-based authentication to allow users to register and log in.
- **Message Persistence**: Implement message editing and deleting functionality.
- **Notification System**: Add notifications for new messages.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```

### Contribution

Feel free to fork this repository, make improvements, or open issues if you encounter any bugs. Contributions are always welcome!
