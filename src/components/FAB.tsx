import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { layout } from '../theme/spacing';

interface FABProps {
  onPress: () => void;
  icon: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  size?: 'small' | 'normal';
}

export function FAB({ onPress, icon, style, size = 'normal' }: FABProps) {
  const colors = useTheme();
  const fabSize = size === 'small' ? 40 : layout.fabSize;

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          width: fabSize,
          height: fabSize,
          borderRadius: layout.fabRadius,
          backgroundColor: colors.primary,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});