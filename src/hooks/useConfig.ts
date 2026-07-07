import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogEntry } from '../types';

export function useConfig() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [espIp, setEspIp] = useState('192.168.1.50');
  const [espIpInput, setEspIpInput] = useState('192.168.1.50');
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
        if (key) {
          setApiKey(key);
          setApiKeyInput(key);
        }
        if (ip) {
          setEspIp(ip);
          setEspIpInput(ip);
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
      setApiKey(apiKeyInput);
      setEspIp(espIpInput);
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
    logs,
    addLog,
    clearLogs,
    saveSettings,
  };
}
