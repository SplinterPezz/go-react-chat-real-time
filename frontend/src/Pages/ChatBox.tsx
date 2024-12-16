import React, { useEffect, useMemo, useRef } from "react";
import { Chat } from "../Models/models.ts";
import TextsmsIcon from "@mui/icons-material/Textsms";
import { Typography, Avatar, Card, CardContent } from "@mui/material";
import { selectChatById, initChat, addMessages } from "../store/chatSlice.ts";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store.ts";
import { createSelector } from "@reduxjs/toolkit";
import { getMessageChat } from "../Services/messageService.ts";

interface ChatBoxProps {
  chat: Chat | null;
}

const ChatBox: React.FC<ChatBoxProps> = ({ chat }) => {
  const dispatch = useDispatch();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pageRef = useRef<number>(1);
  const isPollingRef = useRef<boolean>(false);
  const targetMessageIdRef = useRef<string | null>(null);

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

  const selectCurrentChat = useMemo(
    () =>
      createSelector([(state: RootState) => state], (state) =>
        chat ? selectChatById(chat.id)(state) : null
      ),
    [chat?.id]
  );

  const currentChat = useSelector(selectCurrentChat);

  // Effect for chat initialization and initial message retrieval
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

  // Effect for message polling
  useEffect(() => {
    if (
      chat &&
      currentChat &&
      chat.last_message &&
      currentChat.messages.length > 0 &&
      !isPollingRef.current &&
      !currentChat.messages.some(message => message.id === chat.last_message_id)
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
              {chat.online_status === true ? (
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
              {/* Display online status */}
              <Typography
                variant="body2"
                sx={{
                  color: "#888",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {chat.online_status === true ? <>Active now</> : <>Offline</>}
              </Typography>
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
