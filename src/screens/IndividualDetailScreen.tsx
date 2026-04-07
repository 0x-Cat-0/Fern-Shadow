import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header, FAB, EmptyState } from '../components';
import { useTheme } from '../hooks/useTheme';
import { IndividualRepository, RecordRepository } from '../database/repositories';
import { spacing, layout } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { Individual, Record as RecordType, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'IndividualDetail'>;
type IndividualDetailRouteProp = RouteProp<RootStackParamList, 'IndividualDetail'>;

export default function IndividualDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<IndividualDetailRouteProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const { individualId, groupId } = route.params;

  const [individual, setIndividual] = useState<Individual | null>(null);
  const [records, setRecords] = useState<RecordType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [individualData, recordsData] = await Promise.all([
        IndividualRepository.findById(individualId),
        RecordRepository.findByIndividualId(individualId),
      ]);
      setIndividual(individualData);
      setRecords(recordsData);
    } catch (error) {
      console.error('Failed to load individual:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [individualId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateRecord = () => {
    navigation.navigate('CreateRecord', { individualId });
  };

  const formatDateShort = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
  };

  const formatDateFull = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const renderRecord = ({ item }: { item: RecordType }) => (
    <TouchableOpacity
      style={styles.recordItem}
      onPress={() => navigation.navigate('EditRecord', { recordId: item.id })}
    >
      <View style={styles.dateSection}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
          {formatDateShort(item.recordDate)}
        </Text>
        <View style={[styles.timeline, { backgroundColor: colors.border }]}>
          <View style={[styles.node, { backgroundColor: colors.primary }]} />
        </View>
      </View>
      <View style={styles.recordContent}>
        <Image
          source={{ uri: item.imagePath }}
          style={styles.recordImage}
          resizeMode="cover"
        />
        <View style={styles.recordText}>
          <Text
            style={[styles.recordTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.description ? (
            <Text
              style={[styles.recordDescription, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {individual && (
        <>
          <Image
            source={{ uri: individual.coverImagePath }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.infoSection}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {individual.title}
            </Text>
            {individual.description ? (
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {individual.description}
              </Text>
            ) : null}
            <Text style={[styles.stats, { color: colors.textDisabled }]}>
              {records.length} 条记录
            </Text>
          </View>
        </>
      )}
      <View style={styles.recordsHeader}>
        <Text style={[styles.recordsTitle, { color: colors.textPrimary }]}>
          记录 ({records.length})
        </Text>
      </View>
    </View>
  );

  if (!individual && !loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="个体详情" showBack onBack={() => navigation.goBack()} />
        <EmptyState icon="❌" title="个体不存在" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={individual?.title || '个体详情'}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('EditIndividual', { individualId })}
          >
            <Text style={[styles.editButton, { color: colors.primary }]}>编辑</Text>
          </TouchableOpacity>
        }
      />
      <FlatList
        data={records}
        renderItem={renderRecord}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + layout.fabSize + spacing.lg },
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="📷"
              title="暂无记录"
              message="点击右下角按钮添加第一条记录"
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
      <FAB
        icon={<Text style={[styles.fabIcon, { color: colors.textInverse }]}>+</Text>}
        onPress={handleCreateRecord}
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.md,
  },
  coverImage: {
    width: '100%',
    height: 200,
  },
  infoSection: {
    padding: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.5,
  },
  stats: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  recordsHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  recordsTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  recordItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  dateSection: {
    width: 70,
    alignItems: 'center',
  },
  dateText: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  timeline: {
    flex: 1,
    width: 2,
    alignItems: 'center',
  },
  node: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: spacing.xs,
  },
  recordContent: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: spacing.sm,
  },
  recordImage: {
    width: 80,
    height: 80,
    borderRadius: layout.cardRadius,
  },
  recordText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  recordTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  recordDescription: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
  },
  fabIcon: {
    fontSize: 24,
    fontWeight: '300',
  },
  editButton: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
});