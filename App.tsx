import React, { useState } from 'react';
import { StyleSheet, View, StatusBar, KeyboardAvoidingView, Platform, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
    ttsEnabled,
    ttsEnabledInput,
    setTtsEnabledInput,
    aiModel,
    aiModelInput,
    setAiModelInput,
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
    chatHistory,
    clearChatHistory,
    sendMoveCommand,
    sendPromptToAI,
  } = useRobotControl({
    apiKey,
    espIp,
    ttsEnabled,
    aiModel,
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
        setPrompt('');
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
        return '#09ccf8ff'; // Neon Cyan/Blue
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
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar hidden={true} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingView}
        >
          {/* API Key warning banner */}
          {!apiKey && (
            <TouchableOpacity
              style={styles.warningBanner}
              onPress={() => setIsConfigVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.warningBannerText}>
                ⚠️ The AI API key is not configured. Click here. ⚙
              </Text>
            </TouchableOpacity>
          )}

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
          ttsEnabledInput={ttsEnabledInput}
          setTtsEnabledInput={setTtsEnabledInput}
          aiModelInput={aiModelInput}
          setAiModelInput={setAiModelInput}
          onSaveSettings={handleSaveSettings}
          logs={logs}
          clearLogs={clearLogs}
          onClearHistory={clearChatHistory}
          historyCount={chatHistory.length}
        />
      </View>
    </SafeAreaProvider>
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
  warningBanner: {
    backgroundColor: 'rgba(255, 159, 10, 0.15)', // Полупрозрачный оранжевый
    borderColor: 'rgba(255, 159, 10, 0.3)',
    borderBottomWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 100,
  },
  warningBannerText: {
    color: '#FFCC00', // Желтый/оранжевый
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});