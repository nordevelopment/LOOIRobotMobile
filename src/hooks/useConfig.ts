import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogEntry } from '../types';

export function useConfig() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [espIp, setEspIp] = useState('192.168.1.50');
  const [espIpInput, setEspIpInput] = useState('192.168.1.50');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsEnabledInput, setTtsEnabledInput] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Add a log entry
  const addLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    setLogs((prevLogs) => [
      {
        id: Math.random().toString(),
        time: timeStr,
        text,
        type,
      },
      ...prevLogs.slice(0, 99),
    ]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const key = await AsyncStorage.getItem('OPENROUTER_API_KEY');
        const ip = await AsyncStorage.getItem('ESP32_IP_ADDRESS');
        const ttsVal = await AsyncStorage.getItem('TTS_ENABLED');
        if (key) {
          setApiKey(key);
          setApiKeyInput(key);
        }
        if (ip) {
          setEspIp(ip);
          setEspIpInput(ip);
        }
        if (ttsVal !== null) {
          const parsedTts = ttsVal === 'true';
          setTtsEnabled(parsedTts);
          setTtsEnabledInput(parsedTts);
        }
        addLog('Settings loaded successfully', 'info');
      } catch (error) {
        addLog(`Failed to load settings: ${error}`, 'error');
      }
    };

    loadSettings();
  }, [addLog]);

  // Save settings to AsyncStorage
  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('OPENROUTER_API_KEY', apiKeyInput);
      await AsyncStorage.setItem('ESP32_IP_ADDRESS', espIpInput);
      await AsyncStorage.setItem('TTS_ENABLED', String(ttsEnabledInput));
      setApiKey(apiKeyInput);
      setEspIp(espIpInput);
      setTtsEnabled(ttsEnabledInput);
      addLog('Settings saved successfully', 'success');
      return true;
    } catch (error) {
      addLog(`Failed to save settings: ${error}`, 'error');
      return false;
    }
  };

  return {
    apiKey,
    apiKeyInput,
    setApiKeyInput,
    espIp,
    espIpInput,
    setEspIpInput,
    ttsEnabled,
    ttsEnabledInput,
    setTtsEnabledInput,
    logs,
    addLog,
    clearLogs,
    saveSettings,
  };
}
