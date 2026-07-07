import React, { useState } from 'react';
import { StyleSheet, View, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useConfig } from './src/hooks/useConfig';
import { useRobotControl } from './src/hooks/useRobotControl';
import { useSpeech } from './src/hooks/useSpeech';
import { RobotEyes } from './src/components/RobotEyes';
import { ManualControlPanel } from './src/components/ManualControlPanel';
import { BottomControlBar } from './src/components/BottomControlBar';
import { ConfigOverlay } from './src/components/ConfigOverlay';
import { EyeStateType } from './src/types';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isManualVisible, setIsManualVisible] = useState(false);
  const [isConfigVisible, setIsConfigVisible] = useState(false);

  // 1. Config & Log Hook
  const {
    apiKey,
    apiKeyInput,
    setApiKeyInput,
    espIp,
    espIpInput,
    setEspIpInput,
    logs,
    addLog,
    clearLogs,
    saveSettings,
  } = useConfig();

  // 2. Robot Control (ESP32 & OpenRouter AI) Hook
  const {
    eyeState,
    setEyeState,
    speechText,
    isLoading,
    sendMoveCommand,
    sendPromptToAI,
  } = useRobotControl({
    apiKey,
    espIp,
    addLog,
  });

  // 3. Speech Recognition Hook
  const { isListening, startListening, stopListening } = useSpeech({
    onStart: () => {
      addLog('Микрофон активен. Говорите команду...', 'info');
    },
    onEnd: () => {
      addLog('Голосовой ввод завершен, распознавание...', 'info');
    },
    onResult: (text) => {
      setPrompt(text);
      addLog(`Распознано: "${text}"`, 'success');
      setTimeout(() => {
        sendPromptToAI(text);
      }, 500);
    },
    onError: (err) => {
      setEyeState('normal');
      addLog(`Ошибка Speech-to-Text: ${err}`, 'error');
    },
  });

  // Helper to determine eye/border color based on current state
  const getEyeColor = (state: EyeStateType) => {
    switch (state) {
      case 'forward':
        return '#4CD964'; // Green
      case 'backward':
        return '#FFCC00'; // Yellow
      case 'stop':
        return '#FF3B30'; // Red
      case 'thinking':
        return '#AF52DE'; // Purple
      default:
        return '#00F3FF'; // Neon Cyan
    }
  };

  const handleSendPrompt = () => {
    if (!prompt.trim()) return;
    sendPromptToAI(prompt);
    setPrompt('');
  };

  const handleSaveSettings = async () => {
    const success = await saveSettings();
    if (success) {
      setIsConfigVisible(false);
    }
  };

  const currentEyeColor = getEyeColor(eyeState);

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Interactive Robot Eyes (Face) */}
        <RobotEyes eyeState={eyeState} speechText={speechText} />

        {/* Manual Controller Panel */}
        {isManualVisible && (
          <ManualControlPanel onMoveCommand={sendMoveCommand} />
        )}

        {/* Bottom Control Bar */}
        <BottomControlBar
          prompt={prompt}
          setPrompt={setPrompt}
          isLoading={isLoading}
          isListening={isListening}
          isManualVisible={isManualVisible}
          setIsManualVisible={setIsManualVisible}
          onOpenConfig={() => setIsConfigVisible(true)}
          onSendPrompt={handleSendPrompt}
          startListening={startListening}
          stopListening={stopListening}
          eyeColor={currentEyeColor}
        />
      </KeyboardAvoidingView>

      {/* Configuration & Log Overlay */}
      <ConfigOverlay
        isConfigVisible={isConfigVisible}
        onClose={() => setIsConfigVisible(false)}
        apiKeyInput={apiKeyInput}
        setApiKeyInput={setApiKeyInput}
        espIpInput={espIpInput}
        setEspIpInput={setEspIpInput}
        onSaveSettings={handleSaveSettings}
        logs={logs}
        clearLogs={clearLogs}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});