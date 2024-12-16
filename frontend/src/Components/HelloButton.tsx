import React from 'react';
import Button from '@mui/material/Button';
import { helloworld } from '../Services/messageService.ts'
const HelloButton: React.FC = () => {
  
  const handleClick = async () => {
    try {
      const response = await helloworld()
    } catch (error) {
      
    }
  };

  return (
    <Button
      variant="contained"
      color="secondary"
      onClick={handleClick}
      sx={{
        backgroundColor: 'blue',
        '&:hover': {
          backgroundColor: 'blue',
        },
      }}
    >
      HELLO!
    </Button>
  );
};

export default HelloButton;