import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { addMessages } from "../store/chatSlice.ts";

export type WebSocketMessage = ConnectMessage | DisconnectMessage | ChatMessage;

export default function ChatPage() {
  const dispatch = useDispatch();
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

  const { token, userId, username, profilePic } = useSelector(selectAuth);

  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [userChats, setUserChats] = useState<Chat[]>([]);
  const [loadingStates, setLoadingStates] = useState({
    chatsLoaded: false,
    usersLoaded: false,
    socketConnected: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateChatOnlineStatus = useCallback(
    (onlineUserIds: string[]) => {
      setUserChats((prevChats) =>
        prevChats.map((chat) => ({
          ...chat,
          online_status: chat.users
            .filter((userIdInChat) => userIdInChat !== userId)
            .some((userIdInChat) => onlineUserIds.includes(userIdInChat)),
        }))
      );
    },
    [userId]
  );

  const updateUserChatWithFetch = useCallback(
    async (chatId: string) => {

      if (userChats.some((chat) => chat.id === chatId)) {
        return;
      }

      const newChat = await getChatById(chatId);
      if ("users" in newChat) {
        const onlineUserIds = onlineUsers.map((user) => user.id);

        setUserChats((prevChats) => {
          // Double-check to prevent race conditions
          if (prevChats.some((chat) => chat.id === chatId)) {
            return prevChats; // Return unchanged if chat was added
          }

          const chatWithOnlineStatus = {
            ...newChat,
            online_status: newChat.users
              .filter((userIdInChat) => userIdInChat !== userId)
              .some((userIdInChat) => onlineUserIds.includes(userIdInChat)),
          };

          return [...prevChats, chatWithOnlineStatus];
        });
      } else {
        console.error("Failed to fetch chat:", newChat.error);
      }
    },
    [onlineUsers, userId, userChats]
  );

  // Memoized update function for online users
  const updateOnlineUsers = useCallback((incomingUsers: User[]) => {
    setOnlineUsers((prevUsers) => {
      // Identify new users
      const newUsers = incomingUsers.filter(
        (incoming) => !prevUsers.some((existing) => existing.id === incoming.id)
      );

      // Identify users to remove
      const usersToRemove = prevUsers.filter(
        (existing) =>
          !incomingUsers.some((incoming) => incoming.id === existing.id)
      );

      // Combine existing users with new users, removing those no longer online
      const updatedUsers = [
        ...prevUsers.filter(
          (user) =>
            !usersToRemove.some((removeUser) => removeUser.id === user.id)
        ),
        ...newUsers,
      ];

      const onlineUserIds = updatedUsers.map((user) => user.id);
      updateChatOnlineStatus(onlineUserIds);

      return updatedUsers;
    });
    setLoadingStates((prev) => ({ ...prev, usersLoaded: true }));
  }, []);

  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === "connect" || message.type === "disconnect") {
          updateOnlineUsers(message.online_users);
        } else if (message.type === "message") {
          console.log("Adding message to state");
          dispatch(
            addMessages({
              chatId: message.chat_id,
              messages: [message],
            })
          );

          setUserChats((prevChats) => {
            const chatExists = prevChats.some(
              (chat) => chat.id === message.chat_id
            );
            console.log("Chat exist :")
            console.log(chatExists)

            if (chatExists) {
              console.log("Updating existing chat")
              return prevChats.map((chat) => {
                if (chat.id === message.chat_id) {
                  console.log(chat)
                  return {
                    ...chat,
                    last_message: message.content,
                    last_message_at: message.sent_at,
                    last_message_by: message.sender,
                    last_message_id: message.id,

                  };
                }
                return chat;
              });
            } else {
              console.log("Fetch from DB")
              updateUserChatWithFetch(message.chat_id);
              return prevChats;
            }
          });
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    },
    [updateOnlineUsers, dispatch]
  );

  useEffect(() => {
    let socket: WebSocket | null = null;

    const initialize = async () => {
      try {
        const userChatsResponse = await getChats();
        if (Array.isArray(userChatsResponse)) {
          setUserChats(userChatsResponse);
          setLoadingStates((prev) => ({ ...prev, chatsLoaded: true }));
        } else {
          setError("Failed to fetch chats");
          throw new Error(userChatsResponse.error || "Failed to fetch chats");
        }

        if (!token) {
          setError("No authentication token available");
          throw new Error("No authentication token available");
        }

        socket = new WebSocket(
          `${process.env.REACT_APP_API_URL}/ws?token=${token}`
        );

        socket.onopen = () => {
          setLoadingStates((prev) => ({ ...prev, socketConnected: true }));
        };

        socket.onmessage = handleWebSocketMessage;

        socket.onerror = (error) => {
          console.error("WebSocket Error:", error);
          setError(
            error instanceof Error
              ? error.message
              : "WebSocket connection error"
          );
        };

        socket.onclose = () => {
          setLoadingStates((prev) => ({ ...prev, socketConnected: false }));
        };
      } catch (error) {
        console.error("Initialization error:", error);
        setError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        );
      }
    };

    initialize();

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [handleWebSocketMessage]);

  const memoizedUsers = useMemo(
    () => onlineUsers.filter((user) => user.id !== userId),
    [onlineUsers, userId]
  );

  const memoizedChats = useMemo(() => {
    return [...userChats].sort((a, b) => {
      const dateA = new Date(a.last_message_at || 0).getTime();
      const dateB = new Date(b.last_message_at || 0).getTime();
      return dateB - dateA;
    });
  }, [userChats]);

  const memoizedSelectedChat = useMemo(() => {
    if (!selectedChatId) return null;
    const selectedChat = memoizedChats.find(
      (chat) => chat.id === selectedChatId
    );
    return selectedChat || null;
  }, [selectedChatId, memoizedChats]);

  const handleSelectChatFromUsers = useCallback(
    (userId: string | null) => {
      if (!userId) {
        setSelectedChatId(null);
        return;
      }

      const existingChat = memoizedChats.find((chat) =>
        chat.users.includes(userId)
      );

      if (existingChat) {
        setSelectedChatId(existingChat.id);
      } else {
        setSelectedChatId(null);
        console.log("No existing chat found with this user");
      }
    },
    [memoizedChats]
  );

  const handleSelectChatFromChats = useCallback(
    (chatId: string | null) => {
      if (!chatId) {
        setSelectedChatId(null);
        return;
      }

      const existingChat = memoizedChats.find((chat) => chat.id === chatId);

      if (existingChat) {
        setSelectedChatId(existingChat.id);
      } else {
        //this should not happen
        setSelectedChatId(null);
      }
    },
    [memoizedChats]
  );

  // Notifications (consider moving to a more dynamic source)
  const notifications: NotificationMessage[] = [
    { type: "notification", message: "New message received!" },
    { type: "notification", message: "Your profile has been updated." },
  ];

  return (
    <>
      {!loadingStates.socketConnected ? (
        <Spinner />
      ) : (
        <div className="container-fluid">
          <div className="row d-flex">
            <div
              style={{ flex: "0 0 360px" }}
              className="g-0 p-0 d-none d-md-block"
            >
              {
                loadingStates.chatsLoaded &&
                <UsersChat
                  chats={memoizedChats}
                  selectChat={handleSelectChatFromChats}
                />
              }
              
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
              {
                loadingStates.usersLoaded &&
                <OnlineUsers
                  users={memoizedUsers}
                  selectChat={handleSelectChatFromUsers}
                />
              }

              
            </div>
          </div>
        </div>
      )}
    </>
  );
}
