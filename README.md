# Early Adopter Agent

A web service that helps users discover and evaluate new products and services.

## Features

- Google OAuth Authentication
- MongoDB Database Integration
- Email Integration
- Product Discovery and Evaluation
- User Profile Management

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- Passport.js
- Google OAuth
- Vercel Deployment

## Environment Variables

Required environment variables:

```env
MONGODB_URI=your_mongodb_connection_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
```

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/avisanghavi/early-adopter-agent.git
cd early-adopter-agent
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the required environment variables

4. Start the development server:
```bash
npm run dev
```

## Deployment

This project is configured for deployment on Vercel. The deployment process is automated through GitHub integration.

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set up the required environment variables in Vercel
4. Deploy!

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /auth/google` - Google OAuth authentication
- `GET /auth/google/callback` - Google OAuth callback
- `GET /api/user` - Get current user profile
- `POST /api/products` - Add new product
- `GET /api/products` - Get all products

## License

MIT 