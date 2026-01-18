import { Image } from 'expo-image';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link, useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">🎵 Audio Sensor</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🎤 Sound Listening App</ThemedText>
        <ThemedText>
          This app listens for incoming sounds and identifies them using audio fingerprinting.
          It works with your backend server to match sounds against saved audio patterns.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">📋 Setup Instructions</ThemedText>
        <ThemedText>
          <ThemedText type="defaultSemiBold">1. Start Backend Server{'\n'}</ThemedText>
          Make sure your backend server is running on your computer.{'\n\n'}
          <ThemedText type="defaultSemiBold">2. Configure Backend URL{'\n'}</ThemedText>
          Open <ThemedText type="defaultSemiBold">app/(tabs)/sensor.tsx</ThemedText> and update the{' '}
          <ThemedText type="defaultSemiBold">BACKEND_URL</ThemedText> with your computer's IP address.{'\n\n'}
          <ThemedText type="defaultSemiBold">3. Teach Sounds{'\n'}</ThemedText>
          Use the web app to teach the system some sounds first.{'\n\n'}
          <ThemedText type="defaultSemiBold">4. Start Listening{'\n'}</ThemedText>
          Go to the Listen tab to start identifying sounds!
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🚀 Quick Start</ThemedText>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(tabs)/sensor')}
        >
          <ThemedText style={styles.buttonText}>
            Go to Listen Screen →
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">💡 How It Works</ThemedText>
        <ThemedText>
          1. The app records audio using your phone's microphone{'\n'}
          2. Audio is sent to your backend server{'\n'}
          3. Server generates an audio fingerprint{'\n'}
          4. Fingerprint is compared against stored patterns{'\n'}
          5. Best match is returned with confidence score
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">📖 Documentation</ThemedText>
        <ThemedText>
          See <ThemedText type="defaultSemiBold">AUDIO_LISTENER_README.md</ThemedText> for complete
          setup instructions, troubleshooting, and configuration options.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 16,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
