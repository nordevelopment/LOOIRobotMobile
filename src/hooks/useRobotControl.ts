import { useState, useRef, useEffect, useCallback } from 'react';
import { EyeStateType } from '../types';

interface UseRobotControlProps {
  apiKey: string;
  espIp: string;
  addLog: (text: string, type: 'info' | 'success' | 'error' | 'sent' | 'received') => void;
}

export function useRobotControl({ apiKey, espIp, addLog }: UseRobotControlProps) {
  const [eyeState, setEyeState] = useState<EyeStateType>('normal');
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    speechTimeoutRef.current = setTimeout(() => {
      setSpeechText(null);
    }, 6000);
  }, []);

  // Send physical movement command to ESP32 board
  const sendMoveCommand = useCallback(
    async (direction: 'forward' | 'backward' | 'stop', duration: number) => {
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
        addLog('Please set OpenRouter API Key in settings ⚙', 'error');
        return;
      }

      setIsLoading(true);
      setEyeState('thinking');
      addLog(`Prompt: "${promptToSend}"`, 'sent');

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/nordevelopment/LOOIRobotMobile',
            'X-Title': 'Robot Face AI Orchestrator',
          },
          body: JSON.stringify({
            model: 'qwen/qwen-2.5-72b-instruct',
            messages: [
              {
                role: 'system',
                content:
                  'Вы — ИИ-мозг робота LOOI. Вы можете перемещаться, запуская инструмент `move_robot`. Если пользователь просит вас поехать, пойти, повернуться или остановиться, вы ДОЛЖНЫ вызвать инструмент `move_robot` с соответствующими параметрами. Если запрос не связан с физическим движением, ответьте текстом (будьте краткими, теплыми и дружелюбными, пишите на русском языке, используйте эмодзи).',
              },
              {
                role: 'user',
                content: promptToSend,
              },
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'move_robot',
                  description: 'Управляет физическим движением колесного робота в пространстве.',
                  parameters: {
                    type: 'object',
                    properties: {
                      direction: {
                        type: 'string',
                        enum: ['forward', 'backward', 'stop'],
                        description:
                          'Направление движения: forward (вперед), backward (назад), stop (стоп/остановка)',
                      },
                      duration: {
                        type: 'integer',
                        description: 'Время движения робота в миллисекундах.',
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
            await sendMoveCommand(args.direction, args.duration);
          }
        }
        // 2. Plain text response
        else if (message.content) {
          addLog(`AI Response: "${message.content}"`, 'received');
          showSpeechBubble(message.content);
          setEyeState('normal');
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
    sendMoveCommand,
    sendPromptToAI,
  };
}
