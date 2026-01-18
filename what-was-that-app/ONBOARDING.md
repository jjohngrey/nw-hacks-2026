# Onboarding Flow Documentation

## Overview

The app features a comprehensive 4-step onboarding wizard that guides users through setting up their sound alert system. The flow includes a welcome screen, 4 configuration steps, and a completion screen.

## Flow Structure

### Step 0: Welcome
- **Title**: "Set up your alerts"
- **Subtitle**: "We'll connect your sensor and customize how you get notified."
- **Actions**:
  - Primary button: "Get started" → Proceeds to Step 1
  - Secondary text button: "Skip for now" → Creates defaults and navigates to Home

### Step 1: Pair Sensor
- **Purpose**: Connect the physical sensor device
- **UI Elements**:
  - Sensor status card showing: Not connected / Connecting / Connected
  - "Pair sensor" button
  - Loading state for ~1.5s during simulated pairing
  - Error state: "Pairing failed" with "Try again" option
- **Validation**: Continue button disabled until connected (unless "Skip pairing" is clicked)
- **Storage**: Saves `sensorPaired: boolean`

### Step 2: Choose Sound Types
- **Purpose**: Select which sounds to monitor
- **Sections**:
  1. **Safety Alerts (Critical)**
     - Smoke/Fire Alarm (always ON, locked) ✓
     - Glass Breaking (toggle)
  2. **Daily Alerts**
     - Doorbell (toggle)
     - Baby Crying (toggle)
- **Helper Text**: "Critical alerts are designed to interrupt you when it matters."
- **Storage**: Saves `soundTypes` object with boolean flags

### Step 3: Alert Delivery
- **Purpose**: Configure how alerts are delivered
- **Options**:
  - Flashlight blinking (toggle)
  - Strong vibration (toggle)
  - Override silent mode (toggle)
- **Preview**: "Preview alert" button triggers:
  - Haptic pattern (using expo-haptics)
  - Full-screen modal preview UI with bright overlay
- **Storage**: Saves `delivery` settings

### Step 4: Emergency Contact
- **Purpose**: Add emergency contact for critical alerts
- **Form Fields**:
  - Name (optional)
  - Phone number (required if filling form, validated for 10+ digits)
- **Validation**: 
  - Phone required OR allow "Skip for now"
  - Basic phone format validation
- **Explanation**: "Used only for critical alerts if you choose to escalate."
- **Storage**: Saves `emergencyContact` object

### Step 5: Completion
- **Title**: "You're all set!"
- **Message**: Confirmation that setup is complete
- **Action**: "Go to Home" button
- **Storage**: Saves `onboardingComplete: true`

## Progress Indicator

- Displayed on Steps 1-4 (not on Welcome or Completion)
- Shows 4 dots representing the 4 main configuration steps
- Active step highlighted in purple (#6D5EF5)
- Inactive steps shown in dark gray (#2A2A35)
- Active dot expands to 24px width, inactive dots are 8px

## Technical Implementation

### File Structure

```
app/components/onboarding/
├── OnboardingFlow.tsx          # Main orchestrator component
├── WelcomeStep.tsx             # Step 0
├── PairSensorStep.tsx          # Step 1
├── ChooseSoundTypesStep.tsx    # Step 2
├── AlertDeliveryStep.tsx       # Step 3
├── EmergencyContactStep.tsx    # Step 4
└── CompletionStep.tsx          # Step 5

types/
└── onboarding.ts               # TypeScript types

utils/
└── onboarding-storage.ts       # AsyncStorage utilities
```

### Data Structure

```typescript
interface OnboardingData {
  onboardingComplete: boolean;
  sensorPaired: boolean;
  soundTypes: {
    smokeAlarm: boolean;      // Always true
    glassBreaking: boolean;
    doorbell: boolean;
    babyCrying: boolean;
  };
  delivery: {
    flashlight: boolean;
    vibration: boolean;
    overrideSilent: boolean;
  };
  emergencyContact: {
    name: string;
    phone: string;
  };
}
```

### Storage

- Uses `@react-native-async-storage/async-storage`
- Storage key: `onboarding_data`
- Data persists across app sessions
- Can be reset from Settings screen

### Integration with App.tsx

1. On app launch, checks onboarding status
2. If not complete, displays `OnboardingFlow`
3. If complete, displays main app screens
4. Loading state shown while checking status

## Safe Defaults

When user clicks "Skip for now" on Welcome screen:

```typescript
{
  onboardingComplete: true,
  sensorPaired: false,
  soundTypes: {
    smokeAlarm: true,       // Always enabled
    glassBreaking: true,
    doorbell: true,
    babyCrying: true,
  },
  delivery: {
    flashlight: true,
    vibration: true,
    overrideSilent: true,
  },
  emergencyContact: {
    name: '',
    phone: '',
  },
}
```

## Reset Functionality

Users can reset onboarding from Settings screen:
- "Reset onboarding" button with confirmation dialog
- Clears `onboarding_data` from AsyncStorage
- Requires app restart to show onboarding again

## Design System

### Colors
- Background: `#0B0B0F`
- Card background: `#15151C`
- Primary (purple): `#6D5EF5`
- Success (green): `#22C55E`
- Error (red): `#EF4444`
- Warning (amber): `#F59E0B`
- Text primary: `#FFFFFF`
- Text secondary: `#A0A0AA`

### Components
- Border radius: 16-18px
- Button padding: 16px vertical
- Progress dots: 8px (inactive) / 24px (active)
- Card padding: 16-20px

## Future Enhancements

- Actual Bluetooth pairing logic
- Real flashlight toggling in preview
- Integration with backend to save preferences
- Analytics to track completion rates
- A/B testing different onboarding flows

