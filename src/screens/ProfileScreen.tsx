import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import { IndividualRepository, GroupRepository, RecordRepository } from '../database/repositories';

interface Stats {
  individualCount: number;
  groupCount: number;
  recordCount: number;
  totalViews: number;
}

export default function ProfileScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState<Stats>({
    individualCount: 0,
    groupCount: 0,
    recordCount: 0,
    totalViews: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [individualCount, groupCount, groups] = await Promise.all([
          IndividualRepository.getCount(),
          GroupRepository.getCount(),
          GroupRepository.findAll(),
        ]);

        let recordCount = 0;
        const individuals = await IndividualRepository.findAll();
        for (const individual of individuals) {
          const count = await RecordRepository.getCountByIndividualId(individual.id);
          recordCount += count;
        }

        const totalViews = groups.reduce((sum, g) => sum + g.viewCount, 0);

        setStats({
          individualCount,
          groupCount,
          recordCount,
          totalViews,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    }
    loadStats();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 占位区域 - 顶部留出状态栏 */}
      <View style={{ height: insets.top }} />

      {/* 内容 */}
      <View style={styles.content}>
        {/* 头像区域 */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>🌿</Text>
          </View>
          <Text style={[styles.appName, { color: colors.textPrimary }]}>植物记录</Text>
        </View>

        {/* 统计数据 */}
        <View style={[styles.statsSection, { backgroundColor: colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.individualCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>个体</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.groupCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>分组</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.recordCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>记录</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalViews}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>浏览</Text>
          </View>
        </View>

        {/* 版本信息 */}
        <View style={styles.versionSection}>
          <Text style={[styles.versionText, { color: colors.textDisabled }]}>版本 1.0.0</Text>
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
    paddingTop: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 40,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsSection: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  versionSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  versionText: {
    fontSize: 12,
  },
});