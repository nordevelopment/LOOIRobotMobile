import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

interface UseSpeechProps {
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (transcript: string) => void;
  onError?: (errorMsg: string) => void;
}

export function useSpeech({ onStart, onEnd, onResult, onError }: UseSpeechProps) {
  const [isListening, setIsListening] = useState(false);

  // Register native event listeners
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    onStart?.();
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    onEnd?.();
  });

  useSpeechRecognitionEvent('result', (e) => {
    if (e.results && e.results.length > 0) {
      const text = e.results[0]?.transcript;
      if (text) {
        onResult?.(text);
      }
    }
  });

  useSpeechRecognitionEvent('error', (e) => {
    setIsListening(false);
    onError?.(e.error || JSON.stringify(e));
  });

  const startListening = useCallback(async () => {
    if (Platform.OS === 'web') {
      onError?.('Speech recognition is not supported on web platform.');
      return;
    }

    try {
      const permissionResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permissionResult.granted) {
        onError?.('Microphone permissions were denied.');
        return;
      }

      const isAvailable = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!isAvailable) {
        onError?.('Speech recognition is not available on this device.');
        return;
      }

      await ExpoSpeechRecognitionModule.start({
        lang: 'ru-RU',
        interimResults: false,
      });
    } catch (err: any) {
      onError?.(err.message || String(err));
    }
  }, [onError]);

  const stopListening = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
    } catch (err: any) {
      onError?.(err.message || String(err));
    }
  }, [onError]);

  return {
    isListening,
    startListening,
    stopListening,
  };
}
