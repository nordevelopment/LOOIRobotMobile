export interface LogEntry {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'sent' | 'received';
}

export type EyeStateType = 'normal' | 'forward' | 'backward' | 'left' | 'right' | 'stop' | 'thinking';

export interface RobotSettings {
  apiKey: string;
  espIp: string;
}
