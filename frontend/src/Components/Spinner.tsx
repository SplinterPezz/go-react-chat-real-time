import React from 'react';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Container, 
  Stack 
} from '@mui/material';

interface SpinnerProps {
  message?: string;
  size?: number;
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

const Spinner: React.FC<SpinnerProps> = ({ 
  message = 'Loading...', 
  size = 60, 
  color = 'primary' 
}) => {
  return (
    <Container 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center'
      }}
    >
      <Stack 
        spacing={2} 
        alignItems="center" 
        justifyContent="center"
      >
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress 
            variant="indeterminate" 
            size={size} 
            color={color}
          />
        </Box>
        <Typography 
          variant="h6" 
          color="textSecondary"
        >
          {message}
        </Typography>
      </Stack>
    </Container>
  );
};

export default Spinner;