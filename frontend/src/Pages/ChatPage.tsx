import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef
} from "react";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store/store.ts";
import OnlineUsers from "./OnlineUsers.tsx";
import "./chat.css";
import Header from "./Header.tsx";
import ChatBox from "./ChatBox.tsx";
import {
  getChats,
  getChatById,
  createChat,
} from "../Services/messageService.ts";
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
import {
  selectAllChats,
  addChat,
  updateChat,
  setChats,
} from "../store/chatSlice.ts";
import ChatInput from "../Components/ChatInput.tsx";
import { SendChatMessage, CreateChatRequest } from "../Models/models.ts";
export type WebSocketMessage = ConnectMessage | DisconnectMessage | ChatMessage;

const selectChatMessagesStore = createSelector(
  [(state: RootState) => state.chat.chats],
  (chats) => [...chats].sort((a, b) => {
    const dateA = new Date(a.last_message_at || 0).getTime();
    const dateB = new Date(b.last_message_at || 0).getTime();
    return dateB - dateA;
  })
);

export default function ChatPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    chatsLoaded: false,
    usersLoaded: false,
    socketConnected: false,
  });

  const dispatch = useDispatch();
  const socketRef = useRef<WebSocket | null>(null);
  const memoizedChats = useSelector(selectChatMessagesStore);
  const memoizedChatsRef = useRef(memoizedChats);
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = useSelector((state: RootState) => state.auth.id);
  const username = useSelector((state: RootState) => state.auth.user);
  const profilePic = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    memoizedChatsRef.current = memoizedChats;
  }, [memoizedChats]);

  const memoizedSelectedChat = useMemo(() => {
    if (!selectedChatId) return null;
    const selectedChat = memoizedChats.find(
      (chat) => chat.id === selectedChatId
    );
    return selectedChat || null;
  }, [selectedChatId, memoizedChats]);

  const getChatByIdAndDispatch = useCallback(async (chatId: string) => {
    if (memoizedChatsRef.current.some(chat => chat.id === chatId)) return;

    try {
      console.log("Dispatching chat by id from update from fetch");
      const newChat = await getChatById(chatId);
      if ("users" in newChat) {
        dispatch(addChat(newChat));
      } else {
        console.error("Failed to fetch chat:", newChat.error);
      }
    } catch (error) {
      console.error("Error fetching chat:", error);
    }
  }, [dispatch]);

  const createChatByUserIdAndDispatch = useCallback(
    async (userId: string) => {
      const payloadCreateChat: CreateChatRequest = {
        user_id: userId,
      };
      try {
        console.log("Dispatching create Chat by user id");
        const newChat = await createChat(payloadCreateChat);
        if ("users" in newChat) {
          dispatch(addChat(newChat));
          setSelectedChatId(newChat.id);
        } else {
          console.error("Failed to fetch chat:", newChat.error);
        }
      } catch (error) {
        console.error("Error fetching chat:", error);
      }
    },
    [dispatch, memoizedChats]
  );

  const handleMessageUpdate = useCallback((message: ChatMessage) => {
    dispatch(addMessages({ chatId: message.chat_id, messages: [message] }));

    const chatExists = memoizedChatsRef.current.some(chat => chat.id === message.chat_id);
    if (chatExists) {
      dispatch(updateChat({ chatId: message.chat_id, message }));
    } else {
      getChatByIdAndDispatch(message.chat_id);
    }
  }, [dispatch, getChatByIdAndDispatch]);
  

  const handleSendMessage = (message: string) => {
    if (
      message &&
      memoizedSelectedChat &&
      memoizedSelectedChat.id &&
      memoizedSelectedChat.user_data
    ) {
      const messageModel: SendChatMessage = {
        chat_id: memoizedSelectedChat.id,
        content: message,
      };
      // Check if WebSocket is connected
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        try {
          // Send the message as JSON string
          socketRef.current.send(JSON.stringify(messageModel));
        } catch (error) {
          console.error("Error sending message:", error);
          setError("Failed to send message");
        }
      } else {
        console.error("WebSocket is not connected");
        setError("Connection lost. Please refresh the page.");
      }
    }
  };

  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === "connect" || message.type === "disconnect") {
          dispatch(
            setOnlineUsers({
              users: message.online_users,
              currentUserId: userId ?? "",
            })
          );
        } else if (message.type === "message") {
          handleMessageUpdate(message);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    },
    [dispatch, userId, handleMessageUpdate]
  );

  

  useEffect(() => {
    // Don't return early if already initialized - allow reconnection attempts
    if (!token) return;

    let isComponentMounted = true;

    const initialize = async () => {
      try {
        console.log("Fetching chats...");
        const userChatsResponse = await getChats();

        if (!isComponentMounted) return;

        if (Array.isArray(userChatsResponse)) {
          console.log("Chats fetched successfully");
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
              console.log("WebSocket connected");
              setLoadingStates((prev) => ({
                ...prev,
                socketConnected: true,
                usersLoaded: true,
              }));
            }
          };

          socketRef.current.onmessage = handleWebSocketMessage;

          socketRef.current.onerror = (error) => {
            console.error("WebSocket Error:", error);
            if (isComponentMounted) {
              setError("WebSocket connection error");
              setLoadingStates((prev) => ({ ...prev, socketConnected: false }));
            }
          };

          socketRef.current.onclose = () => {
            if (isComponentMounted) {
              console.log("WebSocket disconnected");
              setLoadingStates((prev) => ({ ...prev, socketConnected: false }));
              // Attempt to reconnect
              setTimeout(initialize, 3000);
            }
          };
        } else {
          if (isComponentMounted) {
            console.error("Failed to fetch chats");
            setError("Failed to fetch chats");
            setLoadingStates((prev) => ({ ...prev, socketConnected: false }));
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
          setLoadingStates((prev) => ({ ...prev, socketConnected: false }));
        }
      }
    };

    initialize();

    return () => {
      console.log("Component cleanup initiated");
      isComponentMounted = false;

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [token, dispatch]);

  const handleSelectChat = useCallback(
    (id: string | null, type: "user" | "chat") => {
      if (!id) {
        setSelectedChatId(null);
        return;
      }

      const chat =
        type === "user"
          ? memoizedChatsRef.current.find((chat) => chat.users.includes(id))
          : memoizedChatsRef.current.find((chat) => chat.id === id);
      if (type === "user" && !chat) {
        createChatByUserIdAndDispatch(id);
      }
      setSelectedChatId(chat?.id || null);
    },
    []
  );

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
                selectChat={(chatId) => handleSelectChat(chatId, "chat")}
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

                {memoizedSelectedChat && (
                  <>
                    <div className="">
                      {/* ... (previous chat header code) */}
                    </div>
                    <ChatInput onSendMessage={handleSendMessage} />
                  </>
                )}
              </div>
            </div>
            <div
              style={{ flex: "0 0 360px" }}
              className="g-0 p-0 d-none d-xl-block"
            >
              {loadingStates.usersLoaded && (
                <OnlineUsers
                  selectChat={(userId) => handleSelectChat(userId, "user")}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
