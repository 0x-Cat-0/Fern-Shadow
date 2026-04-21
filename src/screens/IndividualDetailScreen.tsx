import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  RefreshControl,
  Image,
  TouchableOpacity,
  Dimensions,
  useWindowDimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

import { useTheme } from '../hooks/useTheme';
import { IndividualRepository, RecordRepository, GroupRepository } from '../database/repositories';
import { copyImageToDocumentDirectory, deleteImage, getImageDirectoryPath } from '../utils/ImageStorage';
import type { Individual, Group, RootStackParamList } from '../types';
import {
  IndividualCard,
  RecordTimelineItem,
  ImageViewerModal,
  AddImageModal,
  CustomGalleryPicker,
  LongPressMenu,
  DatePickerModal,
  AddToGroupModal,
} from '../components';

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
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [addImageRecordId, setAddImageRecordId] = useState<number | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  // 使用系统相册（开关开启时使用系统相册，关闭时使用自定义相册）
  const [useSystemAlbum, setUseSystemAlbum] = useState(false);
  // 是否隐藏已添加的图片（开关开启时隐藏，关闭时显示但标记）- 仅在使用自定义相册时有效
  const [hideAlreadyAdded, setHideAlreadyAdded] = useState(true);
  const [existingAssetIds, setExistingAssetIds] = useState<string[]>([]);  // 该植物已添加的 assetId 列表

  // 自定义相册选择器状态
  const [showCustomGallery, setShowCustomGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<MediaLibrary.Asset[]>([]);
  const [gallerySelectedIds, setGallerySelectedIds] = useState<string[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

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

  // 获取该植物所有已添加图片的 assetId 列表
  const loadExistingAssetIds = useCallback(async () => {
    try {
      const recordsData = await RecordRepository.findByIndividualId(individualId);
      const allAssetIds: string[] = [];
      for (const record of recordsData) {
        const assetIds: string[] = Array.isArray(record.imageAssetIds)
          ? record.imageAssetIds
          : record.imageAssetIds ? [record.imageAssetIds] : [];
        allAssetIds.push(...assetIds);
      }
      setExistingAssetIds(allAssetIds);
    } catch (error) {
      console.error('Failed to load existing assetIds:', error);
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
    const allImages: string[] = [];
    for (const item of allRecordsPaths) {
      allImages.push(...item.paths);
    }
    setViewingImagePaths(allImages);
    const globalIndex = allImages.indexOf(clickedPath);
    setViewingImageIndex(globalIndex >= 0 ? globalIndex : 0);
  };

  // 点击添加图片 - 显示图片选择弹窗
  const handleAddImage = (recordId: number) => {
    setAddImageRecordId(recordId);
    loadExistingAssetIds();  // 加载已添加的 assetId 列表
    setShowAddImageModal(true);
  };

  // 点击虚拟的今天记录 - 创建新记录并显示添加图片弹窗
  const handleAddTodayRecord = async () => {
    try {
      const today = new Date();
      const todayTimestamp = today.getTime();
      const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

      // 创建今天的空记录
      const newRecordId = await RecordRepository.create({
        individualId,
        imagePath: [],
        imageAssetIds: [],
        title: `${dateStr} 记录`,
        description: '',
        recordDate: todayTimestamp,
      });

      // 更新状态
      setHasTodayRecord(true);
      loadData();

      // 显示添加图片弹窗
      setAddImageRecordId(newRecordId);
      loadExistingAssetIds();  // 加载已添加的 assetId 列表
      setShowAddImageModal(true);
    } catch (error) {
      console.error('Failed to create today record:', error);
      Alert.alert('错误', '创建记录失败');
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

  // 请求相机权限
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相机权限才能拍照');
      return false;
    }
    return true;
  };

  // 请求相册权限
  const requestLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相册权限才能选择图片');
      return false;
    }
    return true;
  };

  // 拍照
  const takePhoto = async () => {
    setShowAddImageModal(false);
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const timestamp = getImageCreationTime(asset);
      // 复制到文档目录获取永久路径
      const permanentUri = await copyImageToDocumentDirectory(asset.uri);
      await saveNewImages([permanentUri], timestamp);
    }
  };

  // 从相册选择
  const pickFromLibrary = async () => {
    setShowAddImageModal(false);
    const hasPermission = await requestLibraryPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
      exif: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      // 如果开启隐藏已添加，则过滤掉已存在的 assetId
      let assetsToAdd = result.assets;
      let skippedCount = 0;
      if (hideAlreadyAdded && existingAssetIds.length > 0) {
        const filteredAssets: ImagePicker.ImagePickerAsset[] = [];
        for (const asset of result.assets) {
          if (asset.assetId && existingAssetIds.includes(asset.assetId)) {
            skippedCount++;
          } else {
            filteredAssets.push(asset);
          }
        }
        assetsToAdd = filteredAssets;
        if (skippedCount > 0) {
          Alert.alert('提示', `已跳过 ${skippedCount} 张已添加的图片`);
        }
        if (assetsToAdd.length === 0) {
          Alert.alert('提示', '所有选中的图片都已添加过');
          return;
        }
      }

      // 按日期分组图片，同时收集 assetId
      const imagesByDate = new Map<number, { uris: string[]; assetIds: string[] }>();

      for (const asset of assetsToAdd) {
        const uri = asset.uri;
        const assetId = asset.assetId || '';
        // 尝试从 MediaLibrary 获取完整的时间信息
        const timestamp = await getImageCreationTimeFromUri(uri);

        // 找到该日期所在的分组键（使用日期戳的起始-of-day）
        const dayKey = getStartOfDay(timestamp);

        if (!imagesByDate.has(dayKey)) {
          imagesByDate.set(dayKey, { uris: [], assetIds: [] });
        }
        imagesByDate.get(dayKey)!.uris.push(uri);
        imagesByDate.get(dayKey)!.assetIds.push(assetId);
      }

      // 复制到文档目录并保存
      const imagesToSaveByDate = new Map<number, { uris: string[]; assetIds: string[] }>();

      for (const [dayKey, data] of imagesByDate) {
        const permanentUris = await Promise.all(data.uris.map(uri => copyImageToDocumentDirectory(uri)));
        imagesToSaveByDate.set(dayKey, { uris: permanentUris, assetIds: data.assetIds });
      }

      // 分别保存每个日期组的图片
      for (const [dayKey, data] of imagesToSaveByDate) {
        await saveNewImages(data.uris, dayKey, data.assetIds);
      }
    }
  };

  // 获取指定时间戳的"一天开始"时间戳（00:00:00）
  const getStartOfDay = (timestamp: number): number => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };

  // 获取图片创建时间
  const getImageCreationTime = (asset: ImagePicker.ImagePickerAsset): number => {
    // Cast to any to access runtime properties not in type definition
    const assetAny = asset as any;

    let timestamp: number | null = null;

    // 1. 优先从 EXIF DateTimeOriginal 读取（最可靠的原图时间）
    if (assetAny.exif?.DateTimeOriginal) {
      const dateStr = assetAny.exif.DateTimeOriginal as string;
      // 支持多种格式: "2024:01:15 10:30:00" 或 "2024-01-15 10:30:00"
      const normalizedStr = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
      const parsed = new Date(normalizedStr);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000 && parsed.getFullYear() <= 2100) {
        timestamp = parsed.getTime();
      }
    }

    // 2. 尝试从 EXIF DateTime 读取
    if (timestamp === null && assetAny.exif?.DateTime) {
      const dateStr = assetAny.exif.DateTime as string;
      const normalizedStr = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
      const parsed = new Date(normalizedStr);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000 && parsed.getFullYear() <= 2100) {
        timestamp = parsed.getTime();
      }
    }

    // 3. 尝试从 EXIF 其它字段读取
    if (timestamp === null) {
      const exif = assetAny.exif;
      if (exif) {
        // 尝试 PixelYDimension 和其他可能包含日期的字段
        const possibleDateFields = ['DateTimeDigitized', 'DateTimeOriginal', 'DateTime'];
        for (const field of possibleDateFields) {
          if (exif[field] && timestamp === null) {
            const dateStr = String(exif[field]);
            const normalizedStr = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
            const parsed = new Date(normalizedStr);
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000 && parsed.getFullYear() <= 2100) {
              timestamp = parsed.getTime();
              break;
            }
          }
        }
      }
    }

    // 4. 使用 creationTime（如果是有效的历史时间，且不是最近的时间）
    if (timestamp === null && assetAny.creationTime) {
      const ct = assetAny.creationTime;
      // creationTime 可能是秒或毫秒
      const ctMs = ct < 1e12 ? ct * 1000 : ct;
      const ctDate = new Date(ctMs);
      const now = Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      // 只有当 creationTime 是历史时间（2020-2099）且不是最近3天内的时间才使用
      // 如果是最近的时间，可能是闲鱼等平台保存时的时间戳，不可信
      if (ctDate.getFullYear() >= 2020 && ctDate.getFullYear() <= 2100 && (now - ctMs) > threeDaysMs) {
        timestamp = ctMs;
      }
    }

    // 5. 如果没有有效时间戳，返回当前时间（兜底）
    if (timestamp === null) {
      timestamp = Date.now();
    }

    return timestamp;
  };

  // 从 URI 获取图片创建时间（尝试使用 MediaLibrary 获取完整信息）
  const getImageCreationTimeFromUri = async (uri: string): Promise<number> => {
    try {
      // 尝试使用 MediaLibrary 获取资产的完整信息
      const assetInfo = await MediaLibrary.getAssetInfoAsync(uri);
      if (assetInfo && typeof assetInfo === 'object') {
        const info = assetInfo as any;
        // MediaLibrary 的 assetInfo 通常包含 creationTime
        if (info.creationTime) {
          const ct = info.creationTime;
          const ctMs = ct < 1e12 ? ct * 1000 : ct;
          const ctDate = new Date(ctMs);
          // 验证是否是合理的时间
          if (ctDate.getFullYear() >= 2000 && ctDate.getFullYear() <= 2100) {
            return ctMs;
          }
        }
      }
    } catch (e) {
      // MediaLibrary 可能无法访问该 URI，忽略错误
    }

    // 如果 MediaLibrary 失败，返回当前时间（兜底）
    return Date.now();
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
  const openCustomGallery = async () => {
    setShowAddImageModal(false);

    // 如果使用系统相册，直接调用系统图片选择器
    if (useSystemAlbum) {
      await pickFromImagePicker();
      return;
    }

    try {
      // 尝试使用 MediaLibrary 获取设备相册
      let useMediaLibrary = false;

      try {
        // 先检查 MediaLibrary 是否可用
        const { status: existingStatus } = await MediaLibrary.getPermissionsAsync();

        if (existingStatus === 'granted') {
          useMediaLibrary = true;
        } else {
          // 尝试请求权限
          const { status } = await MediaLibrary.requestPermissionsAsync();
          useMediaLibrary = status === 'granted';
        }
      } catch (e) {
        // MediaLibrary 模块不可用或出错，使用 ImagePicker
        useMediaLibrary = false;
      }

      if (!useMediaLibrary) {
        // 使用 ImagePicker 作为备选
        await pickFromImagePicker();
        return;
      }

      // 使用 MediaLibrary 获取所有图片
      setGalleryLoading(true);
      setGallerySelectedIds([]);

      const assets = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        first: 500,
        sortBy: ['creationTime'],
      });

      setGalleryImages(assets.assets);
      setShowCustomGallery(true);
      setGalleryLoading(false);
    } catch (error) {
      console.error('Failed to load gallery images:', error);
      // 发生错误时自动开启系统相册并回退到 ImagePicker
      setUseSystemAlbum(true);
      await pickFromImagePicker();
    }
  };

  // 使用 ImagePicker 选择图片（回退方案）
  const pickFromImagePicker = async () => {
    try {
      const hasPermission = await requestLibraryPermission();
      if (!hasPermission) {
        Alert.alert('提示', '需要相册权限才能选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
        exif: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        // 直接处理图片
        await processPickerAssets(result.assets);
      }
    } catch (error) {
      console.error('Failed to pick images:', error);
      Alert.alert('错误', '选择图片失败');
    }
  };

  // 处理 ImagePicker 返回的图片（回退方案）
  const processPickerAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    try {
      let assetsToAdd = assets;

      // 如果是隐藏模式，过滤掉已添加的图片
      if (hideAlreadyAdded && existingAssetIds.length > 0) {
        const filteredAssets: ImagePicker.ImagePickerAsset[] = [];
        let skippedCount = 0;
        for (const asset of assets) {
          if (asset.assetId && existingAssetIds.includes(asset.assetId)) {
            skippedCount++;
          } else {
            filteredAssets.push(asset);
          }
        }
        assetsToAdd = filteredAssets;
        if (skippedCount > 0) {
          Alert.alert('提示', `已跳过 ${skippedCount} 张已添加的图片`);
        }
        if (assetsToAdd.length === 0) {
          Alert.alert('提示', '所有选中的图片都已添加过');
          return;
        }
      }

      // 按日期分组图片，同时收集 assetId
      const imagesByDate = new Map<number, { uris: string[]; assetIds: string[] }>();

      for (const asset of assetsToAdd) {
        const uri = asset.uri;
        const assetId = asset.assetId || '';
        const timestamp = getImageCreationTime(asset);
        const dayKey = getStartOfDay(timestamp);

        if (!imagesByDate.has(dayKey)) {
          imagesByDate.set(dayKey, { uris: [], assetIds: [] });
        }
        imagesByDate.get(dayKey)!.uris.push(uri);
        imagesByDate.get(dayKey)!.assetIds.push(assetId);
      }

      // 复制到文档目录并保存
      const imagesToSaveByDate = new Map<number, { uris: string[]; assetIds: string[] }>();

      for (const [dayKey, data] of imagesByDate) {
        const permanentUris = await Promise.all(data.uris.map(uri => copyImageToDocumentDirectory(uri)));
        imagesToSaveByDate.set(dayKey, { uris: permanentUris, assetIds: data.assetIds });
      }

      // 分别保存每个日期组的图片
      for (const [dayKey, data] of imagesToSaveByDate) {
        await saveNewImages(data.uris, dayKey, data.assetIds);
      }
    } catch (error) {
      console.error('Failed to process picker assets:', error);
      Alert.alert('错误', '保存图片失败');
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

      // 如果是隐藏模式，过滤掉已添加的图片
      if (hideAlreadyAdded && existingAssetIds.length > 0) {
        const beforeCount = selectedAssets.length;
        selectedAssets = selectedAssets.filter(img => {
          if (img.id && existingAssetIds.includes(img.id)) {
            return false;
          }
          return true;
        });
        const skippedCount = beforeCount - selectedAssets.length;
        if (skippedCount > 0) {
          Alert.alert('提示', `已跳过 ${skippedCount} 张已添加的图片`);
        }
        if (selectedAssets.length === 0) {
          Alert.alert('提示', '没有可添加的图片');
          return;
        }
      }

      if (selectedAssets.length === 0) {
        Alert.alert('提示', '未找到有效的图片');
        setShowCustomGallery(false);
        return;
      }

      // 获取每个图片的永久 URI
      const assetsWithUri: { uri: string; assetId: string; timestamp: number }[] = [];
      for (const asset of selectedAssets) {
        try {
          const info = await MediaLibrary.getAssetInfoAsync(asset);
          const permanentUri = typeof info === 'string' ? info : info.uri;
          if (permanentUri) {
            assetsWithUri.push({
              uri: permanentUri,
              assetId: asset.id || '',
              timestamp: asset.creationTime || Date.now(),
            });
          }
        } catch (error) {
          console.error('Failed to get asset info:', error);
        }
      }

      // 按日期分组
      const imagesByDate = new Map<number, { uris: string[]; assetIds: string[] }>();
      for (const img of assetsWithUri) {
        const dayKey = getStartOfDay(img.timestamp);
        if (!imagesByDate.has(dayKey)) {
          imagesByDate.set(dayKey, { uris: [], assetIds: [] });
        }
        imagesByDate.get(dayKey)!.uris.push(img.uri);
        imagesByDate.get(dayKey)!.assetIds.push(img.assetId);
      }

      // 复制到文档目录并保存
      const imagesToSaveByDate = new Map<number, { uris: string[]; assetIds: string[] }>();
      for (const [dayKey, data] of imagesByDate) {
        const permanentUris = await Promise.all(data.uris.map(uri => copyImageToDocumentDirectory(uri)));
        imagesToSaveByDate.set(dayKey, { uris: permanentUris, assetIds: data.assetIds });
      }

      // 分别保存每个日期组的图片
      for (const [dayKey, data] of imagesToSaveByDate) {
        await saveNewImages(data.uris, dayKey, data.assetIds);
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
  const saveNewImages = async (uris: string[], timestamp: number, assetIds: string[] = []) => {
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
        const existingAssetIdList: string[] = Array.isArray(existingRecord.imageAssetIds)
          ? existingRecord.imageAssetIds
          : existingRecord.imageAssetIds ? [existingRecord.imageAssetIds] : [];
        const newPaths = [...existingPaths, ...uris];
        const newAssetIds = [...existingAssetIdList, ...assetIds];
        await RecordRepository.update(existingRecord.id, { imagePath: newPaths, imageAssetIds: newAssetIds });
      } else {
        // 没有相同日期的记录：创建新记录
        const imageDate = new Date(timestamp);
        const dateStr = `${String(imageDate.getMonth() + 1).padStart(2, '0')}.${String(imageDate.getDate()).padStart(2, '0')}`;
        await RecordRepository.create({
          individualId,
          imagePath: uris,
          imageAssetIds: assetIds,
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
      const currentAssetIds: string[] = Array.isArray(currentRecord.imageAssetIds)
        ? currentRecord.imageAssetIds
        : currentRecord.imageAssetIds ? [currentRecord.imageAssetIds] : [];
      const updatedPaths = currentPaths.filter((_, idx) => idx !== selectedImageInfo.imageIndex);
      const updatedAssetIds = currentAssetIds.filter((_, idx) => idx !== selectedImageInfo.imageIndex);
      // 获取要移动的图片对应的 assetId
      const movingAssetId = currentAssetIds[selectedImageInfo.imageIndex] || '';

      if (updatedPaths.length === 0) {
        // 如果没有图片了，删除整条记录
        await RecordRepository.delete(selectedImageInfo.recordId);
      } else {
        // 否则更新记录
        await RecordRepository.update(selectedImageInfo.recordId, { imagePath: updatedPaths, imageAssetIds: updatedAssetIds });
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
          const existingAssetIds: string[] = Array.isArray(record.imageAssetIds)
            ? record.imageAssetIds
            : record.imageAssetIds ? [record.imageAssetIds] : [];
          const newPaths = [...existingPaths, selectedImageInfo.imagePath];
          const newAssetIds = [...existingAssetIds, movingAssetId];
          await RecordRepository.update(targetRecord.id, { imagePath: newPaths, imageAssetIds: newAssetIds });
        }
      } else {
        // 创建新记录
        const dateStr = `${String(newDate.getMonth() + 1).padStart(2, '0')}.${String(newDate.getDate()).padStart(2, '0')}`;
        await RecordRepository.create({
          individualId,
          imagePath: [selectedImageInfo.imagePath],
          imageAssetIds: [movingAssetId],
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
              const currentAssetIds: string[] = Array.isArray(currentRecord.imageAssetIds)
                ? currentRecord.imageAssetIds
                : currentRecord.imageAssetIds ? [currentRecord.imageAssetIds] : [];

              // 获取要删除的图片路径
              const imagePathToDelete = currentPaths[selectedImageInfo.imageIndex];

              // 移除指定索引的图片
              const updatedPaths = currentPaths.filter((_, idx) => idx !== selectedImageInfo.imageIndex);
              const updatedAssetIds = currentAssetIds.filter((_, idx) => idx !== selectedImageInfo.imageIndex);

              // 如果是本地文件（documents/images/），删除实际文件
              if (imagePathToDelete && imagePathToDelete.startsWith(getImageDirectoryPath())) {
                await deleteImage(imagePathToDelete);
              }

              if (updatedPaths.length === 0) {
                // 如果没有图片了，删除整条记录
                await RecordRepository.delete(selectedImageInfo.recordId);
              } else {
                // 否则更新记录，移除该图片和对应的 assetId
                await RecordRepository.update(selectedImageInfo.recordId, { imagePath: updatedPaths, imageAssetIds: updatedAssetIds });
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

      {/* 添加图片弹窗 */}
      <AddImageModal
        visible={showAddImageModal}
        useSystemAlbum={useSystemAlbum}
        onUseSystemAlbumToggle={setUseSystemAlbum}
        hideAlreadyAdded={hideAlreadyAdded}
        onHideToggle={setHideAlreadyAdded}
        onClose={() => setShowAddImageModal(false)}
        onTakePhoto={takePhoto}
        onPickFromGallery={openCustomGallery}
      />

      {/* 自定义相册选择器 */}
      <CustomGalleryPicker
        visible={showCustomGallery}
        images={galleryImages}
        selectedIds={gallerySelectedIds}
        existingAssetIds={existingAssetIds}
        hideAlreadyAdded={hideAlreadyAdded}
        loading={galleryLoading}
        onClose={closeCustomGallery}
        onConfirm={confirmGallerySelection}
        onToggleSelection={toggleGallerySelection}
        onHideToggle={setHideAlreadyAdded}
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