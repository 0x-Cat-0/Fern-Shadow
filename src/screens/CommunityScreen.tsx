import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';

export default function CommunityScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 占位区域 - 顶部留出状态栏和安全区域 */}
      <View style={{ height: insets.top }} />

      {/* 内容 */}
      <View style={styles.content}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>🚧</Text>
          <Text style={[styles.placeholderTitle, { color: colors.textPrimary }]}>
            功能开发中
          </Text>
          <Text style={[styles.placeholderMessage, { color: colors.textSecondary }]}>
            社区功能正在努力开发中，请耐心等待
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    alignItems: 'center',
    padding: 20,
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholderMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
});