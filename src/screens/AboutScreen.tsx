import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';

interface Props {
  onClose: () => void;
}

export default function AboutScreen({ onClose }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 顶部留出状态栏 */}
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />

      {/* 标题栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textPrimary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>关于我们</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        <View style={styles.logoSection}>
          <Image
            source={require('../../assets/icons/fern.png')}
            style={styles.logo}
            resizeMode="cover"
          />
          <Text style={[styles.appName, { color: colors.textPrimary }]}>蕨影</Text>
          <Text style={[styles.appSubName, { color: colors.textSecondary }]}>FernShadow</Text>
          <Text style={[styles.version, { color: colors.textDisabled }]}>版本 1.3.13</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            一款专为植物爱好者设计的记录应用，用镜头捕捉植物生长的每一个瞬间。
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>主要功能</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 便捷的植物拍照记录</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 智能时间轴展示</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 灵活的分组管理</Text>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>• 精美的原生界面</Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.copyright, { color: colors.textDisabled }]}>© 2026 蕨影 All Rights Reserved.</Text>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
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
  logoSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  appSubName: {
    fontSize: 14,
    marginBottom: 8,
  },
  version: {
    fontSize: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 26,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  copyright: {
    fontSize: 11,
  },
});
