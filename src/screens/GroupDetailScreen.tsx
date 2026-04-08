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
  Dimensions,
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
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const containerPadding = spacing.md;
const numColumns = 3;
const itemWidth = (SCREEN_WIDTH - containerPadding * 2 - CARD_GAP * (numColumns - 1)) / numColumns;
const itemHeight = itemWidth + 40;

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

  // 添加个体弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [allIndividuals, setAllIndividuals] = useState<Individual[]>([]);
  const [selectedIndividualIds, setSelectedIndividualIds] = useState<number[]>([]);
  const [addingToGroup, setAddingToGroup] = useState(false);

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

  // 编辑个体
  const handleEditIndividual = (individual: Individual) => {
    setSelectedIndividualId(null);
    navigation.navigate('EditIndividual', { individualId: individual.id });
  };

  // 从分组移除个体（不是删除个体本身）
  const handleRemoveFromGroup = (individual: Individual) => {
    setSelectedIndividualId(null);
    Alert.alert(
      '确认移除',
      `确定要从分组中移除"${individual.title}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'destructive',
          onPress: async () => {
            try {
              await GroupRepository.removeIndividualFromGroup(groupId, individual.id);
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
          <Image source={require('../assets/icons/编辑.png')} style={{ width: 22, height: 22 }} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={stylesDetail.scrollView}
        contentContainerStyle={[stylesDetail.scrollContent, { paddingBottom: insets.bottom + spacing.lg }]}
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
            source={{ uri: group?.coverImagePath || 'https://picsum.photos/400/200' }}
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
                    <TouchableOpacity
                      key="add-btn"
                      style={[stylesDetail.gridAddBtn, { width: itemWidth, height: itemHeight }]}
                      onPress={handleOpenAddModal}
                      activeOpacity={0.7}
                    >
                      <Text style={stylesDetail.gridAddBtnText}>+</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <View
                    key={item.id}
                    style={[
                      stylesDetail.gridCardWrapper,
                      { width: itemWidth, height: itemHeight },
                      selectedIndividualId === item.id && stylesDetail.cardSelected,
                    ]}
                  >
                    <TouchableOpacity
                      style={stylesDetail.gridCard}
                      onPress={() => handleCardPress(item)}
                      onLongPress={() => setSelectedIndividualId(item.id)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: item.coverImagePath || 'https://picsum.photos/200/200' }}
                        style={[stylesDetail.gridCardImage, { width: itemWidth, height: itemWidth }]}
                        resizeMode="cover"
                      />
                      <View style={stylesDetail.gridCardContent}>
                        <Text style={[stylesDetail.gridCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={[stylesDetail.gridCardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                          浏览 {item.viewCount}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {/* 编辑/移除按钮 - 独立于卡片 */}
                    {selectedIndividualId === item.id && (
                      <View
                        style={[stylesDetail.cardActionOverlay, stylesDetail.cardActionOverlayAbsolute]}
                        pointerEvents="box-none"
                      >
                        <View style={stylesDetail.cardActionOverlayBg} pointerEvents="none" />
                        <View style={stylesDetail.cardActionBtns} pointerEvents="box-none">
                          <TouchableOpacity
                            style={stylesDetail.cardActionBtn}
                            onPress={() => {
                              handleEditIndividual(item);
                            }}
                          >
                            <Text style={[stylesDetail.cardActionBtnText, { color: '#666666' }]}>编辑</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={stylesDetail.cardActionBtn}
                            onPress={() => {
                              handleRemoveFromGroup(item);
                            }}
                          >
                            <Text style={[stylesDetail.cardActionBtnText, { color: '#FF4040' }]}>移除</Text>
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
                  <View key={`placeholder-${i}`} style={[stylesDetail.gridCardPlaceholder, { width: itemWidth, height: itemHeight }]} />
                ))}
            </View>
          ))}
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
            style={[stylesDetail.modalContent, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={stylesDetail.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={[stylesDetail.modalCancel, { color: colors.textDisabled }]}>取消</Text>
              </TouchableOpacity>
              <Text style={[stylesDetail.modalTitle, { color: colors.textPrimary }]}>添加个体</Text>
              <TouchableOpacity onPress={handleConfirmAdd} disabled={addingToGroup}>
                <Text style={[stylesDetail.modalConfirm, { color: addingToGroup ? colors.textDisabled : colors.primary }]}>
                  完成{selectedIndividualIds.length > 0 ? ` (${selectedIndividualIds.length})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={stylesDetail.modalList}>
              {allIndividuals.length === 0 ? (
                <Text style={[stylesDetail.noIndividualsText, { color: colors.textDisabled }]}>暂无可添加的个体</Text>
              ) : (
                allIndividuals.map(individual => (
                  <TouchableOpacity
                    key={individual.id}
                    style={stylesDetail.modalItem}
                    onPress={() => toggleIndividualSelection(individual.id)}
                  >
                    <Image
                      source={{ uri: individual.coverImagePath || 'https://picsum.photos/200/200' }}
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
                      selectedIndividualIds.includes(individual.id) && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}>
                      {selectedIndividualIds.includes(individual.id) && <Text style={stylesDetail.checkboxText}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                ))
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
    width: itemWidth,
    height: itemHeight,
    borderRadius: 4,
    overflow: 'visible',
    marginRight: CARD_GAP,
  },
  gridCardPlaceholder: {
    borderRadius: 4,
    backgroundColor: 'transparent',
    marginRight: CARD_GAP,
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
    marginRight: CARD_GAP,
  },
  gridAddBtnText: {
    fontSize: 32,
    color: '#cccccc',
    fontWeight: '300',
  },
  deselectOverlay: {
    position: 'absolute',
    top: 50,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
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
  checkboxText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
