import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Settings,
  Edit,
  Info,
  Logout,
} from "@mui/icons-material";
import logo from "../img/logo.svg";
import { NotificationMessage } from "../Models/models.ts";
import "./header.css";
import { useDispatch, TypedUseSelectorHook, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice.ts';
import { AppDispatch, RootState } from '../store/store.ts';


export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

interface HeaderProps {
  username: string;
  profilePic: string;
  notifications: NotificationMessage[];
}

const Header: React.FC<HeaderProps> = ({
  username,
  profilePic,
  notifications,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    handleCloseMenu();
    dispatch(logout());
    navigate('/login');
  };

  return (
    <AppBar
      sx={{ backgroundColor: "white", boxShadow: "none" }}
      position="static"
      className="header m-0 g-0 p-0 wh-100"
    >
      <Toolbar className="header-toolbar">
        <Box className="logo-container">
          <img src={logo} alt="Logo" className="header-logo" />
        </Box>
        
        <Box className="header-right">
          <div className="avatar-wrapper row align-items-center">
            <div className="col username-label me-1">
              {username}
            </div>
            
            <IconButton
              onClick={handleOpenMenu}
              className="m-0 g-0 p-0"
              size="small"
              aria-controls="account-menu"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              style={{width:50, height:50}}
            >
              <Avatar
                alt={username}
                src={profilePic}
                className="user-avatar col m-0 g-0 p-0"
                sx={{
                  width: 50,
                  height: 50,
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  transition: "none !important",
                  transform: "none !important",
                }}
              />
            </IconButton>
            <div
              className="avatar-triangle"
              style={{ width: 0 }}
            />
          </div>
        </Box>

        <Menu
          id="account-menu"
          anchorEl={menuAnchor}
          open={menuOpen}
          onClose={handleCloseMenu}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleCloseMenu}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Edit Profile" />
          </MenuItem>

          <MenuItem onClick={handleCloseMenu}>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </MenuItem>

          <MenuItem onClick={handleCloseMenu}>
            <ListItemIcon>
              <Info fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Info" />
          </MenuItem>

          <Divider />

          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </MenuItem>
        </Menu>
          
      </Toolbar>
    </AppBar>
  );
};

export default Header;