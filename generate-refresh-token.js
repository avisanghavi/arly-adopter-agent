require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const openBrowser = require('open');

// For debugging
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Redirect URI:', process.env.GOOGLE_REDIRECT_URI);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://mail.google.com/'
];

// Create a local server to receive the callback
async function getRefreshToken() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsedUrl = url.parse(req.url, true);
        console.log('Received request at path:', parsedUrl.pathname);
        
        // Check if this is the callback path
        if (parsedUrl.pathname === '/api/auth/google/callback' && parsedUrl.query.code) {
          // Close the server
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('Authentication successful! You can close this window.');
          server.close();

          // Get tokens
          const { tokens } = await oauth2Client.getToken(parsedUrl.query.code);
          resolve(tokens);
        } else {
          // Handle other paths
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      } catch (error) {
        console.error('Error getting tokens:', error);
        reject(error);
      }
    });

    // Extract port from GOOGLE_REDIRECT_URI
    const redirectUrl = new URL(process.env.GOOGLE_REDIRECT_URI);
    const port = parseInt(redirectUrl.port) || 3001;

    server.listen(port, async () => {
      // Generate auth url
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });

      console.log('\nOpening browser for authentication...');
      console.log('\nIf the browser does not open automatically, visit this URL:', authUrl);
      try {
        await openBrowser(authUrl);
      } catch (err) {
        console.log('Failed to open browser automatically. Please open the URL manually.');
      }
    });
  });
}

// Run the token generation
getRefreshToken()
  .then(tokens => {
    if (tokens.refresh_token) {
      console.log('\nYour refresh token:', tokens.refresh_token);
      console.log('\nUpdate your .env file with this refresh token');
    } else {
      console.log('\nNo refresh token received. This can happen if you have already generated a refresh token for this application.');
      console.log('Try revoking access to the application in your Google Account settings and try again.');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  }); 