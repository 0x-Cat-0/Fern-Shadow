import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header, SearchBar, Card, FAB, EmptyState } from '../components';
import { useTheme } from '../hooks/useTheme';
import { GroupRepository } from '../database/repositories';
import { spacing, layout } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { Group, SortType, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const SORT_TABS: { key: SortType; label: string }[] = [
  { key: 'default', label: '默认' },
  { key: 'hot', label: '最热' },
  { key: 'latest', label: '最新' },
];

export default function MainScreen() {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<Group[]>([]);
  const [sortType, setSortType] = useState<SortType>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    try {
      const data = searchQuery
        ? await GroupRepository.search(searchQuery, sortType)
        : await GroupRepository.findAll(sortType);
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sortType, searchQuery]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadGroups();
  };

  const handleGroupPress = (group: Group) => {
    navigation.navigate('GroupDetail', { groupId: group.id });
  };

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  const renderGroup = ({ item }: { item: Group }) => (
    <Card
      coverImagePath={item.coverImagePath}
      title={item.title}
      description={item.description}
      subtitle={`浏览 ${item.viewCount}`}
      onPress={() => handleGroupPress(item)}
      style={styles.card}
      showSubtitle
    />
  );

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="搜索分组"
          onSubmit={loadGroups}
        />
      </View>
      <View style={styles.tabs}>
        {SORT_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              sortType === tab.key && { borderBottomColor: colors.primary },
            ]}
            onPress={() => setSortType(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: sortType === tab.key ? colors.primary : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="植物记录" />
      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + layout.fabSize + spacing.lg },
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="🌱"
              title="暂无分组"
              message="点击右下角按钮创建第一个分组"
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
        onPress={handleCreateGroup}
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchContainer: {
    marginBottom: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    marginRight: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.tabUnderlineHeight,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: spacing.md,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
  },
  fabIcon: {
    fontSize: 24,
    fontWeight: '300',
  },
});