import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";

interface PairSensorStepProps {
  onNext: () => void;
  onBack?: () => void;
  showBack?: boolean;
  onSensorPaired: (paired: boolean) => void;
}

type SensorStatus = "not_connected" | "connecting" | "connected" | "error";

export default function PairSensorStep({ onNext, onBack, showBack, onSensorPaired }: PairSensorStepProps) {
  const [status, setStatus] = useState<SensorStatus>("not_connected");

  const handlePairSensor = () => {
    setStatus("connecting");
    
    // Simulate pairing process
    setTimeout(() => {
      // 90% success rate for demo
      const success = Math.random() > 0.1;
      if (success) {
        setStatus("connected");
        onSensorPaired(true);
      } else {
        setStatus("error");
        onSensorPaired(false);
      }
    }, 1500);
  };

  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "#22C55E";
      case "error":
        return "#EF4444";
      case "connecting":
        return "#F59E0B";
      default:
        return "#A0A0AA";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "connected":
        return "Connected";
      case "error":
        return "Pairing failed";
      case "connecting":
        return "Connecting...";
      default:
        return "Not connected";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Pair Sensor</Text>

        <View style={[styles.statusCard, { borderColor: getStatusColor() }]}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Sensor status</Text>
            {status === "connecting" && (
              <ActivityIndicator size="small" color="#F59E0B" />
            )}
          </View>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        {status === "not_connected" || status === "error" ? (
          <Pressable
            onPress={handlePairSensor}
            style={({ pressed }) => [
              styles.pairBtn,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={styles.pairBtnText}>
              {status === "error" ? "Try again" : "Pair sensor"}
            </Text>
          </Pressable>
        ) : null}

        {status === "error" && (
          <Text style={styles.errorText}>
            Make sure your sensor is turned on and nearby.
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          onPress={onNext}
          disabled={status !== "connected"}
          style={({ pressed }) => [
            styles.continueBtn,
            {
              opacity: status === "connected" ? (pressed ? 0.9 : 1) : 0.4,
              backgroundColor: status === "connected" ? "#6D5EF5" : "#2A2A35",
            },
          ]}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </Pressable>

        <Pressable onPress={onNext} style={styles.skipBtn}>
          <Text style={styles.skipBtnText}>Skip pairing</Text>
        </Pressable>
      </View>
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
    marginBottom: 32,
  },
  statusCard: {
    backgroundColor: "#15151C",
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 14,
    color: "#A0A0AA",
    fontWeight: "600",
  },
  statusText: {
    fontSize: 20,
    fontWeight: "700",
  },
  pairBtn: {
    backgroundColor: "#6D5EF5",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  pairBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  errorText: {
    color: "#EF4444",
    textAlign: "center",
    fontSize: 14,
  },
  buttonContainer: {
    gap: 12,
  },
  continueBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  skipBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  skipBtnText: {
    color: "#A0A0AA",
    fontWeight: "600",
    fontSize: 16,
  },
});

