import React, { useEffect, useMemo, useRef } from "react";
import { Chat, ChatMessage } from "../Models/models.ts";
import TextsmsIcon from "@mui/icons-material/Textsms";
import { Typography, Avatar, Card, CardContent } from "@mui/material";
import { selectChatById, initChat, addMessages } from "../store/messagesSlice.ts";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store.ts";
import { createSelector } from "@reduxjs/toolkit";
import { getMessageChat } from "../Services/messageService.ts";
import { selectAllOnlineUsers } from "../store/onlineUsersSlice.ts";

interface ChatBoxProps {
  chat: Chat | null;
}

const ChatBox: React.FC<ChatBoxProps> = ({ chat }) => {
  const dispatch = useDispatch();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pageRef = useRef<number>(1);
  const isPollingRef = useRef<boolean>(false);
  const targetMessageIdRef = useRef<string | null>(null);
  const users = useSelector(selectAllOnlineUsers);
  const username = useSelector((state: RootState) => state.auth.user);
  const userOnlineStatus = chat?.users.some(userId => users.some(onlineUser => onlineUser.id === userId));

  const selectCurrentChat = useMemo(
    () =>
      createSelector(
        [(state: RootState) => state],
        (state) => chat?.id ? selectChatById(chat.id)({ chat: state.message }) : null
      ),
    [chat?.id]
  );

  const currentChat = useSelector(selectCurrentChat);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const retriveMessage = async (chatId: string, page: number) => {
    try {
      const response = await getMessageChat(chatId, page);
      
      if ("error" in response) {
        console.error("Cannot get Chat Message", response.error);
        return null;
      }
      
      if ("total_pages" in response && response.messages.length > 0) {
        dispatch(addMessages({
          chatId: chatId,
          messages: response.messages
        }));
        return response.messages;
      }
      
      console.log("No messages or empty response");
      return null;
    } catch (error) {
      console.error("Cannot get Chat Message", error);
      return null;
    }
  };

  // Effect for chat initialization and initial message retrieval
  // In case of empty store, retrive the last N messages 
  useEffect(() => {
    if (chat && !currentChat) {
      dispatch(initChat({ chatId: chat.id }));
    }

    if (
      chat &&
      currentChat &&
      chat.last_message &&
      currentChat.messages.length === 0
    ) {
      console.log("Initial message retrieval");
      retriveMessage(chat.id, 1);
    }
  }, [chat?.id, currentChat?.messages.length]);

  // Effect for message polling in case of chat.last_message is not on store
  // In case the chat is in the store but last message is not in the store.
  useEffect(() => {
    console.log("CAN POLLING?")
    if (
      chat &&
      currentChat &&
      chat.last_message &&
      currentChat.messages.length > 0 &&
      !isPollingRef.current &&
      currentChat.lastMessageId !== chat.last_message_id
      //!currentChat.messages.some(message => message.id === chat.last_message_id)
    ) {
      console.log("Starting message polling");
      isPollingRef.current = true;
      pageRef.current = 1;
      targetMessageIdRef.current = currentChat.lastMessageId;

      const checkMessages = async () => {
        try {
          console.log("Requesting page:", pageRef.current);
          const messages = await retriveMessage(chat.id, pageRef.current);

          if (!messages) {
            console.log("Stopping poll - No messages or error");
            if (pollingRef.current) clearInterval(pollingRef.current);
            isPollingRef.current = false;
            return;
          }

          const foundMessage = messages.some(msg => msg.id === targetMessageIdRef.current);

          if (foundMessage) {
            console.log("Found target message, stopping poll");
            if (pollingRef.current) clearInterval(pollingRef.current);
            isPollingRef.current = false;
            return;
          }

          pageRef.current++;

        } catch (error) {
          console.error("Poll iteration failed:", error);
          if (pollingRef.current) clearInterval(pollingRef.current);
          isPollingRef.current = false;
        }
      };

      checkMessages();
      pollingRef.current = setInterval(checkMessages, 1000);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        isPollingRef.current = false;
        pageRef.current = 1;
      };
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      isPollingRef.current = false;
      pageRef.current = 1;
    };
  }, [chat?.id]);

  const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isCurrentUser = chat?.user_data?.id === message.sender;
    
    return (
      <div className={`d-flex ${isCurrentUser ? 'justify-content-end' : 'justify-content-start'} mb-3`}>
        <div style={{ maxWidth: '70%' }}>
          <div
            style={{
              backgroundColor: isCurrentUser ? '#DCF8C6' : '#E3F2FD',
              borderRadius: '15px',
              padding: '10px 15px',
              position: 'relative',
              marginLeft: isCurrentUser ? '0' : '8px',
              marginRight: isCurrentUser ? '8px' : '0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 'bold',
                  color: isCurrentUser ? '#2E7D32' : '#1565C0'
                }}
              >
                {isCurrentUser ? username : chat?.user_data?.username || 'Deleted User'}
              </Typography>
            </div>
            <Typography
              variant="body1"
              sx={{
                wordBreak: 'break-word',
                color: '#262626'
              }}
            >
              {message.content}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#666',
                display: 'block',
                textAlign: 'right',
                marginTop: '4px',
                fontSize: '0.7rem'
              }}
            >
              {formatTimestamp(message.sent_at)}
            </Typography>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="col bg-white">
      {chat && (
        <div className="mt-3 p-3">
          <Card
            style={{ padding: "1rem" }}
            sx={{
              boxShadow: "none",
              display: "flex",
              alignItems: "center",
              width: "100%",
              color: "none",
              borderRadius: "0px",
              transition: "all 0.3s ease",
            }}
          >
            <div className="avatar-wrapper">
              <Avatar
                alt={chat.user_data?.username}
                src={chat.user_data?.img || chat.user_data?.username}
                className="user-avatar"
                sx={{
                  width: 75,
                  height: 75,
                  marginRight: 2,
                  transition: "none !important",
                  transform: "none !important",
                }}
              />
              {userOnlineStatus === true ? (
                <span
                  className="online-status-indicator"
                  style={{ left: "50px", width: "16px", height: "16px" }}
                />
              ) : (
                <span
                  className="offline-status-indicator"
                  style={{ left: "50px", width: "16px", height: "16px" }}
                />
              )}
            </div>

            <CardContent
              sx={{ padding: 0, width: "100%" }}
              className="p-0 m-0 g-0"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: "1.8rem",
                    fontWeight: "bold",
                    background:
                      "linear-gradient(45deg,rgb(56, 54, 54),rgb(60, 61, 62))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {chat.user_data?.username || "Deleted User"}
                </Typography>
              </div>
              <Typography
                variant="body2"
                sx={{
                  color: "#888",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {userOnlineStatus === true ? <>Active now</> : <>Offline</>}
              </Typography>
            </CardContent>
          </Card>
          
          <Card
            sx={{
              boxShadow: "none",
              width: "100%",
              borderRadius: "0px",
              transition: "all 0.3s ease",
              maxHeight: "calc(100vh - 300px)",
              overflowY: "auto"
            }}
          >
            <CardContent
              sx={{ 
                padding: "1rem !important",
                "&:last-child": { paddingBottom: "1rem !important" }
              }}
            >
              {currentChat && currentChat.messages.length > 0 && (
                <div className="messages-container">
                  {currentChat.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {!chat && (
        <div className="h-100 d-flex flex-column align-items-center justify-content-center">
          <TextsmsIcon className="" style={{ fontSize: "13rem" }} />
          <br />
          <p className="no-users-message">Click on a chat to show messages.</p>
        </div>
      )}
    </div>
  );
};
export default ChatBox;
