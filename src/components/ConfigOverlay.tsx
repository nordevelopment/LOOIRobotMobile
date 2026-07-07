import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { LogEntry } from '../types';

interface ConfigOverlayProps {
  isConfigVisible: boolean;
  onClose: () => void;
  apiKeyInput: string;
  setApiKeyInput: (text: string) => void;
  espIpInput: string;
  setEspIpInput: (text: string) => void;
  onSaveSettings: () => Promise<void>;
  logs: LogEntry[];
  clearLogs: () => void;
}

export function ConfigOverlay({
  isConfigVisible,
  onClose,
  apiKeyInput,
  setApiKeyInput,
  espIpInput,
  setEspIpInput,
  onSaveSettings,
  logs,
  clearLogs,
}: ConfigOverlayProps) {
  if (!isConfigVisible) return null;

  // Determine logs styles
  const getLogTextStyle = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return styles.logSuccess;
      case 'error':
        return styles.logError;
      case 'sent':
        return styles.logSent;
      case 'received':
        return styles.logReceived;
      default:
        return styles.logInfo;
    }
  };

  return (
    <View style={styles.overlayContainer}>
      <SafeAreaView style={styles.overlayContent}>
        {/* Header */}
        <View style={styles.overlayHeader}>
          <Text style={styles.overlayTitle}>Настройки ИИ и Сети 🤖</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Edge AI Config Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Конфигурация Edge AI</Text>

            <Text style={styles.label}>OpenRouter API Key:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ваш API-ключ OpenRouter..."
              placeholderTextColor="#555"
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>ESP32-S3 IP-адрес:</Text>
            <TextInput
              style={styles.input}
              placeholder="Например, 192.168.1.50"
              placeholderTextColor="#555"
              value={espIpInput}
              onChangeText={setEspIpInput}
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity style={styles.saveButton} onPress={onSaveSettings}>
              <Text style={styles.saveButtonText}>Сохранить настройки</Text>
            </TouchableOpacity>
          </View>

          {/* Console Debug Logs Card */}
          <View style={styles.card}>
            <View style={styles.logHeader}>
              <Text style={styles.cardTitle}>Логи консоли (Отладка)</Text>
              <TouchableOpacity onPress={clearLogs}>
                <Text style={styles.clearLogsText}>Очистить</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.terminalContainer}>
              {logs.length === 0 ? (
                <Text style={styles.emptyLogText}>
                  Логи пусты. Отправьте запрос роботу.
                </Text>
              ) : (
                logs.map((log) => (
                  <View key={log.id} style={styles.logRow}>
                    <Text style={styles.logTime}>[{log.time}]</Text>
                    <Text style={[styles.logText, getLogTextStyle(log.type)]}>
                      {log.text}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 10, 0.96)',
    zIndex: 200,
  },
  overlayContent: {
    flex: 1,
    padding: 15,
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'android' ? 15 : 5,
  },
  overlayTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#FF3B30',
    fontSize: 22,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: 'rgba(25, 25, 25, 0.85)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    color: '#8e8e93',
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#121212',
    borderColor: '#2c2c2e',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#00F3FF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearLogsText: {
    color: '#FFCC00',
    fontSize: 13,
    fontWeight: '600',
  },
  terminalContainer: {
    backgroundColor: '#08080a',
    borderRadius: 10,
    padding: 12,
    minHeight: 250,
  },
  emptyLogText: {
    color: '#48484a',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 13,
  },
  logRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  logTime: {
    color: '#48484a',
    marginRight: 6,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  logText: {
    fontSize: 12,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  logInfo: {
    color: '#ffffff',
  },
  logSuccess: {
    color: '#30d158',
  },
  logError: {
    color: '#ff453a',
  },
  logSent: {
    color: '#0a84ff',
  },
  logReceived: {
    color: '#bf5af2',
  },
});
