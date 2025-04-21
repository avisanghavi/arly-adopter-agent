# VideoFusion Early Adopter Agent

A platform for managing early adopter engagement and email campaigns.

## Features

- Google OAuth Integration
- Email Campaign Management
- UTM Tracking
- Conversion Analytics
- Early Adopter Management

## Environment Setup

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=your_mongodb_uri

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri
GOOGLE_USER_EMAIL=your_email

# Application URLs
APP_URL=your_app_url
CLIENT_URL=your_client_url

# Other Configuration
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

## Project Structure

```
early-adopter-agent/
├── config/              # Configuration files
├── src/                 # Source code
│   ├── agent/          # Core agent logic
│   ├── services/       # Service implementations
│   ├── models/         # Database models
│   └── utils/          # Utility functions
├── dashboard/          # Admin dashboard
├── api/                # API endpoints
├── tests/              # Test files
└── docs/               # Documentation
```

## Configuration

The agent's behavior can be customized through the following configuration files:

- `config/agent-settings.json`: Core agent settings
- `config/email-templates/`: Email template customization
- `config/database.json`: Database configuration

## API Documentation

The API documentation is available in the `docs/api-reference.md` file.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers. 