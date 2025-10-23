import ActionButtons, { ActionType } from '@/components/game/action-buttons';
import VirtualJoystick from '@/components/game/virtual-joystick';

import { useNavigation } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function GameScreen() {
  const navigation = useNavigation();
  const [joystickData, setJoystickData] = useState({
    x: 0,
    y: 0,
    angle: 0,
    distance: 0,
  });
  const [activeButtons, setActiveButtons] = useState<Set<ActionType>>(
    new Set(),
  );
  const [showTabBar, setShowTabBar] = useState(false);

  // Lock to landscape orientation when component mounts
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    // Cleanup: unlock orientation when leaving the screen
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Update tab bar visibility
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: showTabBar ? undefined : { display: 'none' },
    });
  }, [showTabBar, navigation]);

  const handleJoystickMove = (data: any) => {
    setJoystickData(data);
    // You can send this data to your WebView game
    console.log('Joystick:', data);
  };

  const handleJoystickRelease = () => {
    setJoystickData({ x: 0, y: 0, angle: 0, distance: 0 });
    console.log('Joystick released');
  };

  const handleButtonPress = (action: ActionType) => {
    setActiveButtons((prev) => new Set(prev).add(action));
    // You can send this action to your WebView game
    console.log('Button pressed:', action);
  };

  const handleButtonRelease = (action: ActionType) => {
    setActiveButtons((prev) => {
      const newSet = new Set(prev);
      newSet.delete(action);
      return newSet;
    });
    console.log('Button released:', action);
  };

  // Sample game URL - replace with your actual game
  const gameUrl = '';

  return (
    <View style={styles.container}>
      {/* WebView Game */}
      <WebView
        source={{ uri: gameUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        androidLayerType="hardware"
        androidHardwareAccelerationDisabled={false}
        nestedScrollEnabled={false}
        scrollEnabled={false}
        onMessage={(event) => {
          // Handle messages from WebView if needed
          console.log('Message from game:', event.nativeEvent.data);
        }}
      />

      {/* Menu Button to show/hide tab bar */}
      <Pressable
        style={styles.menuButton}
        onPress={() => setShowTabBar(!showTabBar)}
      >
        <Text style={styles.menuIcon}>☰</Text>
      </Pressable>

      {/* Debug Info Overlay (optional - remove in production) */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Joystick: X:{joystickData.x.toFixed(2)} Y:
          {joystickData.y.toFixed(2)}
        </Text>
        <Text style={styles.debugText}>
          Active: {Array.from(activeButtons).join(', ') || 'None'}
        </Text>
      </View>

      {/* Virtual Controls Overlay */}
      <View
        style={styles.controlsOverlay}
        pointerEvents="box-none"
        collapsable={false}
      >
        {/* Left: Joystick */}
        <View style={styles.joystickContainer} collapsable={false}>
          <VirtualJoystick
            onMove={handleJoystickMove}
            onRelease={handleJoystickRelease}
            size={140}
            color="#4A90E2"
          />
        </View>

        {/* Right: Action Buttons */}
        <ActionButtons
          onButtonPress={handleButtonPress}
          onButtonRelease={handleButtonRelease}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
    zIndex: 100,
    elevation: 100,
  },
  joystickContainer: {
    position: 'absolute',
    left: 30,
    bottom: 40,
    zIndex: 101,
    elevation: 101,
  },
  debugInfo: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    minWidth: 200,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  menuIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
});
