import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  Image,
  Modal,
  ScrollView,
  Alert,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '../components';
import { useTheme } from '../hooks/useTheme';
import { GroupRepository, IndividualRepository } from '../database/repositories';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { Group, Individual, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'GroupDetail'>;
type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;

const CARD_GAP = 8;

export default function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const { groupId } = route.params;

  // 计算卡片尺寸
  const containerPadding = spacing.md;
  const numColumns = 3;
  const itemWidth = (screenWidth - containerPadding * 2 - CARD_GAP * (numColumns - 1)) / numColumns;
  const itemHeight = itemWidth + 40; // 图片 + 内容高度
  const coverHeight = screenWidth * 0.4; // 封面图高度为屏幕宽度的40%

  const [group, setGroup] = useState<Group | null>(null);
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 添加个体弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [allIndividuals, setAllIndividuals] = useState<Individual[]>([]);
  const [selectedIndividualIds, setSelectedIndividualIds] = useState<number[]>([]);
  const [addingToGroup, setAddingToGroup] = useState(false);

  // 弹窗视图模式：列表或网格
  const [addModalViewMode, setAddModalViewMode] = useState<'list' | 'grid'>('grid');
  // 弹窗高度（默认屏幕一半）
  const { height: screenHeight } = useWindowDimensions();
  const [modalHeight, setModalHeight] = useState(screenHeight * 0.5);
  const [isDragging, setIsDragging] = useState(false);

  // 拖动改变弹窗高度
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = screenHeight - gestureState.moveY;
        // 限制最小和最大高度
        const minHeight = screenHeight * 0.2;
        const maxHeight = screenHeight * 0.85;
        if (newHeight >= minHeight && newHeight <= maxHeight) {
          setModalHeight(newHeight);
        }
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
      },
    })
  ).current;

  // 长按选择状态
  const [selectedIndividualId, setSelectedIndividualId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [groupData, individualsData] = await Promise.all([
        GroupRepository.findById(groupId),
        searchQuery
          ? GroupRepository.searchIndividualsInGroup(groupId, searchQuery)
          : GroupRepository.getIndividualsInGroup(groupId),
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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleIndividualPress = (individual: Individual) => {
    navigation.navigate('IndividualDetail', {
      individualId: individual.id,
    });
  };

  // 打开添加个体弹窗
  const handleOpenAddModal = async () => {
    try {
      const all = await IndividualRepository.findAll();
      setAllIndividuals(all);
      const current = await GroupRepository.getIndividualsInGroup(groupId);
      setSelectedIndividualIds(current.map(i => i.id));
      setShowAddModal(true);
    } catch (error) {
      console.error('Failed to load individuals:', error);
      Alert.alert('错误', '加载个体失败');
    }
  };

  // 确认添加个体到分组
  const handleConfirmAdd = async () => {
    setAddingToGroup(true);
    try {
      // 获取当前分组中的所有个体ID
      const currentInGroup = await GroupRepository.getIndividualsInGroup(groupId);
      const currentIds = currentInGroup.map(i => i.id);

      // 需要添加的（选中但不在分组中的）
      const toAdd = selectedIndividualIds.filter(id => !currentIds.includes(id));

      // 需要移除的（在分组中但未选中的）
      const toRemove = currentIds.filter(id => !selectedIndividualIds.includes(id));

      // 执行添加
      if (toAdd.length > 0) {
        await GroupRepository.addIndividualsToGroup(groupId, toAdd);
      }

      // 执行移除
      for (const id of toRemove) {
        await GroupRepository.removeIndividualFromGroup(groupId, id);
      }

      setShowAddModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to update individuals:', error);
      Alert.alert('错误', '更新个体失败');
    } finally {
      setAddingToGroup(false);
    }
  };

  // 切换个体选中状态
  const toggleIndividualSelection = (id: number) => {
    setSelectedIndividualIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleCardPress = (item: Individual) => {
    // 如果该项已选中，取消选择
    if (selectedIndividualId === item.id) {
      setSelectedIndividualId(null);
      return;
    }
    navigation.navigate('IndividualDetail', { individualId: item.id });
  };

  const handleCardLongPress = (item: Individual) => {
    setSelectedIndividualId(item.id);
  };

  // 编辑个体
  const handleEditIndividual = (item: Individual) => {
    setSelectedIndividualId(null);
    navigation.navigate('EditIndividual', { individualId: item.id });
  };

  // 从分组移除个体（不是删除个体本身）
  const handleRemoveFromGroup = (item: Individual) => {
    setSelectedIndividualId(null);
    Alert.alert(
      '确认移除',
      `确定要从分组中移除"${item.title}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'destructive',
          onPress: async () => {
            try {
              await GroupRepository.removeIndividualFromGroup(groupId, item.id);
              loadData();
            } catch (error) {
              console.error('Failed to remove individual from group:', error);
              Alert.alert('错误', '移除失败');
            }
          },
        },
      ]
    );
  };

  // 构建网格行数据
  const buildGridRows = (): (Individual | 'add')[][] => {
    const items: (Individual | 'add')[] = [...individuals, 'add' as const];
    const rows: (Individual | 'add')[][] = [];
    for (let i = 0; i < items.length; i += numColumns) {
      rows.push(items.slice(i, i + numColumns));
    }
    return rows;
  };

  const gridRows = buildGridRows();

  if (!group && !loading) {
    return (
      <View style={[stylesDetail.container, { backgroundColor: colors.background }]}>
        <View style={{ height: insets.top, backgroundColor: colors.surface }} />
        <View style={[stylesDetail.topBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={stylesDetail.backBtn}>
            <Text style={{ fontSize: 22, color: colors.textPrimary }}>‹</Text>
          </TouchableOpacity>
          <Text style={[stylesDetail.topTitle, { color: colors.textPrimary }]}>分组详情</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditGroup', { groupId })}
            style={stylesDetail.editBtn}
          >
            <Text style={{ fontSize: 16, color: colors.primary }}>编辑</Text>
          </TouchableOpacity>
        </View>
        <View style={stylesDetail.emptyContainer}>
          <Text style={stylesDetail.emptyIcon}>❌</Text>
          <Text style={[stylesDetail.emptyTitle, { color: colors.textPrimary }]}>分组不存在</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[stylesDetail.container, { backgroundColor: colors.background }]}>
      {/* 顶部安全区域 */}
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />
      {/* 顶部导航栏 */}
      <View style={[stylesDetail.topBar, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={stylesDetail.backBtn}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>‹</Text>
        </TouchableOpacity>
        <Text style={[stylesDetail.topTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {group?.title}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditGroup', { groupId })}
          style={stylesDetail.editBtn}
        >
          <Image source={require('../../assets/icons/编辑.png')} style={{ width: 22, height: 22 }} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={stylesDetail.scrollView}
        contentContainerStyle={[stylesDetail.scrollContent, { paddingBottom: screenHeight * 0.1 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* 封面图 */}
        <View style={stylesDetail.coverSection}>
          <Image
            source={group?.coverImagePath ? { uri: group.coverImagePath } : require('../../assets/icons/鹿角蕨.png')}
            style={stylesDetail.coverImage}
            resizeMode="cover"
          />
          <View style={stylesDetail.coverOverlay}>
            <Text style={[stylesDetail.groupTitle, { color: '#ffffff' }]}>
              {group?.title}
            </Text>
            {group?.description ? (
              <Text
                style={[stylesDetail.groupDescription, { color: '#ffffff' }]}
                numberOfLines={2}
              >
                {group.description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* 搜索栏 */}
        <View style={[stylesDetail.searchSection, { backgroundColor: colors.surface }]}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="搜索个体"
            onSubmit={loadData}
          />
        </View>

        {/* 网格内容 */}
        <View style={[stylesDetail.gridContainer, { paddingHorizontal: containerPadding }]}>
          {gridRows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={stylesDetail.gridRow}>
              {row.map((item, colIndex) => {
                if (item === 'add') {
                  return (
                    <View
                      key="add-btn"
                      style={[
                        stylesDetail.addBtnWrapper,
                        { width: itemWidth, height: itemWidth + 50 },
                        colIndex < numColumns - 1 && { marginRight: CARD_GAP },
                      ]}
                    >
                      <TouchableOpacity
                        style={stylesDetail.addBtn}
                        onPress={handleOpenAddModal}
                        activeOpacity={0.7}
                      >
                        <Text style={stylesDetail.addBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
                const isSelected = selectedIndividualId === item.id;
                return (
                  <View
                    key={item.id}
                    style={[
                      stylesDetail.cardWrapper,
                      { width: itemWidth },
                      colIndex < numColumns - 1 && { marginRight: CARD_GAP },
                    ]}
                  >
                    {/* 卡片主体 */}
                    <TouchableOpacity
                      style={stylesDetail.card}
                      onPress={() => handleCardPress(item)}
                      onLongPress={() => handleCardLongPress(item)}
                      activeOpacity={0.8}
                    >
                      {/* 封面图 */}
                      <Image
                        source={item.coverImagePath ? { uri: item.coverImagePath } : require('../../assets/icons/鹿角蕨.png')}
                        style={stylesDetail.cardImage}
                        resizeMode="cover"
                      />
                      {/* 底部信息栏 */}
                      <View style={[stylesDetail.cardInfo, { backgroundColor: colors.background }]}>
                        <View style={stylesDetail.cardInfoLeft}>
                          <Text style={[stylesDetail.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={[stylesDetail.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.description || '没有描述哦...'}
                          </Text>
                        </View>
                        <View style={stylesDetail.cardInfoRight}>
                          <Image source={require('../../assets/icons/浏览.png')} style={stylesDetail.browseIcon} />
                          <Text style={[stylesDetail.browseCount, { color: colors.textSecondary }]}>{item.viewCount}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* 长按编辑/移除遮罩 */}
                    {isSelected && (
                      <View style={stylesDetail.actionOverlay}>
                        <View style={stylesDetail.actionBg} />
                        <View style={stylesDetail.actionBtns}>
                          <TouchableOpacity
                            style={stylesDetail.actionBtn}
                            onPress={() => handleEditIndividual(item)}
                          >
                            <Text style={stylesDetail.actionBtnText}>编辑</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={stylesDetail.actionBtn}
                            onPress={() => handleRemoveFromGroup(item)}
                          >
                            <Text style={[stylesDetail.actionBtnText, { color: '#FF4040' }]}>移除</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        {/* 底部提示 */}
        <View style={stylesDetail.bottomHint}>
          <Text style={[stylesDetail.bottomHintText, { color: colors.textDisabled }]}>已经到底了</Text>
        </View>
      </ScrollView>

      {/* 添加个体弹窗 */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          handleConfirmAdd();
        }}
      >
        <TouchableOpacity
          style={stylesDetail.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            handleConfirmAdd();
          }}
        >
          <TouchableOpacity
            style={[stylesDetail.modalContent, {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + 20,
              height: modalHeight,
            }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* 拖动手柄 */}
            <View style={stylesDetail.dragHandleContainer} {...panResponder.panHandlers}>
              <View style={[stylesDetail.dragHandle, isDragging && stylesDetail.dragHandleActive]} />
            </View>

            <View style={stylesDetail.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={[stylesDetail.modalCancel, { color: colors.textPrimary }]}>取消</Text>
              </TouchableOpacity>
              <View style={stylesDetail.modalHeaderRight}>
                {/* 视图切换按钮 */}
                <TouchableOpacity
                  style={stylesDetail.viewModeBtn}
                  onPress={() => setAddModalViewMode(addModalViewMode === 'list' ? 'grid' : 'list')}
                >
                  <Text style={[stylesDetail.viewModeBtnText, { color: colors.textPrimary }]}>
                    {addModalViewMode === 'list' ? '▦' : '☰'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirmAdd} disabled={addingToGroup}>
                  <Text style={[stylesDetail.modalConfirm, { color: addingToGroup ? colors.textDisabled : colors.textPrimary }]}>
                    完成{selectedIndividualIds.length > 0 ? ` (${selectedIndividualIds.length})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={addModalViewMode === 'list' ? stylesDetail.modalList : stylesDetail.modalGridList}>
              {allIndividuals.length === 0 ? (
                <Text style={[stylesDetail.noIndividualsText, { color: colors.textDisabled }]}>暂无可添加的个体</Text>
              ) : addModalViewMode === 'list' ? (
                // 列表形式
                allIndividuals.map(individual => (
                  <TouchableOpacity
                    key={individual.id}
                    style={stylesDetail.modalItem}
                    onPress={() => toggleIndividualSelection(individual.id)}
                  >
                    <Image
                      source={individual.coverImagePath ? { uri: individual.coverImagePath } : require('../../assets/icons/鹿角蕨.png')}
                      style={stylesDetail.modalItemImage}
                    />
                    <View style={stylesDetail.modalItemContent}>
                      <Text style={[stylesDetail.modalItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {individual.title}
                      </Text>
                      {individual.description ? (
                        <Text style={[stylesDetail.modalItemDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                          {individual.description}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[
                      stylesDetail.checkbox,
                      selectedIndividualIds.includes(individual.id) && stylesDetail.checkboxSelected
                    ]}>
                      {selectedIndividualIds.includes(individual.id) && <Text style={stylesDetail.checkboxText}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                // 网格形式：一行四个
                <View style={stylesDetail.modalGridContainer}>
                  {allIndividuals.map(individual => {
                    const isSelected = selectedIndividualIds.includes(individual.id);
                    return (
                      <TouchableOpacity
                        key={individual.id}
                        style={[
                          stylesDetail.modalGridCard,
                          !isSelected && { borderColor: '#cccccc', borderWidth: 1 },
                        ]}
                        onPress={() => toggleIndividualSelection(individual.id)}
                        activeOpacity={0.8}
                      >
                        <View style={stylesDetail.modalGridCardInner}>
                          <Image
                            source={individual.coverImagePath ? { uri: individual.coverImagePath } : require('../../assets/icons/鹿角蕨.png')}
                            style={stylesDetail.modalGridCardImage}
                          />
                          {!isSelected && (
                            <View style={stylesDetail.modalGridCardOverlay} pointerEvents="none" />
                          )}
                          <View style={stylesDetail.modalGridCardTitleWrapper}>
                            <Text
                              style={[stylesDetail.modalGridCardTitle, { color: '#ffffff' }]}
                              numberOfLines={1}
                            >
                              {individual.title}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const stylesDetail = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  topBar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  editBtn: {
    paddingHorizontal: 4,
  },
  coverSection: {
    width: '100%',
    aspectRatio: 2.5, // 宽高比约为 2.5:1
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
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    opacity: 0.9,
  },
  searchSection: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  gridContainer: {
    flexDirection: 'column',
    paddingTop: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: CARD_GAP,
  },
  // 卡片包装器 - 控制宽度和右边距
  cardWrapper: {
    borderRadius: 4,
    overflow: 'visible',
  },
  // 卡片主体
  card: {
    flexDirection: 'column',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    width: '100%',
  },
  // 封面图
  cardImage: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'cover',
  },
  // 底部信息栏
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cardInfoLeft: {
    flex: 1,
    marginRight: 8,
    justifyContent: 'flex-end',
  },
  cardInfoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 0,
  },
  cardDesc: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.0,
  },
  browseIcon: {
    width: 12,
    height: 12,
    marginRight: 2,
  },
  browseCount: {
    fontSize: typography.fontSize.xs,
  },
  bottomHint: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  bottomHintText: {
    fontSize: typography.fontSize.sm,
  },
  // 添加按钮包装器
  addBtnWrapper: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  // 添加按钮
  addBtn: {
    flex: 1,
    width: '100%',
    backgroundColor: '#ebebeb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 32,
    color: '#adadad',
    fontWeight: '300',
  },
  // 编辑/移除遮罩层
  actionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  actionBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
  },
  actionBtns: {
    position: 'relative',
    width: '80%',
    flexDirection: 'column',
    gap: 10,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  viewModeBtn: {
    padding: 4,
  },
  viewModeBtnText: {
    fontSize: 18,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cccccc',
    borderRadius: 2,
  },
  dragHandleActive: {
    backgroundColor: '#cccccc',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirm: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalList: {
    paddingHorizontal: 20,
  },
  modalGridList: {
    paddingHorizontal: 12,
  },
  modalGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 8,
  },
  modalGridCard: {
    width: '23%',
    marginHorizontal: '1%',
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  modalGridCardInner: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalGridCardImageWrapper: {
    width: '100%',
    flex: 1,
    position: 'relative',
  },
  modalGridCardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  modalGridCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalGridCardTitleWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(128,128,128,0.4)',
  },
  modalGridCardTitle: {
    fontSize: 11,
    textAlign: 'center',
  },
  noIndividualsText: {
    textAlign: 'center',
    paddingVertical: 40,
    fontSize: 14,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  modalItemShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  modalItemImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  modalItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalItemTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalItemDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cccccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#888888',
    borderColor: '#888888',
  },
  checkboxOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
  },
  checkboxText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
