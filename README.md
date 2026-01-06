# Digital Farmer Assistant

A comprehensive platform connecting farmers with agricultural laborers, featuring AI-powered crop recommendations and real-time job matching.

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Groq API Configuration
VITE_GROQ_API_KEY=your_groq_api_key_here

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 2. API Keys Setup

- **Groq API**: Get your API key from [Groq Console](https://console.groq.com/)
- **Firebase**: Set up your Firebase project and get the configuration from Firebase Console

### 3. Security Notes

- Never commit API keys to version control
- The `.env` file is already included in `.gitignore`
- For production deployment, set environment variables in your hosting platform

## Features

- 🔐 User authentication (Farmers & Laborers)
- 🌾 AI-powered crop recommendations
- 💬 Agricultural chatbot assistant
- 📋 Job posting and application system
- 📍 Location-based job matching
- 🌤️ Weather integration
- 📱 Responsive design

## File Structure

```
├── js/
│   ├── config.js          # Environment configuration
│   ├── firebaseConfig.js  # Firebase setup
│   ├── crop-recommendations.js  # AI crop recommendations
│   ├── chatbot.js         # AI chatbot
│   └── ...                # Other modules
├── css/                   # Stylesheets
├── .env                   # Environment variables (gitignored)
├── .gitignore            # Git ignore rules
└── *.html                # HTML pages
```

## Development

1. Clone the repository
2. Set up your `.env` file with API keys
3. Open `index.html` in a web browser or use a local server

## Deployment

For production deployment:
1. Set environment variables in your hosting platform
2. Update `config.js` to load from `import.meta.env` (for Vite) or your platform's environment variables
3. Deploy to your preferred hosting service