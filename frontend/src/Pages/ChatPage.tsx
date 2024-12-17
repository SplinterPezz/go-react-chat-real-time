import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store/store.ts";
import OnlineUsers from "./OnlineUsers.tsx";
import "./chat.css";
import Header from "./Header.tsx";
import ChatBox from "./ChatBox.tsx";
import { getChats, getChatById } from "../Services/messageService.ts";
import {
  ConnectMessage,
  DisconnectMessage,
  ChatMessage,
  User,
  Chat,
  NotificationMessage,
} from "../Models/models.ts";
import UsersChat from "./UsersChat.tsx";
import Spinner from "../Components/Spinner.tsx";
import { useDispatch, useSelector } from "react-redux";
import { addMessages } from "../store/messagesSlice.ts";
import { setOnlineUsers } from "../store/onlineUsersSlice.ts";
import { selectAllChats, addChat, updateChat, setChats } from "../store/chatSlice.ts";

export type WebSocketMessage = ConnectMessage | DisconnectMessage | ChatMessage;

export default function ChatPage() {
  const dispatch = useDispatch();
  const socketRef = useRef<WebSocket | null>(null);
  const initializeRef = useRef(false);

  const selectAuth = useMemo(
    () =>
      createSelector([(state: RootState) => state.auth], (auth) => ({
        token: auth.token,
        userId: auth.id,
        username: auth.user,
        profilePic: auth.user,
      })),
    []
  );

  const selectMemoizedChats = useMemo(
    () => createSelector(
      [(state: RootState) => state.chat.chats],
      (chats) => [...chats].sort((a, b) => {
        const dateA = new Date(a.last_message_at || 0).getTime();
        const dateB = new Date(b.last_message_at || 0).getTime();
        return dateB - dateA;
      })
    ),
    []
  );
  
  const memoizedChats = useSelector(selectMemoizedChats);
  const { token, userId, username, profilePic } = useSelector(selectAuth);

  const [loadingStates, setLoadingStates] = useState({
    chatsLoaded: false,
    usersLoaded: false,
    socketConnected: false,
  });

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateUserChatWithFetch = useCallback(
    async (chatId: string) => {
      if (memoizedChats.some((chat) => chat.id === chatId)) {
        return;
      }

      const newChat = await getChatById(chatId);
      if ("users" in newChat) {
        dispatch(addChat(newChat));
      } else {
        console.error("Failed to fetch chat:", newChat.error);
      }
    },
    [dispatch, memoizedChats]
  );

  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === "connect" || message.type === "disconnect") {
          dispatch(setOnlineUsers({
            users: message.online_users,
            currentUserId: userId ?? ''
          }));
        } else if (message.type === "message") {
          dispatch(addMessages({
            chatId: message.chat_id,
            messages: [message],
          }));
          
          const chatExists = memoizedChats.some(
            chat => chat.id === message.chat_id
          );

          if (chatExists) {
            dispatch(updateChat({
              chatId: message.chat_id,
              message: message
            }));
          } else {
            updateUserChatWithFetch(message.chat_id);
          }
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    },
    [dispatch, userId, memoizedChats, updateUserChatWithFetch]
  );

  useEffect(() => {
    // Don't return early if already initialized - allow reconnection attempts
    if (!token) return;
  
    let isComponentMounted = true;
  
    const initialize = async () => {
      try {
        console.log('Fetching chats...'); 
        const userChatsResponse = await getChats();
  
        if (!isComponentMounted) return;
  
        if (Array.isArray(userChatsResponse)) {
          console.log('Chats fetched successfully');
          dispatch(setChats(userChatsResponse));
          setLoadingStates((prev) => ({ ...prev, chatsLoaded: true }));
  
          // Close existing socket if any
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.close();
          }
  
          // Create new socket
          socketRef.current = new WebSocket(
            `${process.env.REACT_APP_API_URL}/ws?token=${token}`
          );
  
          socketRef.current.onopen = () => {
            if (isComponentMounted) {
              console.log('WebSocket connected');
              setLoadingStates(prev => ({
                ...prev,
                socketConnected: true,
                usersLoaded: true
              }));
            }
          };
  
          socketRef.current.onmessage = handleWebSocketMessage;
  
          socketRef.current.onerror = (error) => {
            console.error("WebSocket Error:", error);
            if (isComponentMounted) {
              setError("WebSocket connection error");
              setLoadingStates(prev => ({ ...prev, socketConnected: false }));
            }
          };
  
          socketRef.current.onclose = () => {
            if (isComponentMounted) {
              console.log('WebSocket disconnected');
              setLoadingStates(prev => ({ ...prev, socketConnected: false }));
              // Attempt to reconnect
              setTimeout(initialize, 3000);
            }
          };
  
        } else {
          if (isComponentMounted) {
            console.error('Failed to fetch chats');
            setError("Failed to fetch chats");
            setLoadingStates(prev => ({ ...prev, socketConnected: false }));
            throw new Error("Failed to fetch chats");
          }
        }
  
      } catch (error) {
        if (isComponentMounted) {
          console.error("Initialization error:", error);
          setError(
            error instanceof Error
              ? error.message
              : "An unexpected error occurred"
          );
          setLoadingStates(prev => ({ ...prev, socketConnected: false }));
        }
      }
    };
  
    initialize();
  
    return () => {
      console.log('Component cleanup initiated');
      isComponentMounted = false;
      
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [token, dispatch]);

  const memoizedSelectedChat = useMemo(() => {
    if (!selectedChatId) return null;
    const selectedChat = memoizedChats.find(
      (chat) => chat.id === selectedChatId
    );
    return selectedChat || null;
  }, [selectedChatId, memoizedChats]);

  const handleSelectChat = useCallback((id: string | null, type: 'user' | 'chat') => {
    if (!id) {
      setSelectedChatId(null);
      return;
    }

    const chat = type === 'user' 
      ? memoizedChats.find(chat => chat.users.includes(id))
      : memoizedChats.find(chat => chat.id === id);

    setSelectedChatId(chat?.id || null);
  }, [memoizedChats]);

  if (!loadingStates.socketConnected || !loadingStates.chatsLoaded) {
    return <Spinner />;
  }

  // Notifications (consider moving to a more dynamic source)
  const notifications: NotificationMessage[] = [
    { type: "notification", message: "New message received!" },
    { type: "notification", message: "Your profile has been updated." },
  ];

  return (
    <>
      {!loadingStates.socketConnected || !loadingStates.chatsLoaded ? (
        <Spinner />
      ) : (
        <div className="container-fluid">
          <div className="row d-flex">
            <div
              style={{ flex: "0 0 360px" }}
              className="g-0 p-0 d-none d-md-block"
            >
              <UsersChat
                chats={memoizedChats}
                selectChat={(chatId) => handleSelectChat(chatId, 'chat')}
              />
            </div>
            <div className="flex-grow-1 g-0 p-0" style={{ flex: 0 }}>
              <div className="container-fluid vh-100 d-flex flex-column g-0 p-0">
                <Header
                  username={username || "user"}
                  profilePic={profilePic || "user"}
                  notifications={notifications}
                />
                <div className="row flex-grow-1 w-100 wh-100 g-0 p-0">
                  <ChatBox chat={memoizedSelectedChat} />
                </div>
              </div>
            </div>
            <div
              style={{ flex: "0 0 360px" }}
              className="g-0 p-0 d-none d-xl-block"
            >
              {loadingStates.usersLoaded && (
                <OnlineUsers
                  selectChat={(userId) => handleSelectChat(userId, 'user')}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
