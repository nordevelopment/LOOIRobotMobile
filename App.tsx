import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Константы экрана и размеров глаз
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const EYE_SIZE = 120;
const EYE_SPACING = 40;
const MAX_PUPIL_OFFSET = 25;

interface LogEntry {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'sent' | 'received';
}

type EyeStateType = 'normal' | 'forward' | 'backward' | 'stop' | 'thinking';

export default function App() {
  // Настройки
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [espIp, setEspIp] = useState('192.168.1.50');
  const [espIpInput, setEspIpInput] = useState('192.168.1.50');

  // Бизнес-логика ИИ
  const [prompt, setPrompt] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Состояние лица робота и ручного пульта
  const [eyeState, setEyeState] = useState<EyeStateType>('normal');
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [isManualVisible, setIsManualVisible] = useState(false);

  // Анимационные значения
  const blinkAnim = useRef(new Animated.Value(1)).current; // Масштабирование век по Y
  const pupilOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current; // Смещение зрачков по X, Y
  const pupilScale = useRef(new Animated.Value(1)).current; // Пульсация зрачков при мышлении
  const speechAnim = useRef(new Animated.Value(0)).current; // Прозрачность облачка речи

  // Референсы для таймеров, чтобы не было утечек памяти
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Логирование событий
  const addLog = (text: string, type: 'info' | 'success' | 'error' | 'sent' | 'received' = 'info') => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    setLogs(prevLogs => [
      {
        id: Math.random().toString(),
        time: timeStr,
        text,
        type,
      },
      ...prevLogs.slice(0, 99),
    ]);
  };

  // Загрузка настроек из AsyncStorage при запуске
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
        addLog('Настройки загружены', 'info');
      } catch (error) {
        addLog(`Не удалось загрузить настройки: ${error}`, 'error');
      }
    };

    loadSettings();
  }, []);

  // Сохранение настроек в AsyncStorage
  const handleSaveSettings = async () => {
    try {
      await AsyncStorage.setItem('OPENROUTER_API_KEY', apiKeyInput);
      await AsyncStorage.setItem('ESP32_IP_ADDRESS', espIpInput);
      setApiKey(apiKeyInput);
      setEspIp(espIpInput);
      addLog('Настройки успешно сохранены', 'success');
      setIsConfigVisible(false);
    } catch (error) {
      addLog(`Не удалось сохранить настройки: ${error}`, 'error');
    }
  };

  // Случайное автоматическое моргание
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

      const nextDelay = Math.random() * 5000 + 2500; // интервал моргания 2.5 - 7.5 секунд
      blinkTimeoutRef.current = setTimeout(triggerBlink, nextDelay);
    };

    // Старт моргания с небольшой задержкой
    const startDelay = Math.random() * 3000 + 2000;
    blinkTimeoutRef.current = setTimeout(triggerBlink, startDelay);

    return () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, [blinkAnim]);

  // Анимация пульсации зрачков в режиме мышления ИИ
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

  // Обновление положения зрачков на основе тапов и свайпов
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

  // Настройка PanResponder для слежения за прикосновениями
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

  // Показ облачка с текстом речи над глазами робота
  const showSpeechBubble = (text: string) => {
    setSpeechText(text);
    Animated.timing(speechAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    speechTimeoutRef.current = setTimeout(() => {
      Animated.timing(speechAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        setSpeechText(null);
      });
    }, 6000);
  };

  // Очистка всех таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
    };
  }, []);

  // Отправка POST запроса движения на локальную плату ESP32-S3
  const sendMoveCommand = async (direction: 'forward' | 'backward' | 'stop', duration: number) => {
    const targetUrl = `http://${espIp}/api/move`;
    addLog(`Отправка POST на ${targetUrl} (${direction}, ${duration}ms)`, 'info');

    setEyeState(direction);

    // Таймер для вывода предупреждения, если плата не отвечает более 5 секунд
    const warningTimeoutId = setTimeout(() => {
      addLog(`Предупреждение: ESP32 (${espIp}) не отвечает более 5 секунд. Ожидаем ответа до 30 сек...`, 'error');
    }, 5000);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд общий таймаут

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction, duration }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearTimeout(warningTimeoutId); // Сбрасываем предупреждение при успешном ответе

      if (response.ok) {
        addLog(`ESP32 успешно подтвердил команду движения!`, 'success');
      } else {
        addLog(`ESP32 ответил с кодом ошибки: ${response.status}`, 'error');
      }
    } catch (error: any) {
      clearTimeout(warningTimeoutId); // Сбрасываем предупреждение при возникновении ошибки
      if (error.name === 'AbortError') {
        addLog(`Ошибка: Превышен таймаут ожидания (30 секунд). ESP32 (${espIp}) не отвечает.`, 'error');
      } else {
        addLog(`Ошибка отправки к ESP32: ${error.message || error}`, 'error');
      }
    }

    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }

    // Возвращаем выражение глаз в обычное по истечении времени движения
    moveTimeoutRef.current = setTimeout(() => {
      setEyeState('normal');
      addLog(`Команда завершена. Глаза вернулись в нормальный режим.`, 'info');
    }, duration);
  };

  // Отправка запроса в OpenRouter с Function Calling
  const sendPromptToAI = async () => {
    if (!prompt.trim()) return;
    if (!apiKey) {
      addLog('Задайте API-ключ OpenRouter в настройках ⚙', 'error');
      setIsConfigVisible(true);
      return;
    }

    const currentPrompt = prompt;
    setPrompt('');
    setIsLoading(true);
    setEyeState('thinking');
    addLog(`Промпт: "${currentPrompt}"`, 'sent');

    try {
      console.log(currentPrompt);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/react-native-robot-face',
          'X-Title': 'Robot Face AI Orchestrator',
        },
        body: JSON.stringify({
          model: 'qwen/qwen-2.5-72b-instruct',
          messages: [
            {
              role: 'system',
              content: 'Вы — ИИ-мозг робота LOOI. Вы можете перемещаться, запуская инструмент `move_robot`. Если пользователь просит вас поехать, пойти, повернуться или остановиться, вы ДОЛЖНЫ вызвать инструмент `move_robot` с соответствующими параметрами. Если запрос не связан с физическим движением, ответьте текстом (будьте краткими, теплыми и дружелюбными, пишите на русском языке, используйте эмодзи).',
            },
            {
              role: 'user',
              content: currentPrompt,
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
                      description: 'Направление движения: forward (вперед), backward (назад), stop (стоп/остановка)',
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

      console.log('AI Response Message:', JSON.stringify(message, null, 2));

      // 1. Проверяем вызовы инструментов (Function Calling)
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        if (toolCall.function.name === 'move_robot') {
          const args = JSON.parse(toolCall.function.arguments);
          addLog(`Вызов инструмента: move_robot(${args.direction}, ${args.duration}ms)`, 'received');
          await sendMoveCommand(args.direction, args.duration);
        }
      }
      // 2. Если просто текстовый ответ
      else if (message.content) {
        addLog(`Ответ ИИ: "${message.content}"`, 'received');
        showSpeechBubble(message.content);
        setEyeState('normal');
      }
    } catch (error: any) {
      addLog(`Ошибка связи с ИИ: ${error.message || error}`, 'error');
      setEyeState('normal');
    } finally {
      setIsLoading(false);
    }
  };

  // Определение цвета глаз по текущему состоянию
  const getEyeColor = (state: EyeStateType) => {
    switch (state) {
      case 'forward':
        return '#4CD964'; // Зеленый — движение вперед
      case 'backward':
        return '#FFCC00'; // Желтый — движение назад
      case 'stop':
        return '#FF3B30'; // Красный — остановка
      case 'thinking':
        return '#AF52DE'; // Фиолетовый — размышление
      default:
        return '#00F3FF'; // Стандартный неоновый голубой
    }
  };

  // Определение стилей текста логов в терминале
  const getLogTextStyle = (type: string) => {
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

  // Стиль трансформации зрачков с объединением сдвига и пульсации
  const pupilStyle = {
    transform: [
      { translateX: pupilOffset.x },
      { translateY: pupilOffset.y },
      { scale: pupilScale }
    ]
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Главная интерактивная зона (лицо) */}
        <View style={styles.touchOverlay} {...panResponder.panHandlers}>

          {/* Текстовое облачко мыслей/ответов ИИ */}
          {speechText && (
            <Animated.View style={[styles.speechBubble, { opacity: speechAnim }]}>
              <Text style={styles.speechText}>{speechText}</Text>
              <View style={styles.speechArrow} />
            </Animated.View>
          )}

          {/* Глаза */}
          <View style={styles.eyesContainer}>
            {/* Левый глаз */}
            <Animated.View style={[styles.eyeWrapper, { transform: [{ scaleY: blinkAnim }] }]}>
              <View style={[styles.eyeOutline, { borderColor: getEyeColor(eyeState) }]}>
                <Animated.View style={[styles.pupil, pupilStyle, { backgroundColor: getEyeColor(eyeState) }]}>
                  <View style={styles.glare} />
                </Animated.View>
              </View>
            </Animated.View>

            {/* Правый глаз */}
            <Animated.View style={[styles.eyeWrapper, { transform: [{ scaleY: blinkAnim }] }]}>
              <View style={[styles.eyeOutline, { borderColor: getEyeColor(eyeState) }]}>
                <Animated.View style={[styles.pupil, pupilStyle, { backgroundColor: getEyeColor(eyeState) }]}>
                  <View style={styles.glare} />
                </Animated.View>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* Пульт ручного управления (выдвигается по кнопке 🕹) */}
        {isManualVisible && (
          <View style={styles.manualControlPanel}>
            <Text style={styles.manualPanelTitle}>Ручной пульт управления моторами 🕹</Text>
            <View style={styles.manualButtonsRow}>
              <TouchableOpacity
                style={[styles.manualButton, { borderColor: '#4CD964' }]}
                onPress={() => sendMoveCommand('forward', 1500)}
                activeOpacity={0.7}
              >
                <Text style={[styles.manualButtonText, { color: '#4CD964' }]}>▲ Вперед</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.manualButton, { borderColor: '#FF3B30' }]}
                onPress={() => sendMoveCommand('stop', 0)}
                activeOpacity={0.7}
              >
                <Text style={[styles.manualButtonText, { color: '#FF3B30' }]}>🛑 СТОП</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.manualButton, { borderColor: '#FFCC00' }]}
                onPress={() => sendMoveCommand('backward', 1500)}
                activeOpacity={0.7}
              >
                <Text style={[styles.manualButtonText, { color: '#FFCC00' }]}>▼ Назад</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Нижняя панель управления */}
        <View style={styles.bottomControlBar}>
          {/* Переключатель ручного пульта */}
          <TouchableOpacity
            style={[styles.barIconButton, isManualVisible && styles.barIconButtonActive]}
            onPress={() => setIsManualVisible(!isManualVisible)}
            activeOpacity={0.7}
          >
            <Text style={styles.barIconText}>🕹</Text>
          </TouchableOpacity>

          {/* Инпут для ИИ-команд */}
          <View style={[styles.promptInputContainer, { borderColor: getEyeColor(eyeState) }]}>
            <TextInput
              style={styles.mainPromptInput}
              placeholder="Спроси или прикажи роботу..."
              placeholderTextColor="#555"
              value={prompt}
              onChangeText={setPrompt}
            />
            {isLoading ? (
              <ActivityIndicator size="small" color={getEyeColor(eyeState)} style={{ marginRight: 8 }} />
            ) : (
              <TouchableOpacity
                style={styles.mainSendButton}
                onPress={sendPromptToAI}
                activeOpacity={0.7}
              >
                <Text style={[styles.mainSendButtonText, { color: getEyeColor(eyeState) }]}>➔</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Кнопка настроек */}
          <TouchableOpacity
            style={styles.barIconButton}
            onPress={() => setIsConfigVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.barIconText}>⚙</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* Оверлей панели настроек */}
      {isConfigVisible && (
        <View style={styles.overlayContainer}>
          <SafeAreaView style={styles.overlayContent}>
            {/* Хедер консоли */}
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>Настройки ИИ и Сети 🤖</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsConfigVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContainer} keyboardShouldPersistTaps="handled">

              {/* Карта настроек */}
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

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveSettings}
                >
                  <Text style={styles.saveButtonText}>Сохранить настройки</Text>
                </TouchableOpacity>
              </View>

              {/* Терминал логов */}
              <View style={styles.card}>
                <View style={styles.logHeader}>
                  <Text style={styles.cardTitle}>Логи консоли (Отладка)</Text>
                  <TouchableOpacity onPress={() => setLogs([])}>
                    <Text style={styles.clearLogsText}>Очистить</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.terminalContainer}>
                  {logs.length === 0 ? (
                    <Text style={styles.emptyLogText}>Логи пусты. Отправьте запрос роботу.</Text>
                  ) : (
                    logs.map(log => (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
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
  bottomControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    paddingTop: 10,
    backgroundColor: '#0c0c0e', // Сделаем панель чуть светлее, чтобы она отделялась от лица
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    width: '100%',
  },
  barIconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1c1c1e', // Четкий темно-серый фон
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3a3a3c', // Заметный серый бордер
  },
  barIconButtonActive: {
    backgroundColor: 'rgba(0, 243, 255, 0.15)',
    borderColor: '#00F3FF',
  },
  barIconText: {
    fontSize: 22,
    color: '#ffffff', // Гарантирует видимость текста/эмодзи
  },
  promptInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e', // Четкий темно-серый фон
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
  mainSendButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainSendButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  manualControlPanel: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    alignItems: 'center',
  },
  manualPanelTitle: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  manualButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  manualButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    minWidth: 95,
    alignItems: 'center',
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
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