import { useState, useRef, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EyeStateType } from '../types';
import * as Speech from 'expo-speech';
import { CONFIG } from '../config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseRobotControlProps {
  apiKey: string;
  espIp: string;
  ttsEnabled: boolean;
  aiModel: string;
  addLog: (text: string, type: 'info' | 'success' | 'error' | 'sent' | 'received') => void;
}

export function useRobotControl({ apiKey, espIp, ttsEnabled, aiModel, addLog }: UseRobotControlProps) {
  const [eyeState, setEyeState] = useState<EyeStateType>('normal');
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load chat history from AsyncStorage on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem('CHAT_HISTORY');
        if (storedHistory) {
          setChatHistory(JSON.parse(storedHistory));
        }
      } catch (error) {
        addLog(`Failed to load chat history: ${error}`, 'error');
      }
    };
    loadHistory();
  }, [addLog]);

  // Helper to update and persist chat history
  const updateChatHistory = useCallback(async (newMessages: ChatMessage[]) => {
    try {
      const trimmed = newMessages.slice(-25); // Limit to last 25 messages
      setChatHistory(trimmed);
      await AsyncStorage.setItem('CHAT_HISTORY', JSON.stringify(trimmed));
    } catch (error) {
      addLog(`Failed to save chat history: ${error}`, 'error');
    }
  }, [addLog]);

  const clearChatHistory = useCallback(async () => {
    try {
      setChatHistory([]);
      await AsyncStorage.removeItem('CHAT_HISTORY');
      addLog('AI chat history cleared', 'success');
    } catch (error) {
      addLog(`Failed to clear chat history: ${error}`, 'error');
    }
  }, [addLog]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };
  }, []);

  // Display speech bubble text with auto-hide timeout
  const showSpeechBubble = useCallback((text: string) => {
    setSpeechText(text);

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    // Dynamic duration: 80ms per character, minimum 8 seconds, maximum 24 seconds
    const displayDuration = Math.min(Math.max(text.length * 80, 8000), 24000);

    speechTimeoutRef.current = setTimeout(() => {
      setSpeechText(null);
    }, displayDuration);
  }, []);

  // Send physical movement command to ESP32 board
  const sendMoveCommand = useCallback(
    async (direction: 'forward' | 'backward' | 'stop', duration: number) => {
      try {
        await Speech.stop();
      } catch (e) {}

      const targetUrl = `http://${espIp}/api/move`;
      addLog(`Sending POST to ${targetUrl} (${direction}, ${duration}ms)`, 'info');

      setEyeState(direction);

      const warningTimeoutId = setTimeout(() => {
        addLog(`Warning: ESP32 (${espIp}) did not respond within 1.5s. Still waiting...`, 'error');
      }, 1500);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds request timeout

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ direction, duration }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        clearTimeout(warningTimeoutId);

        if (response.ok) {
          addLog(`ESP32 confirmed movement command successfully`, 'success');
        } else {
          addLog(`ESP32 responded with error status: ${response.status}`, 'error');
        }
      } catch (error: any) {
        clearTimeout(warningTimeoutId);
        if (error.name === 'AbortError') {
          addLog(`Error: Connection timeout. ESP32 (${espIp}) did not respond.`, 'error');
        } else {
          addLog(`Error communicating with ESP32: ${error.message || error}`, 'error');
        }
      }

      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }

      // Reset eyes back to normal after movement duration completes
      moveTimeoutRef.current = setTimeout(() => {
        setEyeState('normal');
        addLog(`Movement command completed. Eyes reset to normal.`, 'info');
      }, duration);
    },
    [espIp, addLog]
  );

  // Send speech prompt to OpenRouter AI Orchestrator
  const sendPromptToAI = useCallback(
    async (promptToSend: string) => {
      if (!promptToSend.trim()) return;
      if (!apiKey) {
        addLog('Error: The AI API key is not configured in the settings ⚙', 'error');
        showSpeechBubble('Error: The AI API key is not configured in the settings ⚙');
        setEyeState('normal');
        return;
      }

      setIsLoading(true);
      setEyeState('thinking');
      addLog(`Prompt: "${promptToSend}"`, 'sent');

      try {
        await Speech.stop();
      } catch (e) {}

      const newUserMessage: ChatMessage = { role: 'user', content: promptToSend };
      const messagesToSend = [
        {
          role: 'system',
          content:
            'You are the AI brain of the LOOI robot. You can move by triggering the `move_robot` tool. If the user asks you to move, go, turn, or stop, you MUST call the `move_robot` tool with appropriate parameters. If the request is not related to physical movement, respond with a text message. Be brief, warm, friendly, use emojis, and always respond in the user\'s language.',
        },
        ...chatHistory,
        newUserMessage,
      ];

      try {
        const response = await fetch(CONFIG.OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': CONFIG.HTTP_REFERER,
            'X-Title': CONFIG.APP_TITLE,
          },
          body: JSON.stringify({
            model: aiModel || CONFIG.DEFAULT_AI_MODEL,
            temperature: 0.5,
            max_tokens: 200,
            messages: messagesToSend,
            tools: [
              {
                type: 'function',
                function: {
                  name: 'move_robot',
                  description: 'Controls the physical movement of a wheeled robot in space.',
                  parameters: {
                    type: 'object',
                    properties: {
                      direction: {
                        type: 'string',
                        enum: ['forward', 'backward', 'stop'],
                        description:
                          'Direction of movement: forward (forward), backward (backward), stop (stop)',
                      },
                      duration: {
                        type: 'integer',
                        description: 'Time of robot movement in milliseconds.',
                      },
                    },
                    required: ['direction', 'duration'],
                  },
                },
              },
            ],
            tool_choice: 'auto',
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const message = data?.choices?.[0]?.message;

        if (!message) {
          throw new Error(JSON.stringify(data));
        }

        // 1. Tool Calls (Function Calling)
        if (message.tool_calls && message.tool_calls.length > 0) {
          const toolCall = message.tool_calls[0];
          if (toolCall.function.name === 'move_robot') {
            const args = JSON.parse(toolCall.function.arguments);
            addLog(`Tool call received: move_robot(${args.direction}, ${args.duration}ms)`, 'received');
            
            // Record physical movement in chat history as a log entry
            const actionText = `[Выполнено движение: ${args.direction}, ${args.duration}мс]`;
            await updateChatHistory([
              ...chatHistory,
              newUserMessage,
              { role: 'assistant', content: actionText }
            ]);

            await sendMoveCommand(args.direction, args.duration);
          }
        }
        // 2. Plain text response
        else if (message.content) {
          addLog(`AI Response: "${message.content}"`, 'received');
          showSpeechBubble(message.content);
          setEyeState('normal');

          await updateChatHistory([
            ...chatHistory,
            newUserMessage,
            { role: 'assistant', content: message.content }
          ]);

          if (ttsEnabled) {
            try {
              await Speech.speak(message.content, {
                language: 'ru-RU',
                pitch: 1.05,
                rate: 1.0,
              });
            } catch (ttsErr: any) {
              addLog(`TTS error: ${ttsErr.message || String(ttsErr)}`, 'error');
            }
          }
        }
      } catch (error: any) {
        addLog(`AI connection failed: ${error.message || error}`, 'error');
        setEyeState('normal');
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, addLog, sendMoveCommand, showSpeechBubble]
  );

  return {
    eyeState,
    setEyeState,
    speechText,
    isLoading,
    chatHistory,
    clearChatHistory,
    sendMoveCommand,
    sendPromptToAI,
  };
}
