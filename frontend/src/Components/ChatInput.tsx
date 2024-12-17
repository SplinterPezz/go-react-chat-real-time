import React, { useState, KeyboardEvent } from 'react';
import { TextField, IconButton, Box } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { SendChatMessage } from '../Models/models.ts';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState<string>('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        backgroundColor: 'white',
        borderTop: '1px solid #e0e0e0',
        width: '100%',
        
        // Add scrollbar styles to the root element
        '& *::-webkit-scrollbar': {
          width: '2px !important',
          height: '2px !important',
        },
        '& *::-webkit-scrollbar-track': {
          background: 'transparent !important',
        },
        '& *::-webkit-scrollbar-thumb': {
          backgroundColor: '#bdbdbd !important',
          borderRadius: '1px !important',
          '&:hover': {
            backgroundColor: '#a1a1a1 !important',
          },
        },
        // Firefox
        '& *': {
          scrollbarWidth: 'thin !important',
          scrollbarColor: '#bdbdbd transparent !important',
        },
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        width: '100%',
        position: 'relative' 
      }}>
        <TextField

          variant="outlined"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{
            
            width: '100%',
            '& .MuiOutlinedInput-root': {
              borderRadius: 0,
              '& fieldset': {
                border: 'none',
              },
            },
            '& .MuiInputBase-root': {
              overflowY: 'auto',
              paddingRight: '56px', // Make space for the button
            },
            // Additional specific styling for the textarea
            '& textarea': {
              '&::-webkit-scrollbar': {
                width: '2px !important',
                height: '2px !important',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent !important',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#bdbdbd !important',
                borderRadius: '1px !important',
              },
              scrollbarWidth: 'thin !important',
              scrollbarColor: '#bdbdbd transparent !important',
            },
          }}
          multiline
          maxRows={8}
        />
        <IconButton 
          onClick={handleSend}
          color="primary"
          sx={{
            height: '56px',
            width: '56px',
            borderRadius: 0,
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default ChatInput;