import React from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';

const Login = () => {
  const handleGoogleLogin = () => {
    try {
      // Use the deployed URL in production, fallback to localhost in development
      const backendUrl = process.env.NODE_ENV === 'production'
        ? 'https://arly-adopter-agent-avisanghavi.vercel.app'
        : 'http://localhost:3001';
      
      console.log('Redirecting to:', `${backendUrl}/api/auth/google`);
      window.location.href = `${backendUrl}/api/auth/google`;
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: '#f8fafc',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Early Adopter Agent
          </Typography>
          
          <Typography variant="body1" color="text.secondary" align="center">
            Sign in with your Google account to get started
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={handleGoogleLogin}
            startIcon={<GoogleIcon />}
            sx={{
              mt: 2,
              bgcolor: '#fff',
              color: '#757575',
              '&:hover': {
                bgcolor: '#f5f5f5',
              },
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            Sign in with Google
          </Button>

          <Typography variant="caption" color="text.secondary" align="center">
            Secure authentication powered by Google
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login; 