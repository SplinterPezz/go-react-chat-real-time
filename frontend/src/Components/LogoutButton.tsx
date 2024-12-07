import React from 'react';
import Button from '@mui/material/Button';
import { useDispatch } from 'react-redux';
import { logout } from '../store/authSlice.ts';
import { useNavigate } from 'react-router-dom';

const LogoutButton: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Button
      variant="contained"
      color="secondary"
      onClick={handleLogout}
      sx={{
        backgroundColor: 'red',
        '&:hover': {
          backgroundColor: 'darkred',
        },
      }}
    >
      Logout
    </Button>
  );
};

export default LogoutButton;