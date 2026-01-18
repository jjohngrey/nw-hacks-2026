import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingData, defaultOnboardingData } from "../types/onboarding";

const ONBOARDING_KEY = "onboarding_data";

export const loadOnboardingData = async (): Promise<OnboardingData> => {
  try {
    const data = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return defaultOnboardingData;
  } catch (error) {
    console.error("Error loading onboarding data:", error);
    return defaultOnboardingData;
  }
};

export const saveOnboardingData = async (data: OnboardingData): Promise<void> => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving onboarding data:", error);
  }
};

export const checkOnboardingComplete = async (): Promise<boolean> => {
  try {
    const data = await loadOnboardingData();
    return data.onboardingComplete;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false;
  }
};

