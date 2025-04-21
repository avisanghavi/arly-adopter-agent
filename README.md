# VideoFusion Email Tracking System

A robust email tracking system for VideoFusion that tracks user engagement from email campaigns through signup conversion.

## Features

- UTM parameter tracking
- Email click tracking
- Signup form event tracking
- Conversion tracking
- Google OAuth integration
- MongoDB storage for analytics

## Setup

1. Clone the repository:
```bash
git clone [your-repo-url]
cd [your-repo-name]
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/early-adopter-agent
APP_URL=http://localhost:3001
CLIENT_URL=http://localhost:3000
```

4. Set up Google OAuth2 credentials and add them to `.env`:
```
GOOGLE_CLIENT_ID=[your-client-id]
GOOGLE_CLIENT_SECRET=[your-client-secret]
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
```

5. Start the development server:
```bash
npm run dev
```

## Environment Variables

See `.env.example` for all required environment variables.

## API Routes

- `/api/email-tracking/click/:messageId` - Track email clicks
- `/api/email-tracking/form-event/:messageId` - Track form events
- `/api/email-tracking/conversion/:messageId` - Track conversions
- `/api/auth/google` - Google OAuth login
- `/api/auth/google/callback` - Google OAuth callback

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 