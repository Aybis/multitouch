import React, { useRef, useState } from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

export type ActionType = 'attack' | 'dodge' | 'jump' | 'run';

interface ActionButtonsProps {
  onButtonPress?: (action: ActionType) => void;
  onButtonRelease?: (action: ActionType) => void;
}

interface ButtonConfig {
  type: ActionType;
  label: string;
  color: string;
  position: ViewStyle;
}

export default function ActionButtons({
  onButtonPress,
  onButtonRelease,
}: ActionButtonsProps) {
  const [pressedButtons, setPressedButtons] = useState<Set<ActionType>>(
    new Set(),
  );

  // Track active touches for each button
  const activeTouches = useRef<Map<string, ActionType>>(new Map());

  const buttons: ButtonConfig[] = [
    {
      type: 'attack',
      label: 'A',
      color: '#E74C3C',
      position: { right: 20, bottom: 80 },
    },
    {
      type: 'dodge',
      label: 'D',
      color: '#F39C12',
      position: { right: 100, bottom: 20 },
    },
    {
      type: 'jump',
      label: 'J',
      color: '#2ECC71',
      position: { right: 100, bottom: 140 },
    },
    {
      type: 'run',
      label: 'R',
      color: '#9B59B6',
      position: { right: 180, bottom: 80 },
    },
  ];

  const handleButtonTouchStart = (
    buttonType: ActionType,
    event: GestureResponderEvent,
  ) => {
    const touch =
      event.nativeEvent.touches[event.nativeEvent.touches.length - 1];
    if (touch) {
      activeTouches.current.set(touch.identifier, buttonType);
      setPressedButtons((prev) => new Set(prev).add(buttonType));
      onButtonPress?.(buttonType);
      console.log(
        '🎯 Button pressed:',
        buttonType,
        'Touch ID:',
        touch.identifier,
      );
    }
  };

  const handleButtonTouchEnd = (
    buttonType: ActionType,
    event: GestureResponderEvent,
  ) => {
    // Check if any of the ended touches belong to this button
    const changedTouches = event.nativeEvent.changedTouches;
    for (let i = 0; i < changedTouches.length; i++) {
      const touch = changedTouches[i];
      if (activeTouches.current.get(touch.identifier) === buttonType) {
        activeTouches.current.delete(touch.identifier);
        setPressedButtons((prev) => {
          const newSet = new Set(prev);
          newSet.delete(buttonType);
          return newSet;
        });
        onButtonRelease?.(buttonType);
        console.log(
          '🎯 Button released:',
          buttonType,
          'Touch ID:',
          touch.identifier,
        );
        break;
      }
    }
  };

  return (
    <View style={styles.container}>
      {buttons.map((button) => {
        const isPressed = pressedButtons.has(button.type);
        return (
          <View
            key={button.type}
            onTouchStart={(e) => handleButtonTouchStart(button.type, e)}
            onTouchEnd={(e) => handleButtonTouchEnd(button.type, e)}
            onTouchCancel={(e) => handleButtonTouchEnd(button.type, e)}
            style={[
              styles.button,
              button.position,
              {
                backgroundColor: isPressed ? button.color : `${button.color}CC`, // Add alpha for transparency
                transform: [{ scale: isPressed ? 0.9 : 1 }],
                shadowOpacity: isPressed ? 0.5 : 0.3,
              },
            ]}
          >
            <Text style={styles.buttonLabel}>{button.label}</Text>
            <Text style={styles.buttonText}>
              {button.type.charAt(0).toUpperCase() + button.type.slice(1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 220,
    height: 220,
    zIndex: 102,
    elevation: 102,
  },
  button: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  buttonLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
