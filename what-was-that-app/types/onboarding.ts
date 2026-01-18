// Onboarding data types
export interface OnboardingData {
  onboardingComplete: boolean;
  sensorPaired: boolean;
  soundTypes: {
    smokeAlarm: boolean; // Always true, locked
    glassBreaking: boolean;
    doorbell: boolean;
    babyCrying: boolean;
  };
  customSounds: Array<{
    name: string;
    audioId: string;
    audioUri: string;
  }>; // Array of custom sound objects with full data
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

export const defaultOnboardingData: OnboardingData = {
  onboardingComplete: false,
  sensorPaired: false,
  soundTypes: {
    smokeAlarm: true, // Always on
    glassBreaking: true,
    doorbell: true,
    babyCrying: true,
  },
  customSounds: [],
  delivery: {
    flashlight: true,
    vibration: true,
    overrideSilent: true,
  },
  emergencyContact: {
    name: '',
    phone: '',
  },
};

