import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';

interface Props {
  onClose: () => void;
}

export default function HelpScreen({ onClose }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />

      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textPrimary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>使用帮助</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>应用介绍</Text>
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            蕨影是一款植物记录应用，用镜头捕捉植物生长的每一个瞬间，记录植物成长轨迹。
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>入门指南</Text>
          <Text style={[styles.stepText, { color: colors.textSecondary }]}>
            1. 点击底部"+"添加新植物{'\n'}
            2. 拍摄或从相册选择照片{'\n'}
            3. 填写植物名称和描述{'\n'}
            4. 在植物详情页查看和管理记录
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>记录管理</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 在植物详情页点击"+"添加新记录</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 支持拍照或从相册选择多张照片</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 点击标题或描述可快速编辑</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 照片会按拍摄日期自动分组</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 长按照片可修改日期或删除</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>分组功能</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 在"分组"标签页管理所有分组</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 创建分组时可设置封面图片</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 将植物添加到不同分组便于整理</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 一个植物可属于多个分组</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>时间线</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 植物详情页以时间线展示记录</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 顶部显示陪伴天数和上次记录时间</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 点击照片可全屏浏览，支持滑动切换</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 下拉可刷新数据</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>数据统计</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• "我"页面展示您的植物、记录、照片数量</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 每个植物详情页显示浏览量</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 记录总数和照片总数实时统计</Text>
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
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 26,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 26,
  },
});
