import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import { formatFileSize, getCacheSize, clearCache } from '../utils/StorageUtils';

interface Props {
  onClose: () => void;
}

export default function StorageManagementScreen({ onClose }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const [cacheSize, setCacheSize] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
    const cache = await getCacheSize();
    setCacheSize(cache);
    setLoading(false);
  };

  const handleClearCache = () => {
    Alert.alert(
      '清除缓存',
      '确定要清除临时缓存吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清除',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCache();
              setCacheSize(0);
              Alert.alert('成功', '缓存已清除');
            } catch (error) {
              Alert.alert('错误', '清除缓存失败');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />

      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textPrimary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>存储管理</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        <View style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
          <View style={styles.overviewRow}>
            <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>临时缓存</Text>
            <Text style={[styles.overviewValue, { color: colors.textPrimary }]}>{formatFileSize(cacheSize)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.clearCacheBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={handleClearCache}
          >
            <Text style={[styles.clearCacheText, { color: colors.primary }]}>清除临时缓存</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  overviewCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  overviewLabel: {
    fontSize: 15,
  },
  overviewValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  clearCacheBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearCacheText: {
    fontSize: 14,
    fontWeight: '500',
  },
});