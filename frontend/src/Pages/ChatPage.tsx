import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store.ts'; // Make sure to import RootState type to access the store

import LogoutButton from "../Components/LogoutButton.tsx";
import HelloButton from "../Components/HelloButton.tsx";

export default function ChatPage() {
  const baseUrl = process.env.REACT_APP_API_URL || '';
  
  // Get token from the Redux store
  const token = useSelector((state: RootState) => state.auth.token);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Check if the token exists before attempting to open the WebSocket connection
    if (token) {
      const socket = new WebSocket(`${baseUrl}/ws?token=${token}`);

      socket.onopen = () => {
        console.log('Connected to WebSocket');
      };

      socket.onmessage = (event) => {
        console.log('Message from server:', event.data);
      };

      socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed');
      };

      // Clean up the WebSocket connection on component unmount
      return () => {
        socket.close();
      };
    } else {
      console.log("No token available for WebSocket connection");
    }
  }, [baseUrl, token]); // Only re-run the effect if baseUrl or token changes

  return (
    <div className="container-fluid vh-100 d-flex flex-column">
      {/* Header */}
      <div className="row flex-glow-1">
        <header className="col-12 bg-dark text-white py-3 text-center">
          <h1>My Page Header</h1>
        </header>
      </div>

      {/* Content */}
      <div className="row flex-grow-1">
        {/* First Column (25%) */}
        <div className="col-2 bg-primary d-flex align-items-center justify-content-center">
          <p className="text-white">Column 1</p>
        </div>

        {/* Second Column (50%) */}
        <div className="col-8 bg-secondary d-flex align-items-center justify-content-center">
          <p className="text-white">Column 2</p>
        </div>

        {/* Third Column (25%) */}
        <div className="col-2 bg-success d-flex align-items-center justify-content-center">
          <p className="text-white">Column 3</p>
        </div>
      </div>
    </div>
  );
}
