import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomControlBarProps {
  prompt: string;
  setPrompt: (text: string) => void;
  isLoading: boolean;
  isListening: boolean;
  isManualVisible: boolean;
  setIsManualVisible: (visible: boolean) => void;
  onOpenConfig: () => void;
  onSendPrompt: () => void;
  startListening: () => void;
  stopListening: () => void;
  eyeColor: string;
}

export function BottomControlBar({
  prompt,
  setPrompt,
  isLoading,
  isListening,
  isManualVisible,
  setIsManualVisible,
  onOpenConfig,
  onSendPrompt,
  startListening,
  stopListening,
  eyeColor,
}: BottomControlBarProps) {
  const insets = useSafeAreaInsets();

  // Добавляем 15 пикселей отступа, о которых просил пользователь, и Safe Area внизу
  const dynamicPaddingBottom = Math.max(insets.bottom, 0) + 15;
  const dynamicPaddingLeft = Math.max(insets.left, 15);
  const dynamicPaddingRight = Math.max(insets.right, 15);

  return (
    <View style={[
      styles.bottomControlBar,
      {
        paddingBottom: dynamicPaddingBottom,
        paddingLeft: dynamicPaddingLeft,
        paddingRight: dynamicPaddingRight,
      }
    ]}>
      {/* Toggle manual remote panel */}
      <TouchableOpacity
        style={[styles.barIconButton, isManualVisible && styles.barIconButtonActive]}
        onPress={() => setIsManualVisible(!isManualVisible)}
        activeOpacity={0.7}
      >
        <Text style={styles.barIconText}>🕹</Text>
      </TouchableOpacity>

      {/* Main text & mic input bar */}
      <View style={[styles.promptInputContainer, { borderColor: eyeColor }]}>
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={styles.micButton}
            onPressIn={startListening}
            onPressOut={stopListening}
            activeOpacity={0.6}
          >
            <Text style={[styles.micIconText, isListening && { color: '#FF3B30' }]}>
              {isListening ? '🛑' : '🎙'}
            </Text>
          </TouchableOpacity>
        )}

        <TextInput
          style={styles.mainPromptInput}
          placeholder={isListening ? "I'm listening to you..." : "Ask or command the robot..."}
          placeholderTextColor="#555"
          value={prompt}
          onChangeText={setPrompt}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="sentences"
          textContentType="none"
          importantForAutofill="no"
        />

        {isLoading ? (
          <ActivityIndicator size="small" color={eyeColor} style={{ marginRight: 8 }} />
        ) : (
          <TouchableOpacity
            style={styles.mainSendButton}
            onPress={onSendPrompt}
            activeOpacity={0.7}
          >
            <Text style={[styles.mainSendButtonText, { color: eyeColor }]}>➔</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Settings configuration trigger */}
      <TouchableOpacity
        style={styles.barIconButton}
        onPress={onOpenConfig}
        activeOpacity={0.7}
      >
        <Text style={styles.barIconText}>⚙</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    paddingTop: 10,
    backgroundColor: '#0c0c0e',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    width: '100%',
  },
  barIconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1c1c1e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3a3a3c',
  },
  barIconButtonActive: {
    backgroundColor: 'rgba(0, 243, 255, 0.15)',
    borderColor: '#00F3FF',
  },
  barIconText: {
    fontSize: 22,
    color: '#ffffff',
  },
  promptInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderWidth: 1.5,
    borderRadius: 23,
    marginHorizontal: 10,
    height: 46,
    paddingHorizontal: 12,
  },
  mainPromptInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 8,
  },
  micButton: {
    padding: 6,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIconText: {
    fontSize: 18,
    color: '#8e8e93',
  },
  mainSendButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainSendButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
