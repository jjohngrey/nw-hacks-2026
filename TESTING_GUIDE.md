# Testing Guide: WhatWasThat Sensor System

## Prerequisites

1. **Backend server running** on `http://155.138.215.227:3000` (or your local network)
2. **Two phones** (or one phone + simulator/emulator)
3. **Main app** installed on Phone 1
4. **Sensor app** installed on Phone 2

---

## Step 1: Start the Backend Server

```bash
cd backend
npm install  # if not already done
npm start
```

You should see:
```
🎵 Audio Fingerprinting Server running!
   Local:   http://localhost:3000
   Network: http://YOUR_IP:3000
```

**Note the Network URL** - you'll need this for both apps if testing on physical devices.

---

## Step 2: Set Up Main App (Phone 1)

### 2.1 Start the Main App

```bash
cd what-was-that-app
npm install  # if not already done
npm start
```

### 2.2 Get Your User ID

The main app generates a unique User ID. To find it:

**Option A: Check Console Logs**
- When the app starts, look for logs like: `"📥 Fetching fingerprints for user: YOUR_USER_ID"`
- Or check: `"✅ Registered push token for user: YOUR_USER_ID"`

**Option B: Add Temporary Debug Screen**
- The User ID is stored in AsyncStorage with key `'userId'`
- You can temporarily add a debug view to display it

**Option C: Check Backend Logs**
- When you register for notifications, the backend logs: `"✅ Registered push token for user: YOUR_USER_ID"`

**Write down this User ID** - you'll need it for pairing!

### 2.3 Register a Sound to Detect

1. Open the main app
2. Go to the "Chimes" or "Teach Sound" screen
3. Record a sound (e.g., clap, whistle, doorbell)
4. Give it a name (e.g., "Test Sound")
5. Save it

This creates a fingerprint in the backend that the sensor will match against.

---

## Step 3: Set Up Sensor App (Phone 2)

### 3.1 Start the Sensor App

```bash
cd sensor-app
npm install  # if not already done
npm start
```

### 3.2 Pair with Main App

1. Open the sensor app
2. Tap the **Settings icon** (gear) in the top right
3. You'll see your **Sensor ID** (auto-generated, e.g., `sensor-1234567890-abc123`)
4. Enter the **Main App User ID** from Step 2.2
5. If needed, update the **Backend URL** (default: `http://155.138.215.227:3000`)
6. Tap **"Pair with Main App"**
7. You should see: ✅ "Paired" status (green Wi-Fi icon)

---

## Step 4: Test Sound Detection

### 4.1 Start Listening on Sensor

1. In the sensor app, tap **"Start Listening"**
2. The status should change to "Listening..." with a green radio icon
3. The app will start recording 3-second audio chunks

### 4.2 Trigger the Registered Sound

1. On Phone 1 (or nearby), play the sound you registered in Step 2.3
   - If you registered a clap, clap your hands
   - If you registered a whistle, whistle
   - If you registered a doorbell, play a doorbell sound

### 4.3 Verify Detection

**On Sensor App:**
- Check the "Detection Stats" card
- "Matches Found" should increment
- "Last Match" should show your sound name and confidence %

**On Main App:**
- You should receive a **push notification**: "🔔 Sound Detected: [Your Sound Name]"
- Open the **History** tab
- Pull down to refresh
- You should see a new entry with:
  - Sound name
  - Sensor ID
  - Timestamp
  - Confidence percentage

---

## Step 5: Test History

1. In main app, go to **History** tab
2. Pull down to refresh
3. You should see all detections from the sensor
4. Each entry shows:
   - Sound name
   - Sensor ID (shortened)
   - Time ago (e.g., "2m ago")
   - Confidence percentage

---

## Troubleshooting

### Sensor App Shows "Not Paired"

**Check:**
1. Backend is running
2. Backend URL is correct in sensor settings
3. Main App User ID is correct
4. Network connectivity (both phones on same network or using production backend)

**Try:**
- Unpair and re-pair
- Check backend logs for pairing requests

### No Matches Found

**Check:**
1. Sensor is actually listening (green "Listening..." status)
2. Sound is loud enough and close to sensor phone
3. You're playing the exact sound you registered
4. Backend logs show upload requests from sensor

**Try:**
- Register a simpler, louder sound (clap, whistle)
- Move sensor phone closer to sound source
- Check backend console for match results

### Notifications Not Received

**Check:**
1. Main app has push notification permissions
2. Main app User ID matches the one used for pairing
3. Backend logs show notification send attempts

**Try:**
- Test notification from Settings screen
- Check Expo push token registration
- Verify userId in backend device tokens

### History Not Showing

**Check:**
1. Pull down to refresh in History tab
2. Backend is running and accessible
3. Main App User ID is correct

**Try:**
- Check backend logs for history requests
- Verify detections exist: `GET /api/sensor/history?mainAppUserId=YOUR_USER_ID`

---

## Quick Test Checklist

- [ ] Backend server running
- [ ] Main app started and User ID noted
- [ ] At least one sound registered in main app
- [ ] Sensor app started
- [ ] Sensor paired with main app (green "Paired" status)
- [ ] Sensor listening (green "Listening..." status)
- [ ] Sound played near sensor
- [ ] Match detected (sensor stats increment)
- [ ] Notification received on main app
- [ ] History shows detection entry

---

## Testing with Simulators/Emulators

If testing with iOS Simulator or Android Emulator:

1. **Backend URL**: Use your computer's local IP (shown in backend startup)
   - Example: `http://192.168.1.100:3000`
2. **Audio Recording**: May be limited in simulators
   - Use physical devices for best results
3. **Network**: Ensure simulator can reach your computer's IP

---

## Advanced Testing

### Test Multiple Sounds

1. Register multiple sounds in main app
2. Play different sounds near sensor
3. Verify each triggers correct detection

### Test Multiple Sensors

1. Pair multiple sensor phones with same main app
2. Each sensor should have unique Sensor ID
3. All detections should appear in main app history

### Test Background Operation

1. Start sensor listening
2. Put sensor app in background
3. Play sound
4. Verify detection still works (may vary by platform)

---

## Debug Endpoints

You can test backend endpoints directly:

```bash
# Check sensor pairing
curl "http://YOUR_BACKEND:3000/api/sensor/pairing?sensorId=SENSOR_ID"

# Get detection history
curl "http://YOUR_BACKEND:3000/api/sensor/history?mainAppUserId=USER_ID"

# List all registered sounds
curl "http://YOUR_BACKEND:3000/api/audio/fingerprints?userId=USER_ID"
```

---

## Need Help?

Check:
- Backend console logs for errors
- React Native/Expo logs for app errors
- Network connectivity between devices
- Backend URL configuration in both apps
