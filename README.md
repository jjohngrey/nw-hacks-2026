# What Was That? 🔊

A smart sound detection and alert system that helps users identify and be notified about important sounds in their environment. Built for nwHacks 2026.

## 🎯 Overview

**What Was That?** is a comprehensive sound detection platform that allows users to:
- Record and teach the app to recognize custom sounds (doorbells, alarms, baby crying, etc.)
- Receive real-time push notifications when detected sounds occur
- Monitor sound events through a sensor device
- Manage emergency contacts and check-in features
- View sound detection history

## 🏗️ Architecture

The project consists of three main components:

### 1. **Mobile App** (`what-was-that-app/`)
React Native/Expo application for iOS and Android that provides:
- Sound recording and teaching interface
- Push notification management
- Sound library management
- Emergency contact features
- Event history viewing

### 2. **Backend Server** (`backend/`)
Node.js/Express server that handles:
- Audio fingerprinting and matching
- Push notification delivery (Expo)
- Audio file uploads and storage
- User and device management
- Twilio integration for emergency alerts

### 3. **Sensor App** (`iphone-sensor/` & `sensor-app/`)
Continuous audio monitoring applications that:
- Stream audio to the backend
- Detect sounds in real-time
- Send alerts when matches are found

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for iOS development) or Android Emulator
- Backend server access or local setup

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd nw-hacks-2026
```

#### 2. Setup Backend Server

```bash
cd backend
npm install

# Copy and configure environment variables
cp config.example.js config.js
# Edit config.js with your API keys and settings

# Start the server
npm start
# Or for development with auto-reload:
npm run dev
```

The backend server will run on `http://localhost:3000` by default.

#### 3. Setup Mobile App

```bash
cd what-was-that-app
npm install

# Start the Expo development server
npm start
# Or use platform-specific commands:
npm run ios      # iOS simulator
npm run android # Android emulator
npm run web     # Web browser
```

#### 4. Setup Sensor App (Optional)

```bash
cd sensor-app
npm install
npm start
```

## 📱 Features

### Mobile App Features

- **Sound Recording**: Record up to 3 samples of any sound for better detection accuracy
- **Custom Sound Library**: Save and manage your personalized sound library
- **Real-time Notifications**: Receive push notifications when sounds are detected
- **Emergency Contacts**: Set up emergency contacts for critical alerts
- **Check-in System**: "I'm OK" and "I Need Help" buttons for caregiver communication
- **Event History**: View all detected sounds with timestamps
- **Sleep Mode**: Quiet hours to prevent unnecessary alerts
- **Sound Categories**: Organize sounds by Safety, Daily, or Personal categories

### Backend Features

- **Audio Fingerprinting**: Advanced audio matching using spectral analysis
- **Multi-device Support**: Handle multiple sensor devices simultaneously
- **Push Notifications**: Expo push notification service integration
- **Twilio Integration**: SMS and voice call alerts for emergencies
- **RESTful API**: Comprehensive API for all app operations
- **File Management**: Secure audio file upload and storage

## 🔧 Configuration

### Backend Configuration

Create a `config.js` file in the `backend/` directory:

```javascript
module.exports = {
  // Twilio Configuration
  twilio: {
    accountSid: 'your_account_sid',
    authToken: 'your_auth_token',
    phoneNumber: 'your_twilio_number'
  },
  
  // Expo Push Notifications
  expo: {
    accessToken: 'your_expo_access_token' // Optional
  },
  
  // Server Configuration
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
};
```

### Mobile App Configuration

The app uses a production backend by default. To change this, edit `App.tsx`:

```typescript
const PRODUCTION_BACKEND = 'http://your-backend-url:3000';
```

## 📡 API Endpoints

### Audio Management

- `POST /api/audio/upload` - Upload audio file for fingerprinting
- `GET /api/audio/fingerprints` - Get all fingerprints for a user
- `DELETE /api/audio/fingerprint/:audioId` - Delete a fingerprint

### Notifications

- `POST /api/notifications/register` - Register device for push notifications
- `POST /api/notifications/send` - Send push notification

### Alerts

- `POST /api/alerts/checkin` - Send "I'm OK" check-in
- `POST /api/alerts/emergency` - Send emergency alert

### Events

- `GET /api/events` - Get sound detection events
- `POST /api/events` - Create new event
- `DELETE /api/events/:id` - Delete event

## 🧪 Testing

### Backend Testing

```bash
cd backend
npm test
```

### Mobile App Testing

The app includes comprehensive testing guides:
- See `TESTING_GUIDE.md` for detailed testing instructions
- See `QUICK_TEST.md` for quick start testing

## 📦 Project Structure

```
nw-hacks-2026/
├── backend/                 # Backend server
│   ├── server.js           # Main server file
│   ├── services/           # Service modules (Twilio, etc.)
│   └── user_fingerprints/  # Audio fingerprint storage
├── what-was-that-app/      # Main mobile app
│   ├── App.tsx             # Main app component
│   ├── app/
│   │   └── components/     # React components
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Utility functions
├── sensor-app/            # Sensor monitoring app
└── iphone-sensor/          # iOS sensor app variant
```

## 🛠️ Technologies Used

### Mobile App
- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and tooling
- **TypeScript** - Type-safe JavaScript
- **Expo AV** - Audio recording and playback
- **Expo Notifications** - Push notifications
- **Lucide React Native** - Icon library
- **Axios** - HTTP client

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Multer** - File upload handling
- **Fluent FFmpeg** - Audio processing
- **Expo Server SDK** - Push notification service
- **Twilio** - SMS and voice services

## 🔐 Security Considerations

- Audio files are stored securely on the server
- User authentication and device token management
- API endpoints include validation and error handling
- Sensitive configuration stored in environment variables

## 📝 License

This project was created for nwHacks 2026. See individual component licenses for details.

## 🤝 Contributing

This is a hackathon project. For questions or contributions, please contact the development team.

## 📞 Support

For issues or questions:
1. Check the `TESTING_GUIDE.md` for common issues
2. Review component-specific README files
3. Check backend logs for API errors

## 🎉 Acknowledgments

Built with ❤️ for nwHacks 2026

---

**Note**: This project is designed for demonstration purposes. Production deployment would require additional security measures, error handling, and scalability considerations.
