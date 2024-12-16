import React from "react";
import { Chat } from "../Models/models";
import CommentsDisabledIcon from "@mui/icons-material/CommentsDisabled";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, Typography, Avatar } from "@mui/material";
import { containerVariants, itemVariants } from "../Utils/utils.ts";

interface ChatBoxProps {
  chats: Chat[];
  selectChat: (chatId: string | null) => void;
}

function formatChatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.setDate(now.getDate() - 1)).toDateString() ===
    date.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); // Format: hh:mm
  } else if (isYesterday) {
    return "yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  }
}

const UsersChat: React.FC<ChatBoxProps> = ({ chats, selectChat }) => {

  return (
    <div className=" p-0 w-100 h-100 d-flex align-items-center justify-content-center online-person-container">
      <div className="online-users-container h-100 w-100">
        <div className="online-users-wrapper box-shadow-box h-100">
          <div className="online-users-header p-4">
            <h3 className="online-users-title">Chats</h3>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="online-users-list"
          >
            <AnimatePresence>
              {chats.map((chat) => (
                <motion.div
                  key={chat.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  whileTap="tap"
                  exit="hidden"
                  className="online-user-item"
                  onClick={() => selectChat(chat.id)}
                >
                  <Card
                    className="user-hover-effect"
                    sx={{
                      boxShadow: "none",
                      display: "flex",
                      alignItems: "center",
                      padding: 1,
                      width: "100%",
                      color: "none",
                      borderRadius: "0px",
                      transition: "all 0.3s ease",
                    }}
                  >
                    { chat && (
                      <>
                        <div className="avatar-wrapper">
                          <Avatar
                            alt={chat.user_data?.username}
                            src={
                              chat.user_data?.img ||
                              chat.user_data?.username
                            }
                            className="user-avatar"
                            sx={{
                              width: 50,
                              height: 50,
                              marginRight: 2,
                              transition: "none !important",
                              transform: "none !important",
                            }}
                          />
                          {chat.online_status === true ? <span className="online-status-indicator"/> : <span className="offline-status-indicator"/>}
                        </div>

                        <CardContent sx={{ padding: 0, width: "100%" }} className="p-0 m-0 g-0">
                        <div 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center' 
                            }}
                          >
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: "bold",
                                background: "linear-gradient(45deg,rgb(56, 54, 54),rgb(60, 61, 62))",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                              }}
                            >
                              {chat.user_data?.username || "Deleted User" }
                            </Typography>

                            <Typography 
                              variant="caption" 
                              sx={{ color: "#aaa" }}
                            >
                              { formatChatDate(chat.last_message_at ? chat.last_message_at : 'yesterday') }
                            </Typography>
                          </div>
                          {/* Display last message */}
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: "230px",
                              color: "#888",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            { 
                              chat.last_message &&
                              chat.last_message
                            }
                          </Typography>

                          
                        </CardContent>
                      </>
                    )}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {chats.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="no-users-message"
            >
              <CommentsDisabledIcon sx={{ fontSize: "150px" }} />
              <br />
              No saved chats.
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
export default UsersChat;
