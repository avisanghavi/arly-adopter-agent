import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { 
  Box, 
  Container, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Button,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Email as EmailIcon, 
  GitHub as GitHubIcon, 
  Logout as LogoutIcon,
  History as HistoryIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import EmailTester from './dashboard/components/EmailTester';
import EmailHistory from './dashboard/components/EmailHistory';
import Login from './dashboard/components/Login';
import UTMGenerator from './components/UTMGenerator';

const App = () => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    isLoading: true
  });
  const [currentTab, setCurrentTab] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    switch(newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/history');
        break;
      case 2:
        navigate('/utm-generator');
        break;
      default:
        navigate('/');
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/status', {
        credentials: 'include'
      });
      const data = await response.json();
      
      setAuthState({
        isAuthenticated: data.isAuthenticated,
        user: data.user,
        isLoading: false
      });

      if (!data.isAuthenticated && window.location.pathname !== '/login') {
        navigate('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false
      });
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (authState.isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      Loading...
    </Box>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          backgroundColor: '#ffffff',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <EmailIcon sx={{ color: '#1a237e', mr: 2 }} />
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 0,
                color: '#1a237e',
                fontWeight: 600,
                mr: 4
              }}
            >
              VideoFusion
            </Typography>

            {authState.isAuthenticated && (
              <Tabs 
                value={currentTab} 
                onChange={handleTabChange}
                sx={{ flexGrow: 1 }}
              >
                <Tab 
                  label="Send Email" 
                  icon={<EmailIcon />} 
                  iconPosition="start"
                />
                <Tab 
                  label="Email History" 
                  icon={<HistoryIcon />} 
                  iconPosition="start"
                />
                <Tab 
                  label="UTM Generator" 
                  icon={<LinkIcon />} 
                  iconPosition="start"
                />
              </Tabs>
            )}
            
            {authState.isAuthenticated && (
              <>
                <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary' }}>
                  {authState.user?.email}
                </Typography>
                <Button
                  onClick={handleLogout}
                  startIcon={<LogoutIcon />}
                  sx={{ color: '#1a237e' }}
                >
                  Logout
                </Button>
              </>
            )}

            <IconButton
              href="https://github.com/yourusername/early-adopter-agent"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                color: '#1a237e',
                '&:hover': {
                  backgroundColor: 'rgba(26, 35, 126, 0.04)'
                }
              }}
            >
              <GitHubIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          bgcolor: '#f6f9fc'
        }}
      >
        <Routes>
          <Route 
            path="/login" 
            element={
              authState.isAuthenticated ? 
                <Navigate to="/" replace /> : 
                <Login />
            } 
          />
          <Route 
            path="/" 
            element={
              authState.isAuthenticated ? 
                <EmailTester /> : 
                <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/history" 
            element={
              authState.isAuthenticated ? 
                <EmailHistory /> : 
                <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/utm-generator" 
            element={
              authState.isAuthenticated ? 
                <UTMGenerator /> : 
                <Navigate to="/login" replace />
            } 
          />
        </Routes>
      </Box>
    </Box>
  );
};

export default App; 