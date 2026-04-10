import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  Image,
  Alert,
  useWindowDimensions,
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

// 瀑布流卡片组件
function WaterfallCard({
  item,
  style,
  isSelected,
  onLongPress,
  onEdit,
  onDelete,
  onDeselect,
  cardWidth,
}: {
  item: Individual;
  style?: any;
  isSelected?: boolean;
  onLongPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDeselect?: () => void;
  cardWidth: number;
}) {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();
  const [imageHeight, setImageHeight] = useState(cardWidth);

  const handleImageLoad = (event: any) => {
    const source = event?.nativeEvent?.source;
    if (source && source.width && source.height) {
      const aspectRatio = source.width / source.height;
      setImageHeight(cardWidth / aspectRatio);
    }
  };

  const handleCardPress = () => {
    if (isSelected) {
      onDeselect?.();
    } else {
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
          source={item.coverImagePath ? { uri: item.coverImagePath } : require('../../assets/icons/fern.png')}
          style={[styles.cardImage, { height: imageHeight }]}
          resizeMode="cover"
          onLoad={handleImageLoad}
        />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.cardDescRow}>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description || '没有描述哦...'}
            </Text>
            <View style={styles.cardBrowse}>
              <Image source={require('../../assets/icons/view.png')} style={styles.browseIcon} />
              <Text style={[styles.browseCount, { color: colors.textSecondary }]}>{item.viewCount}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* 编辑/删除按钮 - 独立于卡片 */}
      {isSelected && (
        <View
          style={[styles.cardActionOverlay, styles.cardActionOverlayAbsolute]}
          pointerEvents="box-none"
        >
          <View style={styles.cardActionOverlayBg} pointerEvents="none" />
          <View style={styles.cardActionBtns} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => {
                console.log('WaterfallCard Edit button PRESSED, item.id:', item.id, 'isSelected:', isSelected);
                onEdit?.();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.cardActionBtnText, { color: '#666666' }]}>编辑</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => {
                console.log('WaterfallCard Delete button PRESSED, item.id:', item.id, 'isSelected:', isSelected);
                onDelete?.();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
  screenWidth,
  screenHeight,
}: {
  individuals: Individual[];
  refreshing: boolean;
  onRefresh: () => void;
  insets: any;
  selectedId: number | null;
  onSelectItem: (id: number | null) => void;
  onEditItem: (individual: Individual) => void;
  onDeleteItem: (individual: Individual) => void;
  screenWidth: number;
  screenHeight: number;
}) {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();
  const CARD_GAP = 8;
  const CARD_WIDTH = (screenWidth - spacing.md * 2 - CARD_GAP) / 2;
  const leftColumn = individuals.filter((_, i) => i % 2 === 0);
  const rightColumn = individuals.filter((_, i) => i % 2 === 1);

  if (individuals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Image source={require('../../assets/icons/fern.png')} style={styles.emptyImage} />
        <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
          点击下方中间加号添加植物
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.flexContainer]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.listContent, { paddingBottom: screenHeight * 0.1 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 取消选择遮罩 - 只覆盖空白区域，zIndex 低于按钮 */}
        {selectedId && (
          <TouchableOpacity
            style={styles.deselectOverlayInside}
            activeOpacity={1}
            onPress={() => onSelectItem(null)}
          />
        )}
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
                cardWidth={CARD_WIDTH}
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
                cardWidth={CARD_WIDTH}
              />
            ))}
          </View>
        </View>
        {/* 底部提示 */}
        <View style={styles.bottomHint}>
          <Text style={[styles.bottomHintText, { color: colors.textDisabled }]}>已经到底了</Text>
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
  screenWidth,
  screenHeight,
}: {
  groups: Group[];
  refreshing: boolean;
  onRefresh: () => void;
  insets: any;
  selectedId: number | null;
  onSelectItem: (id: number | null) => void;
  onEditItem: (group: Group) => void;
  onDeleteItem: (group: Group) => void;
  screenWidth: number;
  screenHeight: number;
}) {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();

  const CARD_GAP = 8;
  const numColumns = 3;
  const containerPadding = spacing.md;
  const gap = CARD_GAP;
  const itemWidth = (screenWidth - containerPadding * 2 - gap * (numColumns - 1)) / numColumns;
  const itemHeight = itemWidth + 40; // 图片 + 内容高度

  const handleCardPress = (item: Group) => {
    console.log('=== CARD PRESSED ===', item.id, 'selectedId:', selectedId);
    // 如果该项已选中，取消选择
    if (selectedId === item.id) {
      console.log('=== CARD PRESSED - DESELECT ===');
      onSelectItem(null);
      return;
    }
    console.log('=== CARD PRESSED - NAVIGATE ===');
    navigation.navigate('GroupDetail', { groupId: item.id });
  };

  const handleCardLongPress = (item: Group) => {
    console.log('=== CARD LONG PRESS ===', item.id);
    onSelectItem(item.id);
  };

  const rows: (Group | 'add')[][] = [];
  for (let i = 0; i < groups.length; i += numColumns) {
    const row: (Group | 'add')[] = groups.slice(i, i + numColumns) as (Group | 'add')[];
    rows.push(row);
  }
  // 在最后一行添加 'add'，但如果最后一行已满则另起一行
  if (rows.length === 0) {
    // 没有分组时也显示添加按钮
    rows.push(['add' as const]);
  } else {
    const lastRow = rows[rows.length - 1];
    if (lastRow.length < numColumns) {
      lastRow.push('add' as const);
    } else {
      // 最后一行已满，添加新行放置 'add'
      rows.push(['add' as const]);
    }
  }

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  if (groups.length === 0) {
    return (
      <View style={[styles.flexContainer]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.listContent, { paddingBottom: screenHeight * 0.1 + insets.bottom }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={[styles.gridContainer, { paddingHorizontal: containerPadding }]}>
            <View style={styles.gridRow}>
              <TouchableOpacity
                style={[
                  styles.gridAddBtn,
                  { width: itemWidth, height: itemHeight },
                ]}
                onPress={handleCreateGroup}
                activeOpacity={0.7}
              >
                <Text style={styles.gridAddBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <View style={[styles.emptyContainer, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
          <Image source={require('../../assets/icons/fern.png')} style={styles.emptyImage} />
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            点击上方灰色加号新建分组
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flexContainer]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.listContent, { paddingBottom: screenHeight * 0.1 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        >
        <View style={[styles.gridContainer, { paddingHorizontal: containerPadding }]}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((item, colIndex) => {
                // 添加按钮
                if (item === 'add') {
                  return (
                    <TouchableOpacity
                      key="add-btn"
                      style={[
                        styles.gridAddBtn,
                        { width: itemWidth, height: itemHeight },
                        colIndex < numColumns - 1 && { marginRight: gap },
                      ]}
                      onPress={handleCreateGroup}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.gridAddBtnText}>+</Text>
                    </TouchableOpacity>
                  );
                }
                // 分组卡片
                return (
                <View
                  key={item.id}
                  style={[
                    styles.gridCardWrapper,
                    { width: itemWidth, height: itemHeight },
                    colIndex < numColumns - 1 && { marginRight: gap },
                    selectedId === item.id && styles.cardSelected,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.gridCard}
                    onPress={() => handleCardPress(item)}
                    onLongPress={() => handleCardLongPress(item)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={item.coverImagePath ? { uri: item.coverImagePath } : require('../../assets/icons/fern.png')}
                      style={[styles.gridCardImage, { width: itemWidth, height: itemWidth }]}
                      resizeMode="cover"
                    />
                    <View style={styles.gridCardContent}>
                      <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.gridCardDescRow}>
                        <Text style={[styles.gridCardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.description || '没有描述哦...'}
                        </Text>
                        <View style={styles.gridCardBrowse}>
                          <Image source={require('../../assets/icons/view.png')} style={styles.gridBrowseIcon} />
                          <Text style={[styles.gridBrowseCount, { color: colors.textSecondary }]}>{item.viewCount}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                  {/* 编辑/删除按钮 */}
                  {selectedId === item.id && (
                    <View
                      style={[styles.cardActionOverlay, styles.cardActionOverlayAbsolute]}
                      pointerEvents="box-none"
                    >
                      <View style={styles.cardActionOverlayBg} pointerEvents="none" />
                      <View style={styles.cardActionBtns}>
                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => {
                            console.log('=== EDIT BUTTON PRESSED ===', item.id);
                            onEditItem(item);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Text style={[styles.cardActionBtnText, { color: '#666666' }]}>编辑</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => {
                            console.log('=== DELETE BUTTON PRESSED ===', item.id);
                            onDeleteItem(item);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Text style={[styles.cardActionBtnText, { color: '#FF4040' }]}>删除</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
                );
              })}
              {/* 补齐空白 */}
              {row.length < numColumns &&
                Array.from({ length: numColumns - row.length }).map((_, i) => (
                  <View key={`placeholder-${i}`} style={[styles.gridCardPlaceholder, { width: itemWidth, height: itemHeight }]} />
                ))}
            </View>
          ))}
        </View>
        {/* 底部提示 */}
        <View style={styles.bottomHint}>
          <Text style={[styles.bottomHintText, { color: colors.textDisabled }]}>已经到底了</Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default function MainScreen({ viewMode, onViewModeChange }: MainScreenProps) {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

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
          ? await IndividualRepository.search(searchQuery, sortType)
          : await IndividualRepository.findAll(sortType);
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
          <Image source={require('../../assets/icons/more1.png')} style={{ width: 22, height: 22 }} />
        </TouchableOpacity>

        <View style={styles.tabs}>
          {/* 默认 */}
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSortType('default')}
          >
            <Text
              style={[
                styles.tabText,
                { color: sortType === 'default' ? colors.textPrimary : colors.textDisabled },
              ]}
            >
              默认
            </Text>
            {sortType === 'default' && (
              <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>

          {/* 最多查看/最少查看 */}
          <TouchableOpacity
            style={styles.tab}
            onPress={() => {
              if (sortType === 'hot' || sortType === 'least_hot') {
                setSortType(sortType === 'hot' ? 'least_hot' : 'hot');
              } else {
                setSortType('hot');
              }
            }}
          >
            <Text
              style={[
                styles.tabText,
                { color: sortType === 'hot' || sortType === 'least_hot' ? colors.textPrimary : colors.textDisabled },
              ]}
            >
              {sortType === 'least_hot' ? '最少查看' : '最多查看'}
            </Text>
            {(sortType === 'hot' || sortType === 'least_hot') && (
              <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />
            )}
            <Image source={require('../../assets/icons/switch.png')} style={[styles.tabSwitchIcon, { display: sortType === 'hot' || sortType === 'least_hot' ? 'flex' : 'none' }]} />
          </TouchableOpacity>

          {/* 最近查看/最久未看 */}
          <TouchableOpacity
            style={styles.tab}
            onPress={() => {
              if (sortType === 'latest' || sortType === 'oldest') {
                setSortType(sortType === 'latest' ? 'oldest' : 'latest');
              } else {
                setSortType('latest');
              }
            }}
          >
            <Text
              style={[
                styles.tabText,
                { color: sortType === 'latest' || sortType === 'oldest' ? colors.textPrimary : colors.textDisabled },
              ]}
            >
              {sortType === 'oldest' ? '最久未看' : '最近查看'}
            </Text>
            {(sortType === 'latest' || sortType === 'oldest') && (
              <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />
            )}
            <Image source={require('../../assets/icons/switch.png')} style={[styles.tabSwitchIcon, { display: sortType === 'latest' || sortType === 'oldest' ? 'flex' : 'none' }]} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={toggleSearch} style={styles.rightBtn}>
          <Image source={require('../../assets/icons/search.png')} style={{ width: 22, height: 22 }} />
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
          screenWidth={screenWidth}
          screenHeight={screenHeight}
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
          screenWidth={screenWidth}
          screenHeight={screenHeight}
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
  flexContainer: {
    flex: 1,
    position: 'relative',
  },
  deselectOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  deselectOverlayInside: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  deselectBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
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
    gap: 16,
  },
  tab: {
    paddingVertical: 4,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
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
  tabSwitchIcon: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -7,
    width: 14,
    height: 14,
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
    width: '100%',
    marginBottom: 4,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  cardImage: {
    width: '100%',
  },
  cardContent: {
    flex: 1,
    padding: '3%',
  },
  cardBrowse: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  browseIcon: {
    width: 12,
    height: 12,
    marginRight: 2,
  },
  browseCount: {
    fontSize: typography.fontSize.xs,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 0,
    lineHeight: 20,
  },
  cardDescRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardDesc: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.0,
  },
  cardContainer: {
    width: '100%',
    marginBottom: 4,
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
    zIndex: 15,
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
  emptyImage: {
    width: 240,
    height: 240,
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
  bottomHint: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  bottomHintText: {
    fontSize: typography.fontSize.sm,
  },
  gridContainer: {
    flexDirection: 'column',
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 8,
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
    flex: 1,
    padding: '3%',
  },
  gridCardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 0,
  },
  gridCardDescRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  gridCardDesc: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.0,
  },
  gridCardBrowse: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  gridBrowseIcon: {
    width: 12,
    height: 12,
    marginRight: 2,
  },
  gridBrowseCount: {
    fontSize: typography.fontSize.xs,
  },
  gridAddBtn: {
    backgroundColor: '#ebebeb',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gridAddBtnText: {
    fontSize: 32,
    color: '#adadad',
    fontWeight: '300',
  },
});