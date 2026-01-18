import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Modal } from "react-native";
import { Plus, X } from "lucide-react-native";
import { OnboardingData } from "../../../types/onboarding";
import TeachSoundScreen from "../TeachSoundScreen";
import * as FileSystem from "expo-file-system/legacy";

interface ChooseSoundTypesStepProps {
  soundTypes: OnboardingData["soundTypes"];
  onSoundTypesChange: (soundTypes: OnboardingData["soundTypes"]) => void;
  customSounds?: OnboardingData["customSounds"];
  onCustomSoundsChange?: (sounds: OnboardingData["customSounds"]) => void;
  onNext: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

export default function ChooseSoundTypesStep({
  soundTypes,
  onSoundTypesChange,
  customSounds: initialCustomSounds = [],
  onCustomSoundsChange,
  onNext,
  onBack,
  showBack,
}: ChooseSoundTypesStepProps) {
  const [showRecorder, setShowRecorder] = useState(false);
  const [customSounds, setCustomSounds] = useState<OnboardingData["customSounds"]>(initialCustomSounds);

  const toggleSound = (key: keyof OnboardingData["soundTypes"]) => {
    if (key === "smokeAlarm") return; // Locked, always on
    onSoundTypesChange({
      ...soundTypes,
      [key]: !soundTypes[key],
    });
  };

  const handleAddCustomSound = async (soundName: string, audioId: string, audioUri: string) => {
    try {
      // Copy the audio file to a permanent location to prevent deletion
      const permanentDir = `${FileSystem.documentDirectory}audio/`;
      
      // Create directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(permanentDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
      }
      
      // Copy file with unique name
      const fileExtension = audioUri.split('.').pop() || 'm4a';
      const permanentUri = `${permanentDir}${audioId}-${Date.now()}.${fileExtension}`;
      await FileSystem.copyAsync({
        from: audioUri,
        to: permanentUri,
      });
      
      console.log(`📁 Copied audio file to permanent location: ${permanentUri}`);
      
      // Store the permanent URI instead of the temp one
      const updated = [...customSounds, { name: soundName, audioId, audioUri: permanentUri }];
      setCustomSounds(updated);
      if (onCustomSoundsChange) {
        onCustomSoundsChange(updated);
      }
      setShowRecorder(false);
    } catch (error) {
      console.error('Failed to save audio file:', error);
      // Still save even if copy fails - backend has the audio
      const updated = [...customSounds, { name: soundName, audioId, audioUri }];
      setCustomSounds(updated);
      if (onCustomSoundsChange) {
        onCustomSoundsChange(updated);
      }
      setShowRecorder(false);
    }
  };

  const handleRemoveCustomSound = (index: number) => {
    const updated = customSounds.filter((_, i) => i !== index);
    setCustomSounds(updated);
    if (onCustomSoundsChange) {
      onCustomSoundsChange(updated);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.title}>Choose Sound Types</Text>
        <Text style={styles.subtitle}>
          Select which sounds you'd like to be notified about.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Alerts (Critical)</Text>
          <Text style={styles.helperText}>
            Critical alerts are designed to interrupt you when it matters.
          </Text>

          <View style={styles.soundItem}>
            <View style={styles.soundItemLeft}>
              <Text style={styles.soundLabel}>Smoke/Fire Alarm</Text>
              <Text style={styles.lockedText}>Always ON (locked)</Text>
            </View>
            <View style={[styles.switchContainer, { opacity: 0.5 }]}>
              <Switch
                value={true}
                disabled={true}
                trackColor={{ false: "#2A2A35", true: "#6D5EF5" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.soundItem}>
            <View style={styles.soundItemLeft}>
              <Text style={styles.soundLabel}>Glass Breaking</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={soundTypes.glassBreaking}
                onValueChange={() => toggleSound("glassBreaking")}
                trackColor={{ false: "#2A2A35", true: "#6D5EF5" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Alerts</Text>

          <View style={styles.soundItem}>
            <View style={styles.soundItemLeft}>
              <Text style={styles.soundLabel}>Doorbell</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={soundTypes.doorbell}
                onValueChange={() => toggleSound("doorbell")}
                trackColor={{ false: "#2A2A35", true: "#6D5EF5" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.soundItem}>
            <View style={styles.soundItemLeft}>
              <Text style={styles.soundLabel}>Baby Crying</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={soundTypes.babyCrying}
                onValueChange={() => toggleSound("babyCrying")}
                trackColor={{ false: "#2A2A35", true: "#6D5EF5" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Custom Sounds Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Sounds</Text>
          <Text style={styles.helperText}>
            Record your own sounds to detect specific alerts unique to your environment.
          </Text>

          {customSounds.map((sound, index) => (
            <View key={index} style={styles.soundItem}>
              <View style={styles.soundItemLeft}>
                <Text style={styles.soundLabel}>{sound.name}</Text>
                <Text style={styles.customBadge}>Custom</Text>
              </View>
              <Pressable onPress={() => handleRemoveCustomSound(index)} hitSlop={10}>
                <X size={20} color="#EF4444" />
              </Pressable>
            </View>
          ))}

          <Pressable
            onPress={() => setShowRecorder(true)}
            style={({ pressed }) => [
              styles.addButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Plus size={20} color="#6D5EF5" />
            <Text style={styles.addButtonText}>Add custom sound</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [
            styles.continueBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </Pressable>
      </View>

      <Modal
        visible={showRecorder}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowRecorder(false)}
      >
        <TeachSoundScreen
          onClose={() => setShowRecorder(false)}
          onSave={handleAddCustomSound}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0B0B0F",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#A0A0AA",
    marginBottom: 32,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: "#A0A0AA",
    marginBottom: 16,
    lineHeight: 20,
  },
  soundItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#15151C",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  soundItemLeft: {
    flex: 1,
  },
  soundLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  lockedText: {
    fontSize: 12,
    color: "#A0A0AA",
    fontStyle: "italic",
  },
  switchContainer: {
    marginLeft: 16,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "#0B0B0F",
    gap: 12,
  },
  continueBtn: {
    backgroundColor: "#6D5EF5",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  customBadge: {
    fontSize: 12,
    color: "#6D5EF5",
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#15151C",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: "#6D5EF5",
    borderStyle: "dashed",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6D5EF5",
  },
});

