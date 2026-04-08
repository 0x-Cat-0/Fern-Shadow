import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '../components';
import { useTheme } from '../hooks/useTheme';
import { GroupRepository, IndividualRepository } from '../database/repositories';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { Group, Individual, SortType, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainHome'>;
type ViewMode = 'all' | 'groups';

interface MainScreenProps {
  viewMode: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

const SORT_TABS: { key: SortType; label: string }[] = [
  { key: 'default', label: '默认' },
  { key: 'hot', label: '最热' },
  { key: 'latest', label: '最新' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 8;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - CARD_GAP) / 2;

// 瀑布流卡片组件
function WaterfallCard({
  item,
  style,
  isSelected,
  onLongPress,
  onEdit,
  onDelete,
  onDeselect,
}: {
  item: Individual;
  style?: any;
  isSelected?: boolean;
  onLongPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDeselect?: () => void;
}) {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();
  const [imageHeight, setImageHeight] = useState(CARD_WIDTH);

  const handleImageLoad = (event: any) => {
    const source = event?.nativeEvent?.source;
    if (source && source.width && source.height) {
      const aspectRatio = source.width / source.height;
      setImageHeight(CARD_WIDTH / aspectRatio);
    }
  };

  const handleCardPress = () => {
    if (!isSelected) {
      navigation.navigate('IndividualDetail', { individualId: item.id });
    }
  };

  return (
    <View style={[styles.cardContainer, style]}>
      <TouchableOpacity
        style={[
          styles.card,
          isSelected && styles.cardSelected,
        ]}
        onPress={handleCardPress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.coverImagePath || 'https://picsum.photos/200/200' }}
          style={[styles.cardImage, { height: imageHeight }]}
          resizeMode="cover"
          onLoad={handleImageLoad}
        />
        <View style={styles.cardContent}>
          <View style={styles.cardTextRow}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.cardBrowse}>
              <Image source={require('../assets/icons/浏览.png')} style={styles.browseIcon} />
              <Text style={[styles.browseCount, { color: colors.textSecondary }]}>{item.viewCount}</Text>
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 编辑/删除按钮 - 独立于卡片 */}
      {isSelected && (
        <View style={[styles.cardActionOverlay, styles.cardActionOverlayAbsolute]}>
          <TouchableOpacity
            style={styles.cardActionOverlayBg}
            activeOpacity={1}
            onPress={onDeselect}
          />
          <View style={styles.cardActionBtns}>
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={onEdit}
            >
              <Text style={[styles.cardActionBtnText, { color: '#666666' }]}>编辑</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={onDelete}
            >
              <Text style={[styles.cardActionBtnText, { color: '#FF4040' }]}>删除</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// 全部页面（个体瀑布流）
function IndividualsView({
  individuals,
  refreshing,
  onRefresh,
  insets,
  selectedId,
  onSelectItem,
  onEditItem,
  onDeleteItem,
}: {
  individuals: Individual[];
  refreshing: boolean;
  onRefresh: () => void;
  insets: any;
  selectedId: number | null;
  onSelectItem: (id: number | null) => void;
  onEditItem: (individual: Individual) => void;
  onDeleteItem: (individual: Individual) => void;
}) {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();
  const leftColumn = individuals.filter((_, i) => i % 2 === 0);
  const rightColumn = individuals.filter((_, i) => i % 2 === 1);

  if (individuals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🌱</Text>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>暂无个体</Text>
        <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
          点击下方中间按钮创建第一个个体
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {/* 取消选择遮罩 */}
      {selectedId && (
        <TouchableOpacity
          style={styles.deselectOverlay}
          activeOpacity={1}
          onPress={() => onSelectItem(null)}
        />
      )}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.waterfallContainer, { paddingHorizontal: spacing.md }]}>
          <View style={styles.waterfallColumn}>
            {leftColumn.map(item => (
              <WaterfallCard
                key={item.id}
                item={item}
                style={{ marginRight: CARD_GAP / 2 }}
                isSelected={selectedId === item.id}
                onLongPress={() => onSelectItem(item.id)}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item)}
                onDeselect={() => onSelectItem(null)}
              />
            ))}
          </View>
          <View style={styles.waterfallColumn}>
            {rightColumn.map(item => (
              <WaterfallCard
                key={item.id}
                item={item}
                style={{ marginLeft: CARD_GAP / 2 }}
                isSelected={selectedId === item.id}
                onLongPress={() => onSelectItem(item.id)}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item)}
                onDeselect={() => onSelectItem(null)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// 分组页面（三列网格）
function GroupsView({
  groups,
  refreshing,
  onRefresh,
  insets,
  selectedId,
  onSelectItem,
  onEditItem,
  onDeleteItem,
}: {
  groups: Group[];
  refreshing: boolean;
  onRefresh: () => void;
  insets: any;
  selectedId: number | null;
  onSelectItem: (id: number | null) => void;
  onEditItem: (group: Group) => void;
  onDeleteItem: (group: Group) => void;
}) {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();

  const numColumns = 3;
  const containerPadding = spacing.md;
  const gap = CARD_GAP;
  const itemWidth = (SCREEN_WIDTH - containerPadding * 2 - gap * (numColumns - 1)) / numColumns;
  const itemHeight = itemWidth + 40; // 图片 + 内容高度

  const handleCardPress = (item: Group) => {
    // 如果该项已选中，不导航（让按钮处理）
    if (selectedId === item.id) {
      return;
    }
    navigation.navigate('GroupDetail', { groupId: item.id });
  };

  const rows: Group[][] = [];
  for (let i = 0; i < groups.length; i += numColumns) {
    rows.push(groups.slice(i, i + numColumns));
  }

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.gridContainer, { paddingHorizontal: containerPadding }]}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((item, colIndex) => (
                <View
                  key={item.id}
                  style={[
                    styles.gridCardWrapper,
                    { width: itemWidth, height: itemHeight },
                    colIndex < numColumns - 1 && { marginRight: gap },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.gridCard,
                      selectedId === item.id && styles.cardSelected,
                    ]}
                    onPress={() => handleCardPress(item)}
                    onLongPress={() => onSelectItem(item.id)}
                    activeOpacity={0.8}
                    disabled={selectedId === item.id}
                  >
                    <Image
                      source={{ uri: item.coverImagePath || 'https://picsum.photos/200/200' }}
                      style={[styles.gridCardImage, { width: itemWidth, height: itemWidth }]}
                      resizeMode="cover"
                    />
                    <View style={styles.gridCardContent}>
                      <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.gridCardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                        浏览 {item.viewCount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {/* 编辑/删除按钮 - 独立于卡片 */}
                  {selectedId === item.id && (
                    <View
                      style={[styles.cardActionOverlay, styles.cardActionOverlayAbsolute]}
                      pointerEvents="box-none"
                    >
                      <View style={styles.cardActionOverlayBg} />
                      <View style={styles.cardActionBtns}>
                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => {
                            // console.log('Edit button pressed for item:', item.id);
                            onEditItem(item);
                          }}
                        >
                          <Text style={[styles.cardActionBtnText, { color: '#666666' }]}>编辑</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => {
                            // console.log('Delete button pressed for item:', item.id);
                            onDeleteItem(item);
                          }}
                        >
                          <Text style={[styles.cardActionBtnText, { color: '#FF4040' }]}>删除</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}
              {row.length < numColumns &&
                Array.from({ length: numColumns - row.length }).map((_, i) => (
                  <View key={`placeholder-${i}`} style={[styles.gridCardPlaceholder, { width: itemWidth, height: itemHeight }]} />
                ))}
            </View>
          ))}
          <View style={styles.gridRow}>
            <TouchableOpacity
              style={[styles.gridAddBtn, { width: itemWidth, height: itemHeight }]}
              onPress={handleCreateGroup}
              activeOpacity={0.7}
            >
              <Text style={styles.gridAddBtnText}>+</Text>
            </TouchableOpacity>
            <View style={[styles.gridCardPlaceholder, { width: itemWidth, height: itemHeight }]} />
            <View style={[styles.gridCardPlaceholder, { width: itemWidth, height: itemHeight }]} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function MainScreen({ viewMode, onViewModeChange }: MainScreenProps) {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sortType, setSortType] = useState<SortType>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [selectedIndividualId, setSelectedIndividualId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      if (viewMode === 'all') {
        const data = searchQuery
          ? await IndividualRepository.search(searchQuery)
          : await IndividualRepository.findAll();
        setIndividuals(data);
      } else {
        const data = searchQuery
          ? await GroupRepository.search(searchQuery, sortType)
          : await GroupRepository.findAll(sortType);
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viewMode, searchQuery, sortType]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible && searchQuery) {
      setSearchQuery('');
      loadData();
    }
  };

  const handleEditIndividual = (individual: Individual) => {
    setSelectedIndividualId(null);
    navigation.navigate('EditIndividual', { individualId: individual.id });
  };

  const handleDeleteIndividual = (individual: Individual) => {
    setSelectedIndividualId(null);
    Alert.alert(
      '确认删除',
      '此操作会删除该植物所有记录请确认',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'destructive',
          onPress: async () => {
            try {
              await IndividualRepository.delete(individual.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete individual:', error);
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ]
    );
  };

  const handleEditGroup = (group: Group) => {
    setSelectedGroupId(null);
    navigation.navigate('EditGroup', { groupId: group.id });
  };

  const handleDeleteGroup = (group: Group) => {
    setSelectedGroupId(null);
    Alert.alert(
      '确认删除',
      '此操作会删除该分组所有内容请确认',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'destructive',
          onPress: async () => {
            try {
              await GroupRepository.delete(group.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete group:', error);
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={{ height: insets.top, backgroundColor: '#ffffff' }} />
      <View style={[styles.headerContent, { paddingHorizontal: spacing.md * 2 }]}>
        <TouchableOpacity style={styles.leftBtn}>
          <Image source={require('../assets/icons/更多1.png')} style={{ width: 22, height: 22 }} />
        </TouchableOpacity>

        <View style={styles.tabs}>
          {SORT_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => setSortType(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: sortType === tab.key ? colors.textPrimary : colors.textDisabled },
                ]}
              >
                {tab.label}
              </Text>
              {sortType === tab.key && (
                <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={toggleSearch} style={styles.rightBtn}>
          <Image source={require('../assets/icons/搜索.png')} style={{ width: 22, height: 22 }} />
        </TouchableOpacity>
      </View>

      {searchVisible && (
        <View style={[styles.searchContainer, { paddingHorizontal: spacing.md * 2 }]}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="搜索"
            onSubmit={loadData}
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {loading ? null : viewMode === 'all' ? (
        <IndividualsView
          individuals={individuals}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          insets={insets}
          selectedId={selectedIndividualId}
          onSelectItem={setSelectedIndividualId}
          onEditItem={handleEditIndividual}
          onDeleteItem={handleDeleteIndividual}
        />
      ) : (
        <GroupsView
          groups={groups}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          insets={insets}
          selectedId={selectedGroupId}
          onSelectItem={setSelectedGroupId}
          onEditItem={handleEditGroup}
          onDeleteItem={handleDeleteGroup}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  deselectOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 50,
  },
  leftBtn: {
    width: 40,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  tab: {
    paddingVertical: 4,
    position: 'relative',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '400',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  rightBtn: {
    width: 40,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  searchContainer: {
    paddingBottom: 8,
  },
  listContent: {
    flexGrow: 1,
  },
  waterfallContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  waterfallColumn: {
    flex: 1,
    flexDirection: 'column',
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: CARD_GAP,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  cardImage: {
    width: '100%',
  },
  cardContent: {
    padding: 10,
  },
  cardTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardBrowse: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  browseIcon: {
    width: 14,
    height: 14,
    marginRight: 2,
  },
  browseCount: {
    fontSize: typography.fontSize.xs,
  },
  cardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: CARD_GAP,
    position: 'relative',
  },
  cardSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  cardActionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActionOverlayAbsolute: {
    zIndex: 10,
  },
  cardActionOverlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cardActionBtns: {
    position: 'relative',
    width: '80%',
    gap: 12,
    flexDirection: 'column',
  },
  cardActionBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  cardActionBtnText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: typography.fontSize.base,
  },
  gridContainer: {
    flexDirection: 'column',
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: CARD_GAP,
  },
  gridCard: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  gridCardWrapper: {
    position: 'relative',
    borderRadius: 4,
    overflow: 'visible',
  },
  gridCardPlaceholder: {
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  gridCardImage: {
    aspectRatio: 1,
  },
  gridCardContent: {
    padding: 8,
  },
  gridCardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 2,
  },
  gridCardDesc: {
    fontSize: typography.fontSize.xs,
  },
  gridAddBtn: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridAddBtnText: {
    fontSize: 32,
    color: '#cccccc',
    fontWeight: '300',
  },
});