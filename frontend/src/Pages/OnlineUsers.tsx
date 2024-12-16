import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Typography, Avatar } from "@mui/material";

import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { User } from "../Models/models.ts";

import { containerVariants, itemVariants, whiteTheme } from "../Utils/utils.ts";

interface UsersProps {
  users: User[];
  selectChat: (chatId: string | null) => void;
}

const OnlineUsers: React.FC<UsersProps> = ({ users, selectChat }) => {
  return (
    <div className="p-0 w-100 h-100 d-flex align-items-center justify-content-center online-person-container">
      <div
        className="online-users-container h-100 w-100"
        style={{ backgroundColor: whiteTheme.palette.background.paper }}
      >
        <div className="online-users-wrapper box-shadow-box h-100">
          <div className="online-users-header p-4">
            <h3 className="online-users-title">Online users</h3>
            {users.length > 0 && (
              <div className="online-count-badge">{users.length}</div>
            )}
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="online-users-list"
          >
            <AnimatePresence>
              {users.map((user) => (
                <motion.div
                  key={user.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  whileTap="tap"
                  exit="hidden"
                  className="online-user-item"
                  onClick={() => selectChat(user.id)}
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
                    <div className="avatar-wrapper">
                      <Avatar
                        alt={user.username}
                        src={user.img || user.username}
                        className="user-avatar"
                        sx={{
                          width: 50,
                          height: 50,
                          marginRight: 2,
                          transition: "none !important",
                          transform: "none !important",
                        }}
                      />
                      <span className="online-status-indicator"></span>
                    </div>

                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: "bold",
                        background:
                          "linear-gradient(45deg,rgb(56, 54, 54),rgb(60, 61, 62))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textAlign: "center",
                      }}
                    >
                      {user.username}
                    </Typography>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {users.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="no-users-message"
            >
              <AccountCircleIcon sx={{ fontSize: "150px" }} />
              <br />
              No users online.
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlineUsers;
