# Quick Test Guide

## 🚀 Fast Setup (5 minutes)

### 1. Start Backend
```bash
cd backend
npm start
```

### 2. Start Main App
```bash
cd what-was-that-app
npm start
# Scan QR code with Expo Go on Phone 1
```

### 3. Get Your User ID
- Open main app → **Settings** tab
- Scroll to "Your User ID" section
- **Copy the User ID** (it's selectable text)

### 4. Start Sensor App
```bash
cd sensor-app
npm start
# Scan QR code with Expo Go on Phone 2
```

### 5. Pair Sensor
- Open sensor app
- Tap **Settings icon** (gear)
- Paste your **User ID** from step 3
- Tap **"Pair with Main App"**
- Should show ✅ "Paired" (green)

### 6. Register a Sound
- In main app, go to **"Chimes"** or **"Teach Sound"**
- Record a sound (clap, whistle, etc.)
- Name it (e.g., "Test Clap")
- Save it

### 7. Test Detection
- In sensor app, tap **"Start Listening"**
- Play the sound you registered (clap, whistle, etc.)
- Check sensor app: "Matches Found" should increment
- Check main app: You should get a notification!
- Check main app → **History**: Should see the detection

## ✅ Success Indicators

- Sensor shows: ✅ "Paired" (green)
- Sensor shows: "Listening..." (green radio icon)
- Sensor stats increment when sound detected
- Main app receives push notification
- History shows detection with timestamp

## 🐛 Common Issues

**"Not Paired"**
- Check backend is running
- Verify User ID is correct
- Check backend URL in sensor settings

**No matches**
- Make sure sensor is "Listening..."
- Play sound louder/closer
- Verify sound is registered in main app

**No notifications**
- Check notification permissions
- Verify User ID matches
- Test notification from Settings screen
