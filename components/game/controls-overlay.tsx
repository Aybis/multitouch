import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type ActionType = 'attack' | 'dodge' | 'jump' | 'run';

interface JoystickData {
  x: number; // -1..1
  y: number; // -1..1 (positive down)
  angle: number; // 0..360
  distance: number; // 0..1
}

interface ControlsOverlayProps {
  joystickSize?: number;
  onJoystickMove?: (data: JoystickData) => void;
  onJoystickRelease?: () => void;
  onButtonPress?: (action: ActionType) => void;
  onButtonRelease?: (action: ActionType) => void;
}

// A single, top-most touch handler that routes multitouch to joystick and buttons.
export default function ControlsOverlay({
  joystickSize = 140,
  onJoystickMove,
  onJoystickRelease,
  onButtonPress,
  onButtonRelease,
}: ControlsOverlayProps) {
  // Track actual overlay size from layout (more reliable than Dimensions on iOS with safe areas)
  const initialSize = useMemo(() => Dimensions.get('window'), []);
  const [overlaySize, setOverlaySize] = useState({
    width: initialSize.width,
    height: initialSize.height,
  });
  const maxDistance = joystickSize / 2 - 20;

  // Joystick state
  const [joyPos, setJoyPos] = useState({ x: 0, y: 0 });
  const [joyActive, setJoyActive] = useState(false);
  const joystickTouchId = useRef<number | string | null>(null);

  // Buttons state
  const [pressedButtons, setPressedButtons] = useState<Set<ActionType>>(
    new Set(),
  );
  const buttonTouches = useRef<Map<number | string, ActionType>>(new Map());

  // Layout constants (match previous UI)
  const joystickLeft = 30;
  const joystickBottom = 40;
  const joystickCenter = {
    x: joystickLeft + joystickSize / 2,
    y: overlaySize.height - (joystickBottom + joystickSize / 2),
  };

  // Buttons layout (match previous absolute positions)
  const buttonRadius = 30;
  const buttons = [
    {
      type: 'attack' as ActionType,
      label: 'A',
      color: '#E74C3C',
      right: 20,
      bottom: 80,
    },
    {
      type: 'dodge' as ActionType,
      label: 'D',
      color: '#F39C12',
      right: 100,
      bottom: 20,
    },
    {
      type: 'jump' as ActionType,
      label: 'J',
      color: '#2ECC71',
      right: 100,
      bottom: 140,
    },
    {
      type: 'run' as ActionType,
      label: 'R',
      color: '#9B59B6',
      right: 180,
      bottom: 80,
    },
  ];

  const getButtonCenter = (b: { right: number; bottom: number }) => ({
    x: overlaySize.width - (b.right + buttonRadius),
    y: overlaySize.height - (b.bottom + buttonRadius),
  });

  const hitTestJoystick = (x: number, y: number) => {
    const dx = x - joystickCenter.x;
    const dy = y - joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= joystickSize / 2;
  };

  const hitTestButtons = (x: number, y: number): ActionType | null => {
    for (const b of buttons) {
      const c = getButtonCenter(b);
      const dx = x - c.x;
      const dy = y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= buttonRadius) return b.type;
    }
    return null;
  };

  const startJoystickWithTouch = (
    id: number | string,
    x: number,
    y: number,
  ) => {
    joystickTouchId.current = id;
    setJoyActive(true);
    // Update position immediately
    moveJoystickWithTouch(x, y);
    if (Platform.OS === 'android') {
      console.log('🕹️ ANDROID joystick start id:', id, 'x,y:', x, y);
    }
  };

  const moveJoystickWithTouch = (x: number, y: number) => {
    const dx = x - joystickCenter.x;
    const dy = y - joystickCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let finalX = dx;
    let finalY = dy;
    if (distance > maxDistance) {
      const angleRad = Math.atan2(dy, dx);
      finalX = Math.cos(angleRad) * maxDistance;
      finalY = Math.sin(angleRad) * maxDistance;
    }
    setJoyPos({ x: finalX, y: finalY });

    const normalizedDistance = Math.min(distance / maxDistance, 1);
    const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const normalizedX = Math.max(-1, Math.min(1, dx / maxDistance));
    const normalizedY = Math.max(-1, Math.min(1, dy / maxDistance));

    onJoystickMove?.({
      x: normalizedX,
      y: normalizedY,
      angle,
      distance: normalizedDistance,
    });
  };

  const releaseJoystick = () => {
    if (!joyActive) return;
    joystickTouchId.current = null;
    setJoyActive(false);
    setJoyPos({ x: 0, y: 0 });
    onJoystickRelease?.();
  };

  const handleTouchStart = (e: GestureResponderEvent) => {
    const changed = e.nativeEvent.changedTouches as any[];
    for (const t of changed) {
      const id = t.identifier;
      const x = t.pageX;
      const y = t.pageY;

      // If joystick not claimed and touch hits joystick area, claim it
      if (joystickTouchId.current == null && hitTestJoystick(x, y)) {
        startJoystickWithTouch(id, x, y);
        continue;
      }

      // Otherwise try buttons
      const btn = hitTestButtons(x, y);
      if (btn) {
        buttonTouches.current.set(id, btn);
        setPressedButtons((prev) => {
          const ns = new Set(prev);
          ns.add(btn);
          return ns;
        });
        onButtonPress?.(btn);
        if (Platform.OS === 'android') {
          console.log('🎯 ANDROID button press', btn, 'id:', id);
        }
      }
    }
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    const moved = e.nativeEvent.changedTouches as any[];
    for (const t of moved) {
      const id = t.identifier;
      if (id === joystickTouchId.current) {
        moveJoystickWithTouch(t.pageX, t.pageY);
      }
      // Buttons don't need move handling
    }
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    const ended = e.nativeEvent.changedTouches as any[];
    for (const t of ended) {
      const id = t.identifier;
      if (id === joystickTouchId.current) {
        if (Platform.OS === 'android')
          console.log('🕹️ ANDROID joystick end id:', id);
        releaseJoystick();
      }
      const btn = buttonTouches.current.get(id);
      if (btn) {
        buttonTouches.current.delete(id);
        setPressedButtons((prev) => {
          const ns = new Set(prev);
          ns.delete(btn);
          return ns;
        });
        onButtonRelease?.(btn);
        if (Platform.OS === 'android')
          console.log('🎯 ANDROID button end', btn, 'id:', id);
      }
    }
  };

  return (
    <View
      style={styles.overlay}
      // Single responder for all touches
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width && height) {
          setOverlaySize({ width, height });
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      // Ensure this overlay itself receives touches on all platforms
      pointerEvents="auto"
    >
      {/* Joystick visuals */}
      <View
        style={[
          styles.joystickContainer,
          {
            left: joystickLeft,
            bottom: joystickBottom,
            width: joystickSize,
            height: joystickSize,
          },
        ]}
      >
        {/* Outer circle */}
        <View
          style={[
            styles.outerCircle,
            {
              width: joystickSize,
              height: joystickSize,
              borderRadius: joystickSize / 2,
              backgroundColor: joyActive
                ? 'rgba(74, 144, 226, 0.3)'
                : 'rgba(74, 144, 226, 0.2)',
              borderColor: joyActive
                ? 'rgba(74, 144, 226, 0.6)'
                : 'rgba(74, 144, 226, 0.4)',
            },
          ]}
        />

        {/* Inner knob */}
        <View
          style={[
            styles.innerKnob,
            {
              transform: [{ translateX: joyPos.x }, { translateY: joyPos.y }],
            },
          ]}
        />
      </View>

      {/* Buttons visuals */}
      <View style={styles.buttonsContainer} pointerEvents="none">
        {buttons.map((b) => {
          const isPressed = pressedButtons.has(b.type);
          const stylePos = {
            right: b.right,
            bottom: b.bottom,
          } as const;
          return (
            <View
              key={b.type}
              style={[
                styles.button,
                stylePos,
                { backgroundColor: isPressed ? b.color : `${b.color}CC` },
              ]}
            >
              <Text style={styles.buttonLabel}>{b.label}</Text>
              <Text style={styles.buttonText}>{b.type.toUpperCase()}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  joystickContainer: {
    position: 'absolute',
    zIndex: 2,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(74, 144, 226, 0.4)',
  },
  innerKnob: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    opacity: 0.9,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  buttonsContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 220,
    height: 220,
    zIndex: 3,
    elevation: 3,
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
  },
});
