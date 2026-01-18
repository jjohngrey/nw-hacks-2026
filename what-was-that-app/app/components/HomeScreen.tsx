import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import axios from "axios";

interface HomeScreenProps {
  onTeachSound: () => void;
  onViewHistory: () => void;
}

// Get backend URL
const PRODUCTION_BACKEND = 'http://155.138.215.227:3000'; // Vultr production backend

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

export default function HomeScreen({ onTeachSound, onViewHistory }: HomeScreenProps) {
  console.log('🏠 HomeScreen component called');
  
  const [listening, setListening] = useState(false);
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  useEffect(() => {
    console.log('🏠 HomeScreen mounted');
    return () => {
      console.log('🏠 HomeScreen unmounted');
    };
  }, []);

  const sendTestNotification = async () => {
    try {
      setIsSendingNotif(true);
      
      // Get userId from storage
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'User ID not found. Please restart the app.');
        return;
      }

      const backendUrl = getBackendUrl();
      console.log('📤 Sending test notification to:', backendUrl);

      const response = await axios.post(`${backendUrl}/api/notifications/test`, {
        userId,
        title: 'Test Notification 🔔',
        body: 'This is a test notification from What Was That!',
      });

      if (response.data.success) {
        Alert.alert('Success! 🎉', 'Test notification sent! Check your notifications.');
      } else {
        Alert.alert('Error', response.data.error || 'Failed to send notification');
      }
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      Alert.alert(
        'Error',
        `Failed to send test notification: ${error.message || 'Unknown error'}`
      );
    } finally {
      setIsSendingNotif(false);
    }
  };

  console.log('🏠 HomeScreen rendering JSX');
  
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>
          {listening ? "Listening..." : "Tap to start listening"}
        </Text>
      </View>

      <Pressable
        onPress={() => setListening((prev) => !prev)}
        style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
      >
        <Text style={styles.cardTitle}>Live</Text>
        <Text style={styles.cardBody}>
          {listening ? "Listening for sounds..." : "Sound detection is off."}
        </Text>
      </Pressable>

      <View style={{ marginTop: 16, gap: 10 }}>
        <Pressable onPress={onTeachSound} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Teach a new sound</Text>
        </Pressable>

        <Pressable onPress={onViewHistory} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>View event history</Text>
        </Pressable>

        <Pressable 
          onPress={sendTestNotification} 
          style={styles.testBtn}
          disabled={isSendingNotif}
        >
          <Text style={styles.testBtnText}>
            {isSendingNotif ? 'Sending...' : 'Send Test Notification'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0B0B0F" },
  title: { fontSize: 28, fontWeight: "700", color: "#fff" },
  subtitle: { marginTop: 8, color: "#A0A0AA" },
  card: {
    marginTop: 16,
    backgroundColor: "#15151C",
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: { color: "#fff", fontWeight: "600", fontSize: 16 },
  cardBody: { marginTop: 6, color: "#A0A0AA" },

  primaryBtn: {
    backgroundColor: "#6D5EF5",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "700" },

  secondaryBtn: {
    backgroundColor: "#15151C",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: "white", fontWeight: "700" },

  testBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  testBtnText: { color: "white", fontWeight: "700" },
});
