import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

interface ManualControlPanelProps {
  onMoveCommand: (direction: 'forward' | 'backward' | 'stop', duration: number) => Promise<void>;
}

export function ManualControlPanel({ onMoveCommand }: ManualControlPanelProps) {
  return (
    <View style={styles.manualControlPanel}>
      <Text style={styles.manualPanelTitle}>Ручной пульт управления моторами 🕹</Text>
      <View style={styles.manualButtonsRow}>
        <TouchableOpacity
          style={[styles.manualButton, { borderColor: '#4CD964' }]}
          onPress={() => onMoveCommand('forward', 1500)}
          activeOpacity={0.7}
        >
          <Text style={[styles.manualButtonText, { color: '#4CD964' }]}>▲ Вперед</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.manualButton, { borderColor: '#FF3B30' }]}
          onPress={() => onMoveCommand('stop', 0)}
          activeOpacity={0.7}
        >
          <Text style={[styles.manualButtonText, { color: '#FF3B30' }]}>🛑 СТОП</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.manualButton, { borderColor: '#FFCC00' }]}
          onPress={() => onMoveCommand('backward', 1500)}
          activeOpacity={0.7}
        >
          <Text style={[styles.manualButtonText, { color: '#FFCC00' }]}>▼ Назад</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
