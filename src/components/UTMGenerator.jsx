import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Snackbar,
  IconButton,
  InputAdornment,
  Alert,
  Grid,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

const UTMGenerator = () => {
  const [baseUrl, setBaseUrl] = useState('https://videofusion.ai/claim-offer');
  const [campaign, setCampaign] = useState({
    source: 'email',
    medium: 'cta_button',
    campaign: 'product_launch',
    term: '',
    content: '',
  });
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const generateUtmUrl = () => {
    const params = new URLSearchParams();
    Object.entries(campaign).forEach(([key, value]) => {
      if (value) {
        params.append(`utm_${key}`, value.toLowerCase().replace(/\s+/g, '_'));
      }
    });
    
    const utmUrl = `${baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
    setGeneratedUrl(utmUrl);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setShowAlert(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', my: 4 }}>
      <Typography variant="h5" gutterBottom>
        Email Campaign Link Generator
      </Typography>
      
      <Box component="form" sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Base URL"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Campaign Source"
              value={campaign.source}
              onChange={(e) => setCampaign({ ...campaign, source: e.target.value })}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Campaign Medium"
              value={campaign.medium}
              onChange={(e) => setCampaign({ ...campaign, medium: e.target.value })}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Campaign Name"
              value={campaign.campaign}
              onChange={(e) => setCampaign({ ...campaign, campaign: e.target.value })}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Campaign Term (optional)"
              value={campaign.term}
              onChange={(e) => setCampaign({ ...campaign, term: e.target.value })}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Campaign Content (optional)"
              value={campaign.content}
              onChange={(e) => setCampaign({ ...campaign, content: e.target.value })}
              margin="normal"
            />
          </Grid>
        </Grid>

        <Button
          variant="contained"
          color="primary"
          onClick={generateUtmUrl}
          sx={{ mt: 3, mb: 2 }}
          fullWidth
        >
          Generate UTM Link
        </Button>

        {generatedUrl && (
          <TextField
            fullWidth
            label="Generated UTM URL"
            value={generatedUrl}
            margin="normal"
            multiline
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={copyToClipboard} edge="end">
                    {copied ? <CheckIcon color="success" /> : <CopyIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}
      </Box>

      <Snackbar
        open={showAlert}
        autoHideDuration={2000}
        onClose={() => setShowAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          URL copied to clipboard!
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default UTMGenerator; 