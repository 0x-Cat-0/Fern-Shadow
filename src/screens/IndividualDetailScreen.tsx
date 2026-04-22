import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  RefreshControl,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

import { useTheme } from '../hooks/useTheme';
import { IndividualRepository, RecordRepository, GroupRepository } from '../database/repositories';
import type { Individual, Group, RootStackParamList } from '../types';
import {
  IndividualCard,
  RecordTimelineItem,
  ImageViewerModal,
  CustomGalleryPicker,
  LongPressMenu,
  DatePickerModal,
  AddToGroupModal,
} from '../components';

// 标准化 URI：去除查询参数，只保留 content:// path 部分
function normalizeUri(uri: string): string {
  try {
    const url = new URL(uri);
    return url.origin + url.pathname;
  } catch {
    return uri;
  }
}

export interface RecordItem {
  id: number;
  date: string;
  dateTimestamp: number;
  title: string;
  description: string;
  imagePaths: string[];
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'IndividualDetail'>;
type IndividualDetailRouteProp = RouteProp<RootStackParamList, 'IndividualDetail'>;

const IMAGE_GAP = 4;

export default function IndividualDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<IndividualDetailRouteProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const { individualId } = route.params;

  // 计算图片网格尺寸 - 动态调整以适应不同屏幕
  // 布局: dateSection(60) + nodeSection(16) + contentSection(padding 12) + 本组件paddingHorizontal(12)
  // 在contentSection中显示4列图片
  const contentAvailableWidth = screenWidth - 60 - 16 - 12 - 12;
  const imageSize = Math.max(60, (contentAvailableWidth - 3 * IMAGE_GAP) / 4);

  const [individual, setIndividual] = useState<Individual | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 编辑状态
  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [editingDescId, setEditingDescId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // 图片查看状态
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null);
  const [viewingImagePaths, setViewingImagePaths] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // 添加图片状态
  // 该植物已添加的图片 URI 列表（用于相册中判断是否已添加）
  const [existingUris, setExistingUris] = useState<string[]>([]);

  // 自定义相册选择器状态
  const [showCustomGallery, setShowCustomGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<MediaLibrary.Asset[]>([]);
  const [gallerySelectedIds, setGallerySelectedIds] = useState<string[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryHasMore, setGalleryHasMore] = useState(false);
  const [galleryCursor, setGalleryCursor] = useState<string | null>(null);

  // 长按图片菜单状态
  const [showLongPressMenu, setShowLongPressMenu] = useState(false);
  const [longPressPosition, setLongPressPosition] = useState({ x: 0, y: 0 });
  const [selectedImageInfo, setSelectedImageInfo] = useState<{
    recordId: number;
    recordDateTimestamp: number;
    imagePath: string;
    imageIndex: number;
  } | null>(null);

  // 修改日期弹窗状态
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date());

  // 添加到分组弹窗状态
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  // 图片来源选择弹窗状态
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [pendingAddRecordId, setPendingAddRecordId] = useState<number | null>(null);

  const titleInputRef = useRef<TextInput>(null);
  const descInputRef = useRef<TextInput>(null);

  const loadData = useCallback(async () => {
    try {
      const [individualData, recordsData] = await Promise.all([
        IndividualRepository.findById(individualId),
        RecordRepository.findByIndividualId(individualId),
      ]);
      setIndividual(individualData);

      // 增加浏览量
      if (individualData) {
        IndividualRepository.incrementViewCount(individualId);
      }

      const items: RecordItem[] = recordsData.map(r => {
        const paths: string[] = Array.isArray(r.imagePath)
          ? r.imagePath
          : r.imagePath
            ? [r.imagePath]
            : [];
        return {
          id: r.id,
          date: `${String(new Date(r.recordDate).getMonth() + 1).padStart(2, '0')}月${String(new Date(r.recordDate).getDate()).padStart(2, '0')}日`,
          dateTimestamp: r.recordDate,
          title: r.title || '',
          description: r.description || '',
          imagePaths: paths,
        };
      });
      items.sort((a, b) => b.dateTimestamp - a.dateTimestamp);
      setRecords(items);

      // 检查是否有今天的记录
      const todayExists = items.some(item => isToday(item.dateTimestamp));
      setHasTodayRecord(todayExists);
    } catch (error) {
      console.error('Failed to load individual:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [individualId]);

  // 获取该植物所有已添加图片的 URI 列表（用于相册中判断是否已添加）
  const loadExistingUris = useCallback(async () => {
    try {
      const recordsData = await RecordRepository.findByIndividualId(individualId);
      const allUris: string[] = [];
      for (const record of recordsData) {
        const uris: string[] = Array.isArray(record.imagePath)
          ? record.imagePath
          : record.imagePath ? [record.imagePath] : [];
        allUris.push(...uris);
      }
      setExistingUris(allUris);
    } catch (error) {
      console.error('Failed to load existing URIs:', error);
    }
  }, [individualId]);

  // 是否有今天的记录
  const [hasTodayRecord, setHasTodayRecord] = useState(false);

  // 计算陪伴天数和距离上次记录天数
  const getDaysSinceCreation = () => {
    if (records.length === 0) return 0;
    const earliestDate = Math.min(...records.map(r => r.dateTimestamp));
    const today = Date.now();
    return Math.floor((today - earliestDate) / (1000 * 60 * 60 * 24));
  };

  const getDaysSinceLastRecord = () => {
    if (records.length === 0) return 0;
    // 找到最后一条有图片的记录
    const recordsWithImages = records.filter(r => r.imagePaths.length > 0);
    if (recordsWithImages.length === 0) return 0;
    const lastRecordDate = Math.max(...recordsWithImages.map(r => r.dateTimestamp));
    const today = Date.now();
    return Math.floor((today - lastRecordDate) / (1000 * 60 * 60 * 24));
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // 当图片索引改变时，FlatList 使用 initialScrollIndex 自动处理

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // 保存标题
  const handleSaveTitle = async (recordId: number) => {
    if (editTitle.trim() === '') return;
    try {
      await RecordRepository.update(recordId, { title: editTitle.trim() });
      setRecords(records.map(r =>
        r.id === recordId ? { ...r, title: editTitle.trim() } : r
      ));
    } catch (error) {
      console.error('Failed to update title:', error);
    }
    setEditingTitleId(null);
  };

  // 保存描述
  const handleSaveDescription = async (recordId: number) => {
    try {
      await RecordRepository.update(recordId, { description: editDescription.trim() });
      setRecords(records.map(r =>
        r.id === recordId ? { ...r, description: editDescription.trim() } : r
      ));
    } catch (error) {
      console.error('Failed to update description:', error);
    }
    setEditingDescId(null);
  };

  // 点击标题编辑
  const handleTitlePress = (item: RecordItem) => {
    setEditingTitleId(item.id);
    setEditTitle(item.title);
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
  };

  // 点击描述编辑
  const handleDescPress = (item: RecordItem) => {
    setEditingDescId(item.id);
    setEditDescription(item.description);
    setTimeout(() => {
      descInputRef.current?.focus();
    }, 50);
  };

  // 点击图片查看大图 - 支持跨记录滑动
  const handleImagePress = (allRecordsPaths: { recordId: number; paths: string[] }[], clickedPath: string) => {
    const allImages = allRecordsPaths.flatMap(r => r.paths);
    setViewingImagePaths(allImages);
    const globalIndex = allImages.indexOf(clickedPath);
    setViewingImageIndex(globalIndex >= 0 ? globalIndex : 0);
  };

  // 点击添加图片 - 显示图片来源选择弹窗
  const handleAddImage = (recordId: number) => {
    setPendingAddRecordId(recordId);
    setShowImageSourceModal(true);
  };

  // 点击虚拟的今天记录 - 创建新记录并显示图片来源选择弹窗
  const handleAddTodayRecord = async () => {
    try {
      const today = new Date();
      const todayTimestamp = today.getTime();
      const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

      // 创建今天的空记录
      const newRecordId = await RecordRepository.create({
        individualId,
        imagePath: [],
        title: `${dateStr} 记录`,
        description: '',
        recordDate: todayTimestamp,
      });

      // 更新状态
      setHasTodayRecord(true);
      loadData();

      // 显示图片来源选择弹窗
      setPendingAddRecordId(newRecordId);
      setShowImageSourceModal(true);
    } catch (error) {
      console.error('Failed to create today record:', error);
      Alert.alert('错误', '创建记录失败');
    }
  };

  // 图片来源选择 - 拍照
  const handleImageSourceCamera = async () => {
    setShowImageSourceModal(false);

    try {
      const hasPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!hasPermission) {
        Alert.alert('权限不足', '需要相机权限才能拍照');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        // 保存到系统相册
        try {
          await MediaLibrary.createAssetAsync(asset.uri);
        } catch (e) {
          console.error('Failed to save to album:', e);
        }
        // 直接添加到记录（静默添加）
        await addImageToRecord(pendingAddRecordId, asset.uri);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
    }
    setPendingAddRecordId(null);
  };

  // 图片来源选择 - 从相册选择
  const handleImageSourceGallery = async () => {
    setShowImageSourceModal(false);
    await loadExistingUris();
    openGalleryPicker();
  };

  // 添加图片到记录
  const addImageToRecord = async (recordId: number | null, uri: string) => {
    if (!recordId) return;

    try {
      const timestamp = Date.now();
      const currentRecord = await RecordRepository.findById(recordId);
      if (!currentRecord) return;

      const existingPaths: string[] = Array.isArray(currentRecord.imagePath)
        ? currentRecord.imagePath
        : currentRecord.imagePath ? [currentRecord.imagePath] : [];

      const newPaths = [...existingPaths, uri];
      await RecordRepository.update(recordId, { imagePath: newPaths });
      loadData();
    } catch (error) {
      console.error('Failed to add image:', error);
    }
  };

  // 检查是否是今天的记录
  const isToday = (timestamp: number): boolean => {
    const today = new Date();
    const recordDate = new Date(timestamp);
    return today.getFullYear() === recordDate.getFullYear() &&
           today.getMonth() === recordDate.getMonth() &&
           today.getDate() === recordDate.getDate();
  };

  // 获取指定时间戳的"一天开始"时间戳（00:00:00）
  const getStartOfDay = (timestamp: number): number => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };

  // 检查时间戳是否是同一天
  const isSameDay = (ts1: number, ts2: number): boolean => {
    const d1 = new Date(ts1);
    const d2 = new Date(ts2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // 打开自定义相册选择器
  const openGalleryPicker = async () => {
    try {
      setGalleryLoading(true);
      setGallerySelectedIds([]);
      setGalleryImages([]);

      // 检查 MediaLibrary 权限
      let hasPermission = false;
      try {
        const { status } = await MediaLibrary.getPermissionsAsync();
        hasPermission = status === 'granted';
        if (!hasPermission) {
          const { status: reqStatus } = await MediaLibrary.requestPermissionsAsync();
          hasPermission = reqStatus === 'granted';
        }
      } catch (e) {
        hasPermission = false;
      }

      if (!hasPermission) {
        Alert.alert('权限不足', '需要相册权限才能选择图片');
        setGalleryLoading(false);
        return;
      }

      // 使用 MediaLibrary 获取图片（分页加载，每页500张）
      const assets = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        first: 500,
        sortBy: ['creationTime'],
      });

      setGalleryImages(assets.assets);
      setGalleryCursor(assets.endCursor || null);
      setGalleryHasMore(assets.hasNextPage || false);
      setShowCustomGallery(true);
    } catch (error) {
      console.error('Failed to load gallery images:', error);
      Alert.alert('错误', '加载图片失败');
    } finally {
      setGalleryLoading(false);
    }
  };

  // 加载更多图片
  const loadMoreGalleryImages = async () => {
    if (galleryLoading || !galleryHasMore || !galleryCursor) return;

    try {
      setGalleryLoading(true);
      const assets = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        first: 500,
        after: galleryCursor,
        sortBy: ['creationTime'],
      });

      setGalleryImages(prev => [...prev, ...assets.assets]);
      setGalleryCursor(assets.endCursor || null);
      setGalleryHasMore(assets.hasNextPage || false);
    } catch (error) {
      console.error('Failed to load more gallery images:', error);
    } finally {
      setGalleryLoading(false);
    }
  };

  // 切换图片选择状态
  const toggleGallerySelection = (asset: MediaLibrary.Asset) => {
    const assetId = asset.id;
    if (!assetId) return;

    setGallerySelectedIds(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId);
      } else {
        return [...prev, assetId];
      }
    });
  };

  // 确认相册选择
  const confirmGallerySelection = async () => {
    if (gallerySelectedIds.length === 0) {
      Alert.alert('提示', '请先选择图片');
      return;
    }

    try {
      // 获取选中的图片资源
      let selectedAssets = galleryImages.filter(img => img.id && gallerySelectedIds.includes(img.id));

      // 过滤掉已添加的图片（使用 URI 判断）
      if (existingUris.length > 0) {
        const beforeCount = selectedAssets.length;
        const normalizedExisting = existingUris.map(normalizeUri);
        selectedAssets = selectedAssets.filter(img => {
          const normalizedImgUri = normalizeUri(img.uri);
          return !normalizedExisting.includes(normalizedImgUri);
        });
        const skippedCount = beforeCount - selectedAssets.length;
        if (skippedCount > 0) {
          Alert.alert('提示', `已跳过 ${skippedCount} 张已添加的图片`);
        }
        if (selectedAssets.length === 0) {
          setShowCustomGallery(false);
          return;
        }
      }

      // 直接使用原始 URI，不调用 getAssetInfoAsync
      const assetsWithUri: { uri: string; timestamp: number }[] = selectedAssets.map(asset => ({
        uri: asset.uri,
        timestamp: asset.creationTime || Date.now(),
      }));

      // 按日期分组
      const imagesByDate = new Map<number, { uris: string[] }>();
      for (const img of assetsWithUri) {
        const dayKey = getStartOfDay(img.timestamp);
        if (!imagesByDate.has(dayKey)) {
          imagesByDate.set(dayKey, { uris: [] });
        }
        imagesByDate.get(dayKey)!.uris.push(img.uri);
      }

      // 保存图片（直接使用原始 URI，不复制）
      for (const [dayKey, data] of imagesByDate) {
        await saveNewImages(data.uris, dayKey);
      }

      setShowCustomGallery(false);
      setGallerySelectedIds([]);
      setGalleryImages([]);
    } catch (error) {
      console.error('Failed to save gallery images:', error);
      Alert.alert('错误', '保存图片失败');
    }
  };

  // 关闭自定义相册选择器
  const closeCustomGallery = () => {
    setShowCustomGallery(false);
    setGallerySelectedIds([]);
    setGalleryImages([]);
  };

  // 保存新图片到记录
  const saveNewImages = async (uris: string[], timestamp: number) => {
    if (uris.length === 0) return;

    try {
      // 查询数据库确认当天是否有记录（不依赖本地records状态）
      const existingRecords = await RecordRepository.findByIndividualId(individualId);
      const existingRecord = existingRecords.find(r => isSameDay(timestamp, r.recordDate));

      if (existingRecord) {
        // 有相同日期的记录：添加到该记录
        const existingPaths: string[] = Array.isArray(existingRecord.imagePath)
          ? existingRecord.imagePath
          : existingRecord.imagePath ? [existingRecord.imagePath] : [];
        const newPaths = [...existingPaths, ...uris];
        await RecordRepository.update(existingRecord.id, { imagePath: newPaths });
      } else {
        // 没有相同日期的记录：创建新记录
        const imageDate = new Date(timestamp);
        const dateStr = `${String(imageDate.getMonth() + 1).padStart(2, '0')}.${String(imageDate.getDate()).padStart(2, '0')}`;
        await RecordRepository.create({
          individualId,
          imagePath: uris,
          title: `${dateStr} 记录`,
          description: '',
          recordDate: timestamp,
        });
      }
      // 等待loadData完成后再返回
      await loadData();
    } catch (error) {
      console.error('Failed to save images:', error);
      Alert.alert('错误', '保存图片失败');
    }
  };

  // 点击图片关闭查看器
  const handleImageViewerTap = () => {
    setViewingImageIndex(null);
  };

  // 长按图片 - 显示菜单
  const handleImageLongPress = (
    event: any,
    recordId: number,
    recordDateTimestamp: number,
    imagePath: string,
    imageIndex: number
  ) => {
    const { pageX, pageY } = event.nativeEvent;
    setLongPressPosition({ x: pageX, y: pageY });
    setSelectedImageInfo({
      recordId,
      recordDateTimestamp,
      imagePath,
      imageIndex,
    });
    setShowLongPressMenu(true);
  };

  // 关闭长按菜单
  const closeLongPressMenu = () => {
    setShowLongPressMenu(false);
    setSelectedImageInfo(null);
  };

  // 修改日期
  const handleModifyDate = () => {
    if (!selectedImageInfo) return;
    setDatePickerValue(new Date(selectedImageInfo.recordDateTimestamp));
    setShowLongPressMenu(false);
    setShowDatePickerModal(true);
  };

  // 确认修改日期
  const handleDateConfirm = async () => {
    if (!selectedImageInfo) return;

    const newTimestamp = datePickerValue.getTime();
    const newDate = datePickerValue;

    try {
      // 如果日期没变，不做处理
      if (isSameDay(newTimestamp, selectedImageInfo.recordDateTimestamp)) {
        setShowDatePickerModal(false);
        setSelectedImageInfo(null);
        return;
      }

      // 获取当前记录
      const currentRecord = await RecordRepository.findById(selectedImageInfo.recordId);
      if (!currentRecord) {
        Alert.alert('错误', '记录不存在');
        return;
      }

      const currentPaths: string[] = Array.isArray(currentRecord.imagePath)
        ? currentRecord.imagePath
        : currentRecord.imagePath ? [currentRecord.imagePath] : [];
      const updatedPaths = currentPaths.filter((_, idx) => idx !== selectedImageInfo.imageIndex);

      if (updatedPaths.length === 0) {
        // 如果没有图片了，删除整条记录
        await RecordRepository.delete(selectedImageInfo.recordId);
      } else {
        // 否则更新记录
        await RecordRepository.update(selectedImageInfo.recordId, { imagePath: updatedPaths });
      }

      // 查找目标日期是否有记录
      const targetRecord = records.find(r => isSameDay(newTimestamp, r.dateTimestamp) && r.id !== selectedImageInfo.recordId);

      if (targetRecord) {
        // 合并到目标记录
        const record = await RecordRepository.findById(targetRecord.id);
        if (record) {
          const existingPaths: string[] = Array.isArray(record.imagePath)
            ? record.imagePath
            : record.imagePath ? [record.imagePath] : [];
          const newPaths = [...existingPaths, selectedImageInfo.imagePath];
          await RecordRepository.update(targetRecord.id, { imagePath: newPaths });
        }
      } else {
        // 创建新记录
        const dateStr = `${String(newDate.getMonth() + 1).padStart(2, '0')}.${String(newDate.getDate()).padStart(2, '0')}`;
        await RecordRepository.create({
          individualId,
          imagePath: [selectedImageInfo.imagePath],
          title: `${dateStr} 记录`,
          description: '',
          recordDate: newTimestamp,
        });
      }

      setShowDatePickerModal(false);
      setSelectedImageInfo(null);
      loadData();
    } catch (error) {
      console.error('Failed to modify date:', error);
      Alert.alert('错误', '修改日期失败');
    }
  };

  // 删除该图片（不是删除整条记录）
  const handleDeleteRecord = () => {
    if (!selectedImageInfo) return;

    Alert.alert(
      '确认删除',
      '确定要删除该图片吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentRecord = await RecordRepository.findById(selectedImageInfo.recordId);
              if (!currentRecord) {
                Alert.alert('错误', '记录不存在');
                return;
              }

              const currentPaths: string[] = Array.isArray(currentRecord.imagePath)
                ? currentRecord.imagePath
                : currentRecord.imagePath ? [currentRecord.imagePath] : [];

              // 移除指定索引的图片
              const updatedPaths = currentPaths.filter((_, idx) => idx !== selectedImageInfo.imageIndex);

              if (updatedPaths.length === 0) {
                // 如果没有图片了，删除整条记录
                await RecordRepository.delete(selectedImageInfo.recordId);
              } else {
                // 否则更新记录
                await RecordRepository.update(selectedImageInfo.recordId, { imagePath: updatedPaths });
              }

              closeLongPressMenu();
              loadData();
            } catch (error) {
              console.error('Failed to delete image:', error);
              Alert.alert('错误', '删除图片失败');
            }
          },
        },
      ]
    );
  };

  // 打开添加到分组弹窗
  const handleOpenAddToGroup = async () => {
    try {
      // 加载所有分组
      const allGroups = await GroupRepository.findAll();
      setAvailableGroups(allGroups);

      // 获取当前个体已经属于的分组
      const memberGroups = await GroupRepository.getGroupsForIndividual(individualId);
      setSelectedGroupIds(memberGroups.map(g => g.id));

      setShowAddToGroupModal(true);
    } catch (error) {
      console.error('Failed to load groups:', error);
      Alert.alert('错误', '加载分组失败');
    }
  };

  // 确认添加到分组
  const handleConfirmAddToGroup = async () => {
    try {
      // 获取当前个体已经属于的分组
      const currentGroups = await GroupRepository.getGroupsForIndividual(individualId);
      const currentGroupIds = currentGroups.map(g => g.id);

      // 计算需要添加的分组
      const toAdd = selectedGroupIds.filter(id => !currentGroupIds.includes(id));
      // 计算需要移除的分组
      const toRemove = currentGroupIds.filter(id => !selectedGroupIds.includes(id));

      // 添加到新分组
      for (const groupId of toAdd) {
        await GroupRepository.addIndividualsToGroup(groupId, [individualId]);
      }

      // 从旧分组移除
      for (const groupId of toRemove) {
        await GroupRepository.removeIndividualFromGroup(groupId, individualId);
      }

      setShowAddToGroupModal(false);
      Alert.alert('成功', '已更新所属分组');
    } catch (error) {
      console.error('Failed to update groups:', error);
      Alert.alert('错误', '更新分组失败');
    }
  };

  // 测量文字宽度
  const measureTextWidth = (text: string): number => {
    // 粗略估算：每字符约8px宽度
    return Math.max(50, text.length * 8 + 10);
  };

  // 格式化年份
  const formatYear = (timestamp: number): string => {
    return String(new Date(timestamp).getFullYear());
  };

  const renderRecordItem = ({ item, index }: { item: RecordItem; index: number }) => {
    return (
      <RecordTimelineItem
        item={item}
        index={index}
        isFirst={index === 0}
        isToday={isToday}
        imageSize={imageSize}
        editingTitleId={editingTitleId}
        editingDescId={editingDescId}
        editTitle={editTitle}
        editDescription={editDescription}
        onTitlePress={handleTitlePress}
        onDescPress={handleDescPress}
        onSaveTitle={handleSaveTitle}
        onSaveDescription={handleSaveDescription}
        onImagePress={handleImagePress}
        onImageLongPress={handleImageLongPress}
        onAddImage={handleAddImage}
        records={records}
        titleInputRef={titleInputRef as any}
        descInputRef={descInputRef as any}
        setEditTitle={setEditTitle}
        setEditDescription={setEditDescription}
      />
    );
  };

  const renderHeader = () => (
    <>
      <IndividualCard
        individual={individual}
        daysSinceCreation={getDaysSinceCreation()}
        daysSinceLastRecord={getDaysSinceLastRecord()}
        recordCount={records.length}
        totalImages={records.reduce((sum, r) => sum + r.imagePaths.length, 0)}
      />

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: '#333333' }]}>时间线</Text>
      </View>

      {/* 如果没有今天的记录，显示虚拟的今天记录 */}
      {!hasTodayRecord && (
        <View style={styles.recordItem}>
          <View style={styles.dateSection}>
            <View style={styles.dateTextWrapper}>
              <Text style={[styles.dateText, { color: '#333333' }]}>
                {`${String(new Date().getMonth() + 1).padStart(2, '0')}月${String(new Date().getDate()).padStart(2, '0')}日`}
              </Text>
              <Text style={[styles.yearText, { color: '#cccccc' }]}>{new Date().getFullYear()}</Text>
            </View>
          </View>
          <View style={styles.nodeSection}>
            <View style={[styles.nodeDot, { backgroundColor: '#FF4040', borderColor: '#FF4040' }]} />
            <View style={styles.nodeLineBottom} />
          </View>
          <View style={styles.contentSection}>
            <TouchableOpacity
              style={[styles.recordImage, styles.addImageBtn, { width: imageSize, height: imageSize }]}
              onPress={handleAddTodayRecord}
              activeOpacity={0.7}
            >
              <Text style={styles.addImageIcon}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📷</Text>
      <Text style={[styles.emptyText, { color: '#999999' }]}>暂无记录</Text>
    </View>
  );

  if (!individual && !loading) {
    return (
      <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
        <View style={{ height: insets.top, backgroundColor: colors.surface }} />
        <View style={[styles.topBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={{ fontSize: 22, color: '#333333' }}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: '#333333' }]}>个体详情</Text>
          <View style={styles.topRight} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>❌</Text>
          <Text style={[styles.emptyText, { color: '#999999' }]}>个体不存在</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />

      <View style={[styles.topBar, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={require('../../assets/icons/back.png')} style={{ width: 22, height: 22 }} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: '#333333' }]} numberOfLines={1}>
          {individual?.title}
        </Text>
        <TouchableOpacity style={styles.moreBtn} onPress={() => navigation.navigate('EditIndividual', { individualId })}>
          <Image source={require('../../assets/icons/edit.png')} style={{ width: 22, height: 22 }} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={records}
        renderItem={renderRecordItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: screenHeight * 0.3 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        bounces={true}
        alwaysBounceVertical={true}
      />

      {/* 图片查看器 */}
      <ImageViewerModal
        visible={viewingImageIndex !== null}
        imagePaths={viewingImagePaths}
        currentIndex={viewingImageIndex}
        onClose={() => setViewingImageIndex(null)}
        scrollViewRef={scrollViewRef as any}
      />

      {/* 自定义相册选择器 */}
      <CustomGalleryPicker
        visible={showCustomGallery}
        images={galleryImages}
        selectedIds={gallerySelectedIds}
        existingUris={[
          ...existingUris,
          ...galleryImages
            .filter(img => img.id && gallerySelectedIds.includes(img.id))
            .map(img => img.uri)
        ]}
        loading={galleryLoading}
        hasMore={galleryHasMore}
        onLoadMore={loadMoreGalleryImages}
        onClose={closeCustomGallery}
        onConfirm={confirmGallerySelection}
        onToggleSelection={toggleGallerySelection}
      />

      {/* 长按图片菜单 */}
      <LongPressMenu
        visible={showLongPressMenu}
        position={longPressPosition}
        onClose={closeLongPressMenu}
        onModifyDate={handleModifyDate}
        onDeleteRecord={handleDeleteRecord}
      />

      {/* 日期选择器弹窗 */}
      <DatePickerModal
        visible={showDatePickerModal}
        value={datePickerValue}
        onValueChange={setDatePickerValue}
        onClose={() => setShowDatePickerModal(false)}
        onConfirm={handleDateConfirm}
      />

      {/* 添加到分组弹窗 */}
      <AddToGroupModal
        visible={showAddToGroupModal}
        groups={availableGroups}
        selectedGroupIds={selectedGroupIds}
        onClose={() => setShowAddToGroupModal(false)}
        onConfirm={handleConfirmAddToGroup}
        onToggleGroup={(groupId) => {
          setSelectedGroupIds(prev =>
            prev.includes(groupId)
              ? prev.filter(id => id !== groupId)
              : [...prev, groupId]
          );
        }}
      />

      {/* 图片来源选择弹窗 */}
      <Modal
        visible={showImageSourceModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowImageSourceModal(false)}
      >
        <TouchableOpacity
          style={styles.addImageModalOverlay}
          activeOpacity={1}
          onPress={() => setShowImageSourceModal(false)}
        >
          <View style={[styles.addImageModalContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.addImageModalBtn} onPress={handleImageSourceCamera}>
              <Text style={[styles.addImageModalBtnText, { color: colors.textPrimary }]}>拍照</Text>
            </TouchableOpacity>
            <View style={[styles.addImageModalDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.addImageModalBtn} onPress={handleImageSourceGallery}>
              <Text style={[styles.addImageModalBtnText, { color: colors.textPrimary }]}>从相册选择</Text>
            </TouchableOpacity>
            <View style={[styles.addImageModalDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={[styles.addImageModalBtn, styles.addImageModalBtnLast]} onPress={() => setShowImageSourceModal(false)}>
              <Text style={[styles.addImageModalBtnText, { color: colors.textDisabled }]}>取消</Text>
            </TouchableOpacity>
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
  topBar: {
    width: '100%',
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
  topRight: {
    width: 32,
  },
  moreBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  individualCard: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  coverImage: {
    width: 100,
    height: 120,
    borderRadius: 6,
    backgroundColor: '#e8e8e8',
  },
  infoContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  infoTop: {
    gap: 4,
    paddingTop: 8,
  },
  infoBottom: {
    gap: 4,
  },
  individualTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  individualDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  individualStats: {
    fontSize: 12,
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  recordItem: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  dateSection: {
    width: 60,
    alignItems: 'flex-end',
  },
  dateTextWrapper: {
    alignItems: 'flex-end',
    width: 60,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  yearText: {
    fontSize: 10,
    marginTop: 2,
  },
  nodeSection: {
    width: 16,
    alignItems: 'center',
  },
  nodeLineTop: {
    position: 'absolute',
    top: 0,
    width: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
  },
  nodeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginTop: 1,
  },
  nodeLineBottom: {
    position: 'absolute',
    top: 11,
    bottom: -20,
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  contentSection: {
    flex: 1,
    paddingLeft: 12,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  recordDesc: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  inlineInput: {
    padding: 0,
    margin: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#999999',
    backgroundColor: 'transparent',
  },
  inlineTouchable: {
    alignSelf: 'flex-start',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IMAGE_GAP,
    marginTop: 8,
  },
  recordImage: {
    borderRadius: 4,
    backgroundColor: '#e8e8e8',
  },
  addImageBtn: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageIcon: {
    fontSize: 32,
    color: '#cccccc',
    fontWeight: '300',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageViewerHeader: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  imageViewerClose: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseText: {
    fontSize: 24,
    color: '#ffffff',
  },
  imageViewerItem: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerIndicator: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  imageViewerIndicatorText: {
    color: '#ffffff',
    fontSize: 12,
  },
  imageScrollView: {
    flex: 1,
  },
  imageScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  addImageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  addImageModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 40,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  addImageHideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  addImageHideToggleText: {
    fontSize: 15,
  },
  addImageModalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  addImageModalToggleText: {
    fontSize: 15,
  },
  addImageModeSelector: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  addImageModeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  addImageModeLabel: {
    fontSize: 14,
  },
  addImageModeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  addImageModeBtnText: {
    fontSize: 13,
  },
  addImageModalDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  addImageModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  addImageModalBtn: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  addImageModalBtnLast: {
    borderBottomWidth: 0,
  },
  addImageModalBtnText: {
    fontSize: 16,
  },
  // 自定义相册选择器
  customGalleryContainer: {
    flex: 1,
  },
  customGalleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  customGalleryCancelText: {
    fontSize: 16,
  },
  customGalleryTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  customGalleryConfirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customGalleryModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  customGalleryModeText: {
    fontSize: 14,
  },
  customGalleryGrid: {
    padding: 2,
  },
  customGalleryItem: {
    width: '25%',
    aspectRatio: 1,
    padding: 2,
  },
  customGalleryItemDisabled: {
    opacity: 0.3,
  },
  customGalleryImage: {
    flex: 1,
    borderRadius: 4,
  },
  customGalleryImageDisabled: {
    opacity: 0.5,
  },
  customGalleryMarkedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    margin: 2,
  },
  customGalleryMarkedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customGalleryMarkedCheck: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  customGallerySelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderRadius: 4,
    margin: 2,
  },
  customGallerySelectedIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customGallerySelectedCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  customGalleryLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customGalleryEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 长按菜单
  longPressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  longPressMenu: {
    position: 'absolute',
    width: 120,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  longPressMenuItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  longPressMenuItemTop: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  longPressMenuItemBottom: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  longPressMenuItemText: {
    fontSize: 14,
    color: '#333333',
  },
  // 日期选择器
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerCancel: {
    fontSize: 16,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerConfirm: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerYears: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  yearArrow: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearArrowText: {
    fontSize: 24,
    color: '#333333',
  },
  datePickerYear: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
  },
  datePickerMonths: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthItem: {
    width: '23%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 8,
  },
  monthText: {
    fontSize: 14,
  },
  datePickerDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayItem: {
    width: '14%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  dayText: {
    fontSize: 14,
  },
  // 添加到分组
  groupListContainer: {
    maxHeight: 400,
  },
  noGroupsText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  groupItemText: {
    fontSize: 15,
  },
  groupCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cccccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupCheckboxText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});