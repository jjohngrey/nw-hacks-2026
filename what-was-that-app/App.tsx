import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import Constants from "expo-constants";

import HomeScreen from "./app/components/HomeScreen";
import SavedSoundsScreen from "./app/components/SavedSoundsScreen";
import TeachSoundScreen from "./app/components/TeachSoundScreen";
import EventHistoryScreen from "./app/components/EventHistoryScreen";
import SettingsScreen from "./app/components/SettingsScreen";
import BottomNav from "./app/components/BottomNav";
import { useNotifications } from "./hooks/use-notifications";

export type Screen = "home" | "sounds" | "history" | "settings" | "teach";

export interface SavedSound {
  id: string;
  label: string;
  dateAdded: string;
  timesDetected: number;
  enabled: boolean;
  audioData: string;
  audioUri?: string; // Local URI for playback
}

// Get backend URL
const PRODUCTION_BACKEND = 'http://155.138.215.227:3000';

const getBackendUrl = () => {
  if (PRODUCTION_BACKEND) {
    return PRODUCTION_BACKEND;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:3000`;
  }
  return "http://localhost:3000";
};

export default function App() {
  // Setup push notifications
  const { expoPushToken, userId } = useNotifications();
  
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [savedSounds, setSavedSounds] = useState<SavedSound[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch fingerprints from backend
  const fetchFingerprints = async () => {
    if (!userId) {
      console.log('No userId yet, skipping fetch');
      return;
    }

    try {
      setIsLoading(true);
      const backendUrl = getBackendUrl();
      console.log('📥 Fetching fingerprints for user:', userId);

      const response = await axios.get(`${backendUrl}/api/audio/fingerprints`, {
        params: { userId }
      });

      if (response.data.success) {
        const fingerprints = response.data.fingerprints;
        console.log(`✅ Fetched ${fingerprints.length} fingerprints`);

        // Transform backend data to SavedSound format
        const sounds: SavedSound[] = fingerprints.map((fp: any) => ({
          id: fp.audioId,
          label: fp.audioId, // Use audioId as label (or fetch from metadata if you store it)
          dateAdded: fp.timestamp ? new Date(fp.timestamp).toLocaleDateString() : 'Unknown',
          timesDetected: 0, // Could track this in backend
          enabled: true,
          audioData: fp.audioId,
          audioUri: undefined, // Not stored in backend
        }));

        setSavedSounds(sounds);
      }
    } catch (error: any) {
      console.error('❌ Error fetching fingerprints:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch fingerprints when userId is available
  useEffect(() => {
    if (userId) {
      fetchFingerprints();
    }
  }, [userId]);

  // Refresh fingerprints when navigating to sounds screen
  useEffect(() => {
    if (currentScreen === 'sounds' && userId) {
      fetchFingerprints();
    }
  }, [currentScreen]);

  const handleSaveSound = (label: string, audioData: string, audioUri: string) => {
    const newSound: SavedSound = {
      id: Date.now().toString(),
      label,
      dateAdded: "Just now",
      timesDetected: 0,
      enabled: true,
      audioData,
      audioUri, 
    };
    setSavedSounds((prev) => [newSound, ...prev]);
    
    // Refresh from backend to get the actual stored data
    setTimeout(() => fetchFingerprints(), 1000);
  };

  const handleToggleSound = (id: string) => {
    setSavedSounds((prev) =>
      prev.map((sound) =>
        sound.id === id ? { ...sound, enabled: !sound.enabled } : sound
      )
    );
  };

  const handleDeleteSound = async (id: string) => {
    try {
      const backendUrl = getBackendUrl();
      console.log('🗑️ Deleting fingerprint:', id);

      // Optimistically remove from UI
      setSavedSounds((prev) => prev.filter((sound) => sound.id !== id));

      // Delete from backend
      const response = await axios.delete(`${backendUrl}/api/audio/fingerprint/${id}`);
      
      if (response.data.success) {
        console.log('✅ Deleted from backend');
      }
    } catch (error: any) {
      console.error('❌ Error deleting fingerprint:', error.message);
      // Refresh to restore if delete failed
      fetchFingerprints();
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return (
          <HomeScreen
            onTeachSound={() => setCurrentScreen("teach")}
            onViewHistory={() => setCurrentScreen("history")}
          />
        );

      case "sounds":
        return (
          <SavedSoundsScreen
            sounds={savedSounds}
            onToggleSound={handleToggleSound}
            onDeleteSound={handleDeleteSound}
            onTeachSound={() => setCurrentScreen("teach")}
          />
        );

      case "teach":
        return (
          <TeachSoundScreen
            onClose={() => setCurrentScreen("home")}
            onSave={handleSaveSound}
          />
        );

      case "history":
        return <EventHistoryScreen />;

      case "settings":
        return <SettingsScreen />;

      default:
        return (
          <HomeScreen
            onTeachSound={() => setCurrentScreen("teach")}
            onViewHistory={() => setCurrentScreen("history")}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Main content */}
          <View style={styles.body}>{renderScreen()}</View>

          {/* Bottom nav */}
          {currentScreen !== "teach" && (
            <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0F" },
  container: { flex: 1, backgroundColor: "#0B0B0F" },
  body: {
    flex: 1,
    // leaves space so content doesn't go behind the BottomNav
    paddingBottom: 72,
  },
});
