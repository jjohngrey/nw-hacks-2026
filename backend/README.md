Backend Responsibilities

1. Audio Stream Management 🎤
Receives audio from Google Nest Mini devices

Connects to Google Assistant SDK
Establishes persistent audio streams from 1-3 Nest Minis
Buffers incoming audio chunks
Handles multiple simultaneous streams (one per device/room)

Code responsibility:
javascript// Pseudo-code
- Listen for audio streams from Nest devices
- Buffer audio in manageable chunks (e.g., 3-5 seconds)
- Queue audio for processing
- Track which room/device audio came from

2. Sound Classification (AI Processing) 🤖
Sends audio to Gemini API for analysis

Converts audio to format Gemini can process (spectrograms, audio features)
Sends to Gemini with prompt: "Classify this sound as: doorbell, baby crying, glass breaking, alarm, knocking, etc."
Receives classification result + confidence score
Filters out background noise / low-confidence detections

Code responsibility:
javascript// Pseudo-code
async function classifySound(audioChunk, deviceLocation) {
  // Extract audio features or convert to spectrogram
  const audioFeatures = extractFeatures(audioChunk);
  
  // Send to Gemini API
  const result = await gemini.classify({
    audio: audioFeatures,
    prompt: "Identify this sound: doorbell, baby crying, alarm, glass breaking, knocking, dog barking, or other"
  });
  
  // Return classification
  return {
    soundType: result.classification,
    confidence: result.confidence,
    location: deviceLocation,
    timestamp: new Date()
  };
}

3. Voice Announcement Generation 🔊
Creates natural language alerts via ElevenLabs

Takes classified sound + location
Generates text message: "Doorbell detected at front door"
Sends to ElevenLabs API to convert to speech
Returns audio file URL or base64 audio

Code responsibility:
javascript// Pseudo-code
async function generateVoiceAlert(soundType, location) {
  const message = `${soundType} detected at ${location}`;
  
  const voiceAudio = await elevenLabs.textToSpeech({
    text: message,
    voice: "friendly-female", // or male, your choice
    model: "eleven_monolingual_v1"
  });
  
  return voiceAudio; // Audio file to send to phone
}

4. Push Notifications 📱
Sends alerts to user's phone app

Manages device tokens (which phones to notify)
Sends push notifications via Firebase Cloud Messaging or Expo
Includes: sound type, location, timestamp, voice audio
Handles notification preferences (e.g., only alert for certain sounds)

Code responsibility:
javascript// Pseudo-code
async function sendNotification(userId, soundEvent) {
  await firebase.messaging().send({
    token: user.deviceToken,
    notification: {
      title: `${soundEvent.soundType} Detected`,
      body: `Heard at ${soundEvent.location}`
    },
    data: {
      soundType: soundEvent.soundType,
      location: soundEvent.location,
      voiceAudioUrl: soundEvent.voiceAudio,
      timestamp: soundEvent.timestamp
    }
  });
}

5. Database Management 💾
Stores all sound detection events

Saves every detected sound to database (history)
Stores user preferences (which sounds to alert for)
Manages device configurations (which Nest Minis belong to which user)
Provides data for web dashboard analytics

What gets stored:
javascript// Sound Event Schema
{
  id: "evt_123",
  userId: "user_456",
  soundType: "doorbell",
  confidence: 0.95,
  location: "front_door",
  deviceId: "nest_mini_1",
  timestamp: "2026-01-17T10:30:00Z",
  notificationSent: true,
  voiceAudioUrl: "https://..."
}

// User Preferences Schema
{
  userId: "user_456",
  enabledSounds: ["doorbell", "baby_crying", "alarm"],
  quietHours: { start: "22:00", end: "07:00" },
  devices: ["nest_mini_1", "nest_mini_2"]
}

6. Real-time Communication (WebSocket) ⚡
Maintains live connections to mobile app and web dashboard

WebSocket server (Socket.io) for instant updates
Broadcasts sound detections in real-time
Sends live audio stream status (which devices are active)
Bidirectional: receives commands from app (e.g., "mute alerts for 1 hour")

Code responsibility:
javascript// Pseudo-code
io.on('connection', (socket) => {
  // Client connected
  
  // When sound detected, broadcast to all connected clients
  socket.emit('soundDetected', {
    soundType: 'doorbell',
    location: 'front_door',
    timestamp: new Date()
  });
  
  // Receive commands from client
  socket.on('muteAlerts', (duration) => {
    // Temporarily disable notifications
  });
});

7. Device Management 🏠
Handles multiple Nest Mini devices

Registers new Nest Minis when user adds them
Tracks which device detected which sound
Monitors device health (is Nest Mini still connected?)
Manages room/location labels for each device

Code responsibility:
javascript// Pseudo-code
async function registerDevice(userId, deviceId, location) {
  await db.collection('devices').add({
    userId: userId,
    deviceId: deviceId,
    location: location, // "living_room", "bedroom", etc.
    status: "active",
    lastSeen: new Date()
  });
}

8. User Settings & Preferences ⚙️
Manages what user wants to be alerted about

Which sounds trigger notifications (doorbell yes, dog barking no)
Quiet hours (don't alert between 11pm - 7am)
Alert methods (push notification, voice, both)
Sensitivity levels (high confidence only vs. all detections)

// Example endpoints:

GET  /api/events              // Get sound detection history
GET  /api/events/:id          // Get specific event details
GET  /api/devices             // List user's Nest Mini devices
POST /api/devices             // Add new device
PUT  /api/preferences         // Update user settings
GET  /api/stats               // Analytics (sounds per day, etc.)
DELETE /api/events/:id        // Delete event from history
```

---

### **10. Error Handling & Logging** 🐛

**Keeps system running smoothly**
- Logs all API calls, errors, and sound detections
- Handles failures gracefully:
  - Gemini API down? → Fall back to simple pattern matching
  - Nest Mini disconnected? → Alert user, retry connection
  - Database error? → Queue writes, retry later
- Monitoring and health checks

---

## **Backend Architecture Diagram**
```
┌──────────────────────────────────────────────────────┐
│                    BACKEND SERVER                     │
│                  (Node.js + Express)                  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  1. Audio Stream Manager                    │    │
│  │     - Google Assistant SDK integration      │    │
│  │     - Multi-device audio buffering          │    │
│  └────────────────┬────────────────────────────┘    │
│                   │                                   │
│                   ▼                                   │
│  ┌─────────────────────────────────────────────┐    │
│  │  2. AI Sound Classifier                     │    │
│  │     - Gemini API calls                      │    │
│  │     - Audio feature extraction              │    │
│  └────────────────┬────────────────────────────┘    │
│                   │                                   │
│                   ▼                                   │
│  ┌─────────────────────────────────────────────┐    │
│  │  3. Voice Generator                         │    │
│  │     - ElevenLabs API                        │    │
│  │     - Text-to-speech conversion             │    │
│  └────────────────┬────────────────────────────┘    │
│                   │                                   │
│                   ▼                                   │
│  ┌─────────────────────────────────────────────┐    │
│  │  4. Notification Service                    │    │
│  │     - Firebase Cloud Messaging              │    │
│  │     - Push to mobile app                    │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  5. Database Layer (Firebase/Supabase)      │    │
│  │     - Event history                         │    │
│  │     - User preferences                      │    │
│  │     - Device configs                        │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  6. WebSocket Server (Socket.io)            │    │
│  │     - Real-time updates to clients          │    │
│  │     - Bidirectional communication           │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  7. REST API (Express routes)               │    │
│  │     - /api/events                           │    │
│  │     - /api/devices                          │    │
│  │     - /api/preferences                      │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
└──────────────────────────────────────────────────────┘