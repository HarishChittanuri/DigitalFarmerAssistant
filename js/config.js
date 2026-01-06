// config.js - Environment configuration for Digital Farmer Assistant
// This file loads environment variables from .env file (in production, these would be set by the build process)

const config = {
    // Groq API Configuration
    GROQ_API_KEY: '', // Set this in your environment or localStorage

    // Firebase Configuration
    FIREBASE_API_KEY: '', // Set this in your environment or localStorage
    FIREBASE_AUTH_DOMAIN: 'digital-farmer-assistant.firebaseapp.com',
    FIREBASE_PROJECT_ID: 'digital-farmer-assistant',
    FIREBASE_STORAGE_BUCKET: 'digital-farmer-assistant.firebasestorage.app',
    FIREBASE_MESSAGING_SENDER_ID: '704405398287',
    FIREBASE_APP_ID: '1:704405398287:web:11a1cc93e7dd7b11a7947a'
};

// For production, you would load from environment variables like:
// config.GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || config.GROQ_API_KEY;
// config.FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY || config.FIREBASE_API_KEY;
// etc.

export default config;