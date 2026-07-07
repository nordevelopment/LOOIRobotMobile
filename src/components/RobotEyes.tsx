import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { EyeStateType } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const EYE_SIZE = 120;
const EYE_SPACING = 40;
const MAX_PUPIL_OFFSET = 25;

interface RobotEyesProps {
  eyeState: EyeStateType;
  speechText: string | null;
}

export function RobotEyes({ eyeState, speechText }: RobotEyesProps) {
  // Animation values
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const pupilOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const pupilScale = useRef(new Animated.Value(1)).current;
  const speechAnim = useRef(new Animated.Value(0)).current;

  // Refs for timers to avoid memory leaks
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to determine eye color by state
  const getEyeColor = (state: EyeStateType) => {
    switch (state) {
      case 'forward':
        return '#4CD964'; // Green - move forward
      case 'backward':
        return '#FFCC00'; // Yellow - move backward
      case 'stop':
        return '#FF3B30'; // Red - stop
      case 'thinking':
        return '#AF52DE'; // Purple - thinking
      default:
        return '#00F3FF'; // Default neon cyan
    }
  };

  // Blinking loop logic
  useEffect(() => {
    const triggerBlink = () => {
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.05,
          duration: 90,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(blinkAnim, {
          toValue: 1.0,
          duration: 110,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      const nextDelay = Math.random() * 5000 + 2500; // blink every 2.5 - 7.5 seconds
      blinkTimeoutRef.current = setTimeout(triggerBlink, nextDelay);
    };

    const startDelay = Math.random() * 3000 + 2000;
    blinkTimeoutRef.current = setTimeout(triggerBlink, startDelay);

    return () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, [blinkAnim]);

  // Pulse animation for pupils when thinking
  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation | null = null;

    if (eyeState === 'thinking') {
      pupilScale.setValue(1.0);
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pupilScale, {
            toValue: 1.25,
            duration: 650,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pupilScale, {
            toValue: 0.85,
            duration: 650,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      pulseAnimation.start();
    } else {
      Animated.spring(pupilScale, {
        toValue: 1.0,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }

    return () => {
      if (pulseAnimation) {
        pulseAnimation.stop();
      }
    };
  }, [eyeState, pupilScale]);

  // Speech bubble animation handler
  useEffect(() => {
    if (speechText) {
      Animated.timing(speechAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(speechAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [speechText, speechAnim]);

  // Update pupil position based on layout coordinates
  const updatePupils = (x: number, y: number) => {
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let targetX = dx;
    let targetY = dy;

    if (distance > MAX_PUPIL_OFFSET) {
      targetX = (dx / distance) * MAX_PUPIL_OFFSET;
      targetY = (dy / distance) * MAX_PUPIL_OFFSET;
    }

    Animated.spring(pupilOffset, {
      toValue: { x: targetX, y: targetY },
      useNativeDriver: Platform.OS !== 'web',
      friction: 7,
      tension: 50,
    }).start();
  };

  // Setup PanResponder for tracking touches
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        updatePupils(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderMove: (evt) => {
        updatePupils(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        Animated.spring(pupilOffset, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: Platform.OS !== 'web',
          friction: 6,
          tension: 40,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(pupilOffset, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: Platform.OS !== 'web',
          friction: 6,
          tension: 40,
        }).start();
      },
    })
  ).current;

  const eyeColor = getEyeColor(eyeState);

  const pupilStyle = {
    transform: [
      { translateX: pupilOffset.x },
      { translateY: pupilOffset.y },
      { scale: pupilScale },
    ],
  };

  return (
    <View style={styles.touchOverlay} {...panResponder.panHandlers}>
      {/* Speech bubble */}
      {speechText && (
        <Animated.View style={[styles.speechBubble, { opacity: speechAnim }]}>
          <Text style={styles.speechText}>{speechText}</Text>
          <View style={styles.speechArrow} />
        </Animated.View>
      )}

      {/* Eyes container */}
      <View style={styles.eyesContainer}>
        {/* Left eye */}
        <Animated.View style={[styles.eyeWrapper, { transform: [{ scaleY: blinkAnim }] }]}>
          <View style={[styles.eyeOutline, { borderColor: eyeColor }]}>
            <Animated.View style={[styles.pupil, pupilStyle, { backgroundColor: eyeColor }]}>
              <View style={styles.glare} />
            </Animated.View>
          </View>
        </Animated.View>

        {/* Right eye */}
        <Animated.View style={[styles.eyeWrapper, { transform: [{ scaleY: blinkAnim }] }]}>
          <View style={[styles.eyeOutline, { borderColor: eyeColor }]}>
            <Animated.View style={[styles.pupil, pupilStyle, { backgroundColor: eyeColor }]}>
              <View style={styles.glare} />
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  touchOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  speechBubble: {
    position: 'absolute',
    top: '18%',
    left: '12%',
    right: '12%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 12px rgba(255, 255, 255, 0.25)',
      },
      default: {
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
    zIndex: 10,
  },
  speechText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  speechArrow: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    marginLeft: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: 'transparent',
    borderRightWidth: 10,
    borderRightColor: 'transparent',
    borderTopWidth: 10,
    borderTopColor: '#ffffff',
  },
  eyesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  eyeWrapper: {
    marginHorizontal: EYE_SPACING / 2,
    width: EYE_SIZE,
    height: EYE_SIZE,
  },
  eyeOutline: {
    width: EYE_SIZE,
    height: EYE_SIZE,
    borderRadius: EYE_SIZE / 2,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  pupil: {
    width: EYE_SIZE * 0.55,
    height: EYE_SIZE * 0.55,
    borderRadius: (EYE_SIZE * 0.55) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glare: {
    width: EYE_SIZE * 0.14,
    height: EYE_SIZE * 0.14,
    borderRadius: (EYE_SIZE * 0.14) / 2,
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: '18%',
    right: '18%',
  },
});
