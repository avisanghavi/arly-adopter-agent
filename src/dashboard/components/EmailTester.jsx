import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  IconButton,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  Person as PersonIcon,
  AutoAwesome as AIIcon,
  Link as LinkIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

const EmailTester = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState('onboarding');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [productAnalysis, setProductAnalysis] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const [recipientData, setRecipientData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    interests: '',
    linkedinUrl: '',
    relationshipLevel: 'cold'
  });

  // New UTM state
  const [utmData, setUtmData] = useState({
    baseUrl: 'https://videofusion.ai/claim-offer',
    source: 'email',
    medium: 'cta_button',
    campaign: 'product_launch',
    term: '',
    content: '',
  });

  // New button style state
  const [buttonStyle, setButtonStyle] = useState({
    text: 'Claim 10 Free Minutes',
    backgroundColor: '#000000',
    textColor: '#ffffff',
    borderRadius: '5px',
    padding: '12px 24px',
  });

  const steps = [
    'Product Description',
    'Add Recipient Details',
    'Generate & Review',
    'Customize CTA',
    'Send Email'
  ];

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const generateUtmUrl = () => {
    const params = new URLSearchParams();
    Object.entries(utmData).forEach(([key, value]) => {
      if (value && key !== 'baseUrl') {
        params.append(`utm_${key}`, value.toLowerCase().replace(/\s+/g, '_'));
      }
    });
    
    return `${utmData.baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
  };

  const generateButtonHtml = () => {
    const utmUrl = generateUtmUrl();
    return `
      <a href="${utmUrl}" 
         style="
           display: inline-block;
           background-color: ${buttonStyle.backgroundColor};
           color: ${buttonStyle.textColor};
           padding: ${buttonStyle.padding};
           text-decoration: none;
           border-radius: ${buttonStyle.borderRadius};
           font-weight: bold;
           margin: 20px 0;
         "
      >
        ${buttonStyle.text}
      </a>
    `;
  };

  const insertButtonIntoEmail = () => {
    const buttonHtml = generateButtonHtml();
    const updatedBody = editableBody + '\n\n' + buttonHtml;
    setEditableBody(updatedBody);
  };

  const handleAnalyzeProduct = async () => {
    if (!productDescription.trim()) {
      showNotification('Please enter a product description', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/emails/analyze-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ description: productDescription }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze product description');
      }

      const analysisData = await response.json();
      setProductAnalysis(analysisData.analysis);
      showNotification('Product description analyzed successfully!', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const extractSubjectAndBody = (content) => {
    const lines = content.split('\n');
    let subject = '';
    let body = content;

    const subjectLineIndex = lines.findIndex(line => 
      line.toLowerCase().trim().startsWith('subject:')
    );

    if (subjectLineIndex !== -1) {
      subject = lines[subjectLineIndex].substring('subject:'.length).trim();
      body = lines.slice(subjectLineIndex + 1).join('\n').trim();
    }

    return { subject, body };
  };

  const handleGenerateContent = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3001/api/emails/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          template: selectedTemplate,
          recipient: recipientData,
          productAnalysis: productAnalysis
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate content');
      }
      
      const { content } = await response.json();
      const { subject, body } = extractSubjectAndBody(content);
      setGeneratedContent(content);
      setEditableSubject(subject);
      setEditableBody(body);
      handleNext();
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTest = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/emails/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          template: selectedTemplate,
          recipientName: recipientData.name,
          testEmail: recipientData.email,
          generatedContent: `Subject: ${editableSubject}\n\n${editableBody}`
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send test email');
      }
      
      showNotification('Email sent successfully! 🚀', 'success');
      // Reset the form
      setActiveStep(0);
      setRecipientData({
        name: '',
        email: '',
        company: '',
        role: '',
        interests: '',
        linkedinUrl: '',
        relationshipLevel: 'cold'
      });
      setGeneratedContent('');
      setProductDescription('');
      setProductAnalysis('');
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, severity) => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const updateRecipientData = (field, value) => {
    setRecipientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isStepComplete = (step) => {
    switch (step) {
      case 0: // Product description step
        return productDescription.trim().length > 0 && productAnalysis;
      case 1: // Recipient step
        return recipientData.name && recipientData.email;
      case 2: // Generate & Review step
        return generatedContent;
      case 3: // Customize CTA step
        return buttonStyle.text && buttonStyle.backgroundColor && buttonStyle.textColor && buttonStyle.borderRadius && buttonStyle.padding;
      case 4: // Send step
        return true;
      default:
        return false;
    }
  };

  const renderCtaCustomization = () => (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Customize Your Call-to-Action Button
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Button Text"
            value={buttonStyle.text}
            onChange={(e) => setButtonStyle({ ...buttonStyle, text: e.target.value })}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Background Color"
            value={buttonStyle.backgroundColor}
            onChange={(e) => setButtonStyle({ ...buttonStyle, backgroundColor: e.target.value })}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Text Color"
            value={buttonStyle.textColor}
            onChange={(e) => setButtonStyle({ ...buttonStyle, textColor: e.target.value })}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            UTM Parameters
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Base URL"
            value={utmData.baseUrl}
            onChange={(e) => setUtmData({ ...utmData, baseUrl: e.target.value })}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Campaign Source"
            value={utmData.source}
            onChange={(e) => setUtmData({ ...utmData, source: e.target.value })}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Campaign Medium"
            value={utmData.medium}
            onChange={(e) => setUtmData({ ...utmData, medium: e.target.value })}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Campaign Name"
            value={utmData.campaign}
            onChange={(e) => setUtmData({ ...utmData, campaign: e.target.value })}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleBack}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            insertButtonIntoEmail();
            handleNext();
          }}
        >
          Add to Email
        </Button>
      </Box>
    </Box>
  );

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ maxWidth: '800px', mx: 'auto', width: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Product Description
            </Typography>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Product Description"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Enter a detailed description of your product, including its key features, benefits, and target audience..."
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={handleAnalyzeProduct}
                  disabled={isLoading || !productDescription.trim()}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <AIIcon />}
                >
                  {isLoading ? 'Analyzing...' : 'Analyze Description'}
                </Button>
              </Box>

              {productAnalysis && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    AI Analysis Results
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {productAnalysis}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Paper>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ maxWidth: '600px', mx: 'auto', width: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Recipient Information
            </Typography>
            <Paper sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={recipientData.name}
                    onChange={(e) => updateRecipientData('name', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={recipientData.email}
                    onChange={(e) => updateRecipientData('email', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company"
                    value={recipientData.company}
                    onChange={(e) => updateRecipientData('company', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Role"
                    value={recipientData.role}
                    onChange={(e) => updateRecipientData('role', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="LinkedIn Profile URL"
                    value={recipientData.linkedinUrl}
                    onChange={(e) => updateRecipientData('linkedinUrl', e.target.value)}
                    placeholder="https://www.linkedin.com/in/username"
                    helperText="Add their LinkedIn profile URL for enhanced personalization"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Relationship Level</InputLabel>
                    <Select
                      value={recipientData.relationshipLevel}
                      onChange={(e) => updateRecipientData('relationshipLevel', e.target.value)}
                      label="Relationship Level"
                    >
                      <MenuItem value="cold">
                        <Box>
                          <Typography variant="subtitle2">Cold</Typography>
                          <Typography variant="caption" color="text.secondary">
                            No prior interaction or connection
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="warm">
                        <Box>
                          <Typography variant="subtitle2">Warm</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Some prior interaction or mutual connections
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="close">
                        <Box>
                          <Typography variant="subtitle2">Close</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Strong relationship or frequent interaction
                          </Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Interests/Notes"
                    multiline
                    rows={3}
                    value={recipientData.interests}
                    onChange={(e) => updateRecipientData('interests', e.target.value)}
                    helperText="Add any relevant information that will help personalize the message"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ maxWidth: '800px', mx: 'auto', width: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Generate & Review Message
            </Typography>
            <Paper sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Recipient
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {recipientData.name} ({recipientData.email})
                {recipientData.company && ` - ${recipientData.company}`}
                {recipientData.role && `, ${recipientData.role}`}
              </Typography>

              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Message Content
              </Typography>
              {!generatedContent ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleGenerateContent}
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} /> : <AIIcon />}
                  >
                    {isLoading ? 'Generating...' : 'Generate Email'}
                  </Button>
                </Box>
              ) : (
                <>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
                    {generatedContent}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setGeneratedContent('');
                        showNotification('Regenerating email...', 'info');
                      }}
                      startIcon={<AIIcon />}
                    >
                      Regenerate
                    </Button>
                  </Box>
                </>
              )}
            </Paper>
          </Box>
        );

      case 3:
        return renderCtaCustomization();

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Final Review
            </Typography>
            <TextField
              fullWidth
              label="Subject"
              value={editableSubject}
              onChange={(e) => setEditableSubject(e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Message"
              value={editableBody}
              onChange={(e) => setEditableBody(e.target.value)}
              multiline
              rows={12}
              margin="normal"
            />
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleBack}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleSendTest}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <SendIcon />}
              >
                Send Email
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', p: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 1 }}>
            Email Campaign Generator
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create hyper-personalized email campaigns using AI
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 4 }}>
          {getStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 2 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ minWidth: 120 }}
            >
              Back
            </Button>
            
            {activeStep !== steps.length - 1 && (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!isStepComplete(activeStep) || isLoading}
                sx={{ minWidth: 120 }}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Container>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmailTester; 