import React, { useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Platform,
  StyleSheet,
  View,
  findNodeHandle,
} from 'react-native';

interface JoystickData {
  x: number; // -1 to 1
  y: number; // -1 to 1
  angle: number; // 0 to 360
  distance: number; // 0 to 1
}

interface VirtualJoystickProps {
  onMove?: (data: JoystickData) => void;
  onRelease?: () => void;
  size?: number;
  color?: string;
}

export default function VirtualJoystick({
  onMove,
  onRelease,
  size = 120,
  color = '#4A90E2',
}: VirtualJoystickProps) {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const maxDistance = size / 2 - 20;

  // Track which touch is controlling this joystick
  const activeTouchId = useRef<string | null>(null);
  const startPosition = useRef({ x: 0, y: 0 });
  const viewRef = useRef<View>(null);

  const handleTouchStart = (event: GestureResponderEvent) => {
    // Only respond if we don't already have an active touch
    if (activeTouchId.current !== null) return;

    // CRITICAL FOR ANDROID: Tell parent views not to intercept our touches
    // This prevents the WebView from stealing touch events
    if (Platform.OS === 'android' && viewRef.current) {
      const node = findNodeHandle(viewRef.current);
      if (node) {
        // @ts-ignore - requestDisallowInterceptTouchEvent exists but not in types
        viewRef.current.setNativeProps?.({
          onStartShouldSetResponderCapture: () => true,
        });
      }
    }

    // Find the NEWEST touch (the one that just touched THIS component)
    // This might not be touches[0] if other areas are already touched
    const allTouches = event.nativeEvent.touches;
    const touch = allTouches[allTouches.length - 1]; // Get the most recent touch

    if (touch) {
      activeTouchId.current = touch.identifier;
      startPosition.current = {
        x: touch.pageX,
        y: touch.pageY,
      };
      setIsActive(true);
      console.log(
        '🕹️ Joystick started, touch ID:',
        touch.identifier,
        'Total touches:',
        allTouches.length,
      );
    }
  };

  const handleTouchMove = (event: GestureResponderEvent) => {
    // Only process if we have an active touch
    if (activeTouchId.current === null) return;

    // Find our specific touch among all active touches
    const ourTouch = Array.from(event.nativeEvent.touches).find(
      (t: any) => t.identifier === activeTouchId.current,
    );

    // If our touch isn't in the list anymore, ignore this event
    if (!ourTouch) return;

    // Calculate movement from start position
    const dx = ourTouch.pageX - startPosition.current.x;
    const dy = ourTouch.pageY - startPosition.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Limit movement to joystick boundary
    let finalX = dx;
    let finalY = dy;

    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx);
      finalX = Math.cos(angle) * maxDistance;
      finalY = Math.sin(angle) * maxDistance;
    }

    // Update visual position
    setPosition({ x: finalX, y: finalY });

    // Calculate normalized values for game logic
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const normalizedX = Math.max(-1, Math.min(1, dx / maxDistance));
    const normalizedY = Math.max(-1, Math.min(1, dy / maxDistance));

    // Send data to parent
    onMove?.({
      x: normalizedX,
      y: normalizedY,
      angle,
      distance: normalizedDistance,
    });
  };

  const handleTouchEnd = (event: GestureResponderEvent) => {
    // Check if OUR touch ended (not some other touch)
    const ourTouchEnded = Array.from(event.nativeEvent.changedTouches).some(
      (t: any) => t.identifier === activeTouchId.current,
    );

    if (ourTouchEnded) {
      console.log('🕹️ Joystick released, touch ID:', activeTouchId.current);
      activeTouchId.current = null;
      setIsActive(false);
      setPosition({ x: 0, y: 0 });
      onRelease?.();
    }
  };

  return (
    <View
      ref={viewRef}
      style={[styles.container, { width: size, height: size }]}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Outer circle (background) */}
      <View
        style={[
          styles.outerCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isActive
              ? 'rgba(74, 144, 226, 0.3)'
              : 'rgba(74, 144, 226, 0.2)',
            borderColor: isActive
              ? 'rgba(74, 144, 226, 0.6)'
              : 'rgba(74, 144, 226, 0.4)',
          },
        ]}
      />

      {/* Inner joystick (movable) */}
      <View
        style={[
          styles.innerCircle,
          {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: (size * 0.4) / 2,
            backgroundColor: isActive ? color : 'rgba(74, 144, 226, 0.7)',
            transform: [{ translateX: position.x }, { translateY: position.y }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  outerCircle: {
    position: 'absolute',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});
