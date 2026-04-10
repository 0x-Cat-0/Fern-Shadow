import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Linking, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import { IndividualRepository, GroupRepository, RecordRepository } from '../database/repositories';
import { getFileSize, formatFileSize } from '../utils/StorageUtils';

interface Props {
  onHelpPress: () => void;
  onAboutPress: () => void;
  onStoragePress: () => void;
}

interface Stats {
  individualCount: number;
  groupCount: number;
  recordCount: number;
  totalImages: number;
}

export default function ProfileScreen({ onHelpPress, onAboutPress, onStoragePress }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState<Stats>({
    individualCount: 0,
    groupCount: 0,
    recordCount: 0,
    totalImages: 0,
  });
  const [storageSize, setStorageSize] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    async function loadStats() {
      try {
        const [individuals, groupCount, groups] = await Promise.all([
          IndividualRepository.findAll(),
          GroupRepository.getCount(),
          GroupRepository.findAll(),
        ]);

        let recordCount = 0;
        let totalImages = 0;
        let totalSize = 0;

        for (const individual of individuals) {
          const count = await RecordRepository.getCountByIndividualId(individual.id);
          recordCount += count;

          const records = await RecordRepository.findByIndividualId(individual.id);
          for (const record of records) {
            const paths = Array.isArray(record.imagePath)
              ? record.imagePath
              : record.imagePath ? [record.imagePath] : [];
            totalImages += paths.length;

            // 计算每个文件的大小
            for (const path of paths) {
              totalSize += await getFileSize(path);
            }
          }
        }

        setStats({
          individualCount: individuals.length,
          groupCount,
          recordCount,
          totalImages,
        });
        setStorageSize(totalSize);
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    }
    loadStats();
  }, []);

  const handleHelp = () => {
    onHelpPress();
  };

  const handleFeedback = () => {
    setShowFeedbackModal(true);
  };

  const handleJoinQQ = () => {
    setShowFeedbackModal(false);
    Linking.openURL('mqqapi://card/show_pslcard?src_type=internal&version=1&uin=1021089767&card_type=group');
  };

  const handleAbout = () => {
    onAboutPress();
  };

  const handleStorage = () => {
    onStoragePress();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 占位区域 - 顶部留出状态栏 */}
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />

      {/* 标题栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>我</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* 头像区域 */}
        <View style={styles.profileSection}>
          <Image
            source={require('../assets/icons/鹿角蕨.png')}
            style={styles.avatar}
            resizeMode="cover"
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.appName, { color: colors.textPrimary }]}>蕨影</Text>
            <Text style={[styles.appSubName, { color: colors.textSecondary }]}>FernShadow</Text>
          </View>
        </View>

        {/* 数据统计 */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.individualCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>植物</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.groupCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>分组</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.recordCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>记录</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.totalImages}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>照片</Text>
            </View>
          </View>
        </View>

        {/* 存储空间 */}
        <TouchableOpacity style={[styles.optionsCard, { backgroundColor: colors.surface }]} onPress={handleStorage}>
          <View style={styles.optionItem}>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>存储空间</Text>
            <View style={styles.optionRight}>
              <Text style={[styles.optionValue, { color: colors.textSecondary }]}>{formatFileSize(storageSize)}</Text>
              <Text style={[styles.optionArrow, { color: colors.textDisabled }]}>›</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 功能选项 */}
        <View style={[styles.optionsCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.optionItem} onPress={handleHelp}>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>使用帮助</Text>
            <Text style={[styles.optionArrow, { color: colors.textDisabled }]}>›</Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.optionItem} onPress={handleFeedback}>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>问题反馈</Text>
            <Text style={[styles.optionArrow, { color: colors.textDisabled }]}>›</Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.optionItem} onPress={handleAbout}>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>关于我们</Text>
            <Text style={[styles.optionArrow, { color: colors.textDisabled }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 版本信息 */}
        <View style={styles.versionSection}>
          <Text style={[styles.versionText, { color: colors.textDisabled }]}>版本 1.0.0</Text>
        </View>
      </ScrollView>

      {/* 问题反馈弹窗 */}
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <TouchableOpacity
          style={styles.feedbackOverlay}
          activeOpacity={1}
          onPress={() => setShowFeedbackModal(false)}
        >
          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackTitle}>问题反馈</Text>
            <Text style={styles.feedbackMessage}>您可以通过以下方式反馈问题：</Text>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity
                style={styles.feedbackCancelBtn}
                onPress={() => setShowFeedbackModal(false)}
              >
                <Text style={styles.feedbackCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.feedbackQQBtn}
                onPress={handleJoinQQ}
              >
                <Text style={styles.feedbackQQText}>加入QQ群</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  profileInfo: {
    marginLeft: 16,
  },
  appName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  appSubName: {
    fontSize: 13,
  },
  statsCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  optionsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 15,
  },
  optionArrow: {
    fontSize: 20,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionValue: {
    fontSize: 14,
    marginRight: 6,
  },
  versionSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  versionText: {
    fontSize: 12,
  },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: 280,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
    color: '#000',
  },
  feedbackMessage: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feedbackCancelBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  feedbackCancelText: {
    fontSize: 16,
    color: '#999',
  },
  feedbackQQBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  feedbackQQText: {
    fontSize: 16,
    color: '#e54d46',
  },
});