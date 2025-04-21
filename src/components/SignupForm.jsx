import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const SignupForm = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    companyEmail: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const trackFormEvent = async (eventType, success = true) => {
    try {
      // Get email_track from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const emailTrackId = urlParams.get('email_track');
      
      if (emailTrackId) {
        const response = await fetch(`/api/email-tracking/form-event/${emailTrackId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventType,
            formStep: 'initial_signup',
            success,
          }),
        });

        if (!response.ok) {
          console.warn('Failed to track form event:', await response.json());
        }
      }
    } catch (error) {
      console.error('Error tracking form event:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Track that Continue was clicked
      await trackFormEvent('continue_click');

      // Your form submission logic here
      // const response = await fetch('/api/auth/signup', { ... });
      
      // Track successful form submission
      await trackFormEvent('form_submit', true);
      
      // Redirect or handle success
    } catch (error) {
      console.error('Signup error:', error);
      // Track failed form submission
      await trackFormEvent('form_submit', false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        maxWidth: '400px',
        mx: 'auto',
        p: 3,
      }}
    >
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Create your account
      </Typography>
      
      <Typography variant="body1" color="text.secondary" align="center" gutterBottom>
        Please fill in these details to kickstart your journey
      </Typography>

      <TextField
        fullWidth
        label="Full Name"
        name="fullName"
        value={formData.fullName}
        onChange={handleChange}
        placeholder="e.g. John Dory"
        required
      />

      <TextField
        fullWidth
        label="Company Email"
        name="companyEmail"
        type="email"
        value={formData.companyEmail}
        onChange={handleChange}
        placeholder="e.g. your@organization.com"
        required
      />

      <TextField
        fullWidth
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleChange}
        placeholder="e.g. your password"
        required
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={isSubmitting}
        sx={{
          mt: 2,
          py: 1.5,
          bgcolor: '#673ab7',
          '&:hover': {
            bgcolor: '#5e35b1',
          },
        }}
      >
        Continue
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          By clicking "Continue," you acknowledge that you have read, understood, and
          agree to be bound by the{' '}
          <Link href="/privacy-policy" color="primary">
            privacy policy
          </Link>{' '}
          and{' '}
          <Link href="/terms-of-service" color="primary">
            terms of service
          </Link>
        </Typography>
      </Box>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2">
          Already have an account?{' '}
          <Link href="/sign-in" color="primary">
            Sign In
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default SignupForm; 