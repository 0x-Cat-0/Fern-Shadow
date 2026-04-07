import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header, SearchBar, Card, FAB, EmptyState } from '../components';
import { useTheme } from '../hooks/useTheme';
import { GroupRepository, IndividualRepository } from '../database/repositories';
import { spacing, layout } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { Group, Individual, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'GroupDetail'>;
type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;

export default function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const { groupId } = route.params;

  const [group, setGroup] = useState<Group | null>(null);
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [groupData, individualsData] = await Promise.all([
        GroupRepository.findById(groupId),
        searchQuery
          ? IndividualRepository.search(searchQuery, groupId)
          : IndividualRepository.findByGroupId(groupId),
      ]);
      setGroup(groupData);
      setIndividuals(individualsData);
      if (groupData) {
        GroupRepository.incrementViewCount(groupId);
      }
    } catch (error) {
      console.error('Failed to load group:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleIndividualPress = (individual: Individual) => {
    navigation.navigate('IndividualDetail', {
      individualId: individual.id,
      groupId,
    });
  };

  const handleCreateIndividual = () => {
    navigation.navigate('CreateIndividual', { groupId });
  };

  const renderHeader = () => (
    <View>
      {group && (
        <View style={styles.coverSection}>
          <Image
            source={{ uri: group.coverImagePath }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.coverOverlay}>
            <Text style={[styles.groupTitle, { color: colors.textInverse }]}>
              {group.title}
            </Text>
            {group.description ? (
              <Text
                style={[styles.groupDescription, { color: colors.textInverse }]}
                numberOfLines={2}
              >
                {group.description}
              </Text>
            ) : null}
          </View>
        </View>
      )}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="搜索个体"
          onSubmit={loadData}
        />
      </View>
    </View>
  );

  const renderIndividual = ({ item }: { item: Individual }) => (
    <Card
      coverImagePath={item.coverImagePath}
      title={item.title}
      description={item.description}
      onPress={() => handleIndividualPress(item)}
      style={styles.card}
    />
  );

  if (!group && !loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="分组详情" showBack onBack={() => navigation.goBack()} />
        <EmptyState icon="❌" title="分组不存在" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={group?.title || '分组详情'}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('EditGroup', { groupId })}>
            <Text style={[styles.editButton, { color: colors.primary }]}>编辑</Text>
          </TouchableOpacity>
        }
      />
      <FlatList
        data={individuals}
        renderItem={renderIndividual}
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
              icon="🌿"
              title="暂无个体"
              message="点击右下角按钮添加第一个个体"
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
        onPress={handleCreateIndividual}
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  coverSection: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  groupTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  groupDescription: {
    fontSize: typography.fontSize.base,
    opacity: 0.9,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  editButton: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
});