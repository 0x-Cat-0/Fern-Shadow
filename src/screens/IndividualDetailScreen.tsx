import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Keyboard,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../hooks/useTheme';
import { IndividualRepository, RecordRepository, GroupRepository } from '../database/repositories';
import { copyImageToDocumentDirectory } from '../utils/ImageStorage';
import type { Individual, Record as RecordType, Group, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'IndividualDetail'>;
type IndividualDetailRouteProp = RouteProp<RootStackParamList, 'IndividualDetail'>;

const IMAGE_SIZE = 80;
const IMAGE_GAP = 4;

interface RecordItem {
  id: number;
  date: string;
  dateTimestamp: number;
  title: string;
  description: string;
  imagePaths: string[];
}

export default function IndividualDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<IndividualDetailRouteProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const { individualId } = route.params;

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

  // 是否有今天的记录
  const [hasTodayRecord, setHasTodayRecord] = useState(false);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 当图片索引改变时，滚动到对应位置
  useEffect(() => {
    if (viewingImageIndex !== null && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: viewingImageIndex * Dimensions.get('window').width,
        animated: false,
      });
    }
  }, [viewingImageIndex]);

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
        title: `${dateStr} 记录`,
        description: '',
        recordDate: todayTimestamp,
      });

      // 更新状态
      setHasTodayRecord(true);
      loadData();

      // 显示添加图片弹窗
      setAddImageRecordId(newRecordId);
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
      await saveNewImages([asset.uri], timestamp);
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
      exif: true, // 请求EXIF数据
    });

    if (!result.canceled && result.assets.length > 0) {
      // 按日期分组图片
      const imagesByDate = new Map<number, string[]>();

      for (const asset of result.assets) {
        const uri = asset.uri;
        const timestamp = getImageCreationTime(asset);

        // 找到该日期所在的分组键（使用日期戳的起始-of-day）
        const dayKey = getStartOfDay(timestamp);

        if (!imagesByDate.has(dayKey)) {
          imagesByDate.set(dayKey, []);
        }
        imagesByDate.get(dayKey)!.push(uri);
      }

      // 将图片复制到文档目录
      const permanentUrisByDate = new Map<number, string[]>();
      for (const [dayKey, uris] of imagesByDate) {
        const permanentUris = await Promise.all(uris.map(uri => copyImageToDocumentDirectory(uri)));
        permanentUrisByDate.set(dayKey, permanentUris);
      }

      // 分别保存每个日期组的图片
      for (const [dayKey, permanentUris] of permanentUrisByDate) {
        await saveNewImages(permanentUris, dayKey);
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
    let timestamp: number = Date.now();

    // Cast to any to access runtime properties not in type definition
    const assetAny = asset as any;

    // 优先使用 creationTime
    if (assetAny.creationTime) {
      timestamp = assetAny.creationTime;
    }
    // 尝试从 EXIF 读取 DateTimeOriginal
    else if (assetAny.exif && assetAny.exif.DateTimeOriginal) {
      const dateStr = assetAny.exif.DateTimeOriginal as string;
      const parsed = new Date(dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed.getTime();
      }
    }
    // 尝试从 EXIF 读取 DateTime
    else if (assetAny.exif && assetAny.exif.DateTime) {
      const dateStr = assetAny.exif.DateTime as string;
      const parsed = new Date(dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed.getTime();
      }
    }

    // Check if timestamp is in seconds (Unix timestamp) rather than milliseconds
    // If the resulting date is before 2020, it's likely in seconds
    const date = new Date(timestamp);
    if (date.getFullYear() < 2020) {
      timestamp = timestamp * 1000;
    }

    // Final validation - should be between 2020 and 2100
    const finalDate = new Date(timestamp);
    if (finalDate.getFullYear() < 2020 || finalDate.getFullYear() > 2100) {
      return Date.now();
    }

    return timestamp;
  };

  // 检查时间戳是否是同一天
  const isSameDay = (ts1: number, ts2: number): boolean => {
    const d1 = new Date(ts1);
    const d2 = new Date(ts2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // 保存新图片到记录
  const saveNewImages = async (uris: string[], timestamp: number) => {
    if (uris.length === 0) return;

    try {
      // 先将图片复制到文档目录，获取永久 URI
      const permanentUris = await Promise.all(uris.map(uri => copyImageToDocumentDirectory(uri)));

      // 查找是否有相同日期的记录
      const existingRecord = records.find(r => isSameDay(timestamp, r.dateTimestamp));

      if (existingRecord) {
        // 有相同日期的记录：添加到该记录
        const record = await RecordRepository.findById(existingRecord.id);
        if (record) {
          const existingPaths: string[] = Array.isArray(record.imagePath)
            ? record.imagePath
            : record.imagePath ? [record.imagePath] : [];
          const newPaths = [...existingPaths, ...permanentUris];
          await RecordRepository.update(existingRecord.id, { imagePath: newPaths });
        }
      } else {
        // 没有相同日期的记录：创建新记录
        const imageDate = new Date(timestamp);
        const dateStr = `${String(imageDate.getMonth() + 1).padStart(2, '0')}.${String(imageDate.getDate()).padStart(2, '0')}`;
        await RecordRepository.create({
          individualId,
          imagePath: permanentUris,
          title: `${dateStr} 记录`,
          description: '',
          recordDate: timestamp,
        });
      }
      loadData();
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

      // 从当前记录中移除该图片
      const currentRecord = await RecordRepository.findById(selectedImageInfo.recordId);
      if (currentRecord) {
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
              // console.log('=== Delete Image Debug ===');
              // console.log('Record ID:', selectedImageInfo.recordId);
              // console.log('Image Index:', selectedImageInfo.imageIndex);
              // console.log('Image Path:', selectedImageInfo.imagePath);

              const currentRecord = await RecordRepository.findById(selectedImageInfo.recordId);
              if (!currentRecord) {
                // console.error('Record not found');
                Alert.alert('错误', '记录不存在');
                return;
              }

              const currentPaths: string[] = Array.isArray(currentRecord.imagePath)
                ? currentRecord.imagePath
                : currentRecord.imagePath ? [currentRecord.imagePath] : [];

              // console.log('Current imagePaths:', currentPaths);
              // console.log('Removing index:', selectedImageInfo.imageIndex);

              // 移除指定索引的图片
              const updatedPaths = currentPaths.filter((_, idx) => idx !== selectedImageInfo.imageIndex);
              // console.log('Updated imagePaths:', updatedPaths);

              if (updatedPaths.length === 0) {
                // 如果没有图片了，删除整条记录
                // console.log('No images left, deleting entire record');
                await RecordRepository.delete(selectedImageInfo.recordId);
              } else {
                // 否则更新记录，移除该图片
                // console.log('Updating record with new imagePaths');
                await RecordRepository.update(selectedImageInfo.recordId, { imagePath: updatedPaths });
              }

              // console.log('Delete executed successfully');
              closeLongPressMenu();
              loadData();
            } catch (error) {
              // console.error('Failed to delete image:', error);
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
    const isFirst = index === 0;
    const isEditingTitle = editingTitleId === item.id;
    const isEditingDesc = editingDescId === item.id;

    return (
      <View style={styles.recordItem}>
        {/* 日期 - 左侧固定宽度 */}
        <View style={styles.dateSection}>
          <View style={styles.dateTextWrapper}>
            <Text style={[styles.dateText, { color: '#333333' }]}>{item.date}</Text>
            <Text style={[styles.yearText, { color: '#cccccc' }]}>{formatYear(item.dateTimestamp)}</Text>
          </View>
        </View>

        {/* 节点区域 */}
        <View style={styles.nodeSection}>
          {/* 如果有虚拟今天记录，第一个实际记录需要显示连接线 */}
          {!isFirst && <View style={styles.nodeLineTop} />}
          <View style={[styles.nodeDot, { backgroundColor: '#ffffff', borderColor: '#e0e0e0' }]} />
          <View style={styles.nodeLineBottom} />
        </View>

        {/* 内容区域 */}
        <View style={styles.contentSection}>
          {/* 标题 */}
          {isEditingTitle ? (
            <TextInput
              ref={titleInputRef}
              style={[styles.recordTitle, styles.inlineInput, { color: '#333333', width: measureTextWidth(editTitle) }]}
              value={editTitle}
              onChangeText={setEditTitle}
              onBlur={() => handleSaveTitle(item.id)}
              onSubmitEditing={() => handleSaveTitle(item.id)}
              autoFocus
            />
          ) : (
            <TouchableOpacity onPress={() => handleTitlePress(item)} activeOpacity={0.7} style={styles.inlineTouchable}>
              <Text style={[styles.recordTitle, { color: '#333333' }]}>{item.title}</Text>
            </TouchableOpacity>
          )}

          {/* 描述 */}
          {isEditingDesc ? (
            <TextInput
              ref={descInputRef}
              style={[styles.recordDesc, styles.inlineInput, { color: '#666666', width: measureTextWidth(editDescription || '点击添加描述...') }]}
              value={editDescription}
              onChangeText={setEditDescription}
              onBlur={() => handleSaveDescription(item.id)}
              multiline
              placeholder="点击添加描述..."
              placeholderTextColor="#cccccc"
            />
          ) : (
            <TouchableOpacity onPress={() => handleDescPress(item)} activeOpacity={0.7} style={styles.inlineTouchable}>
              <Text style={[styles.recordDesc, { color: item.description ? '#666666' : '#cccccc' }]}>
                {item.description || '点击添加描述...'}
              </Text>
            </TouchableOpacity>
          )}

          {/* 图片 */}
          <View style={styles.imagesContainer}>
            {item.imagePaths.length > 0 ? (
              <>
                {item.imagePaths.map((path, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      const allPaths = records.map(r => ({ recordId: r.id, paths: r.imagePaths }));
                      handleImagePress(allPaths, path);
                    }}
                    onLongPress={(e) => handleImageLongPress(e, item.id, item.dateTimestamp, path, idx)}
                    delayLongPress={500}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: path }}
                      style={styles.recordImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
                {/* 今天的记录显示添加按钮 */}
                {isToday(item.dateTimestamp) && (
                  <TouchableOpacity
                    style={[styles.recordImage, styles.addImageBtn]}
                    onPress={() => handleAddImage(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addImageIcon}>+</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : isToday(item.dateTimestamp) ? (
              /* 今天无图片时显示占位符 */
              <TouchableOpacity
                style={[styles.recordImage, styles.addImageBtn]}
                onPress={() => handleAddImage(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.addImageIcon}>+</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      <View style={styles.individualCard}>
        <Image
          source={{ uri: individual?.coverImagePath || 'https://picsum.photos/200/200' }}
          style={styles.coverImage}
          resizeMode="cover"
        />
        <View style={styles.infoContent}>
          <Text style={[styles.individualTitle, { color: '#333333' }]}>{individual?.title}</Text>
          {individual?.description ? (
            <Text style={[styles.individualDesc, { color: '#666666' }]} numberOfLines={2}>
              {individual.description}
            </Text>
          ) : null}
          <Text style={[styles.individualStats, { color: '#999999' }]}>
            {records.length} 条记录 · 浏览 {individual?.viewCount || 0}
          </Text>
        </View>
      </View>

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
              style={[styles.recordImage, styles.addImageBtn]}
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
          <Image source={require('../assets/icons/返回.png')} style={{ width: 22, height: 22 }} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: '#333333' }]} numberOfLines={1}>
          {individual?.title}
        </Text>
        <TouchableOpacity style={styles.moreBtn} onPress={handleOpenAddToGroup}>
          <Text style={{ fontSize: 20, color: '#333333', fontWeight: '300' }}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={records}
        renderItem={renderRecordItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: Dimensions.get('window').height * 0.3 + insets.bottom }}
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
      <Modal
        visible={viewingImageIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingImageIndex(null)}
      >
        <View style={styles.imageViewerContainer}>
          {/* 顶部关闭按钮 */}
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={() => setViewingImageIndex(null)}
            >
              <Text style={styles.imageViewerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 图片滑动区域 */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const pageIndex = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
              setViewingImageIndex(pageIndex);
            }}
            scrollEventThrottle={16}
          >
            {viewingImagePaths.map((path, idx) => (
              <View key={idx} style={styles.imageViewerItem}>
                <TouchableOpacity
                  style={styles.imageTouchable}
                  onPress={handleImageViewerTap}
                  activeOpacity={1}
                >
                  <Image
                    source={{ uri: path }}
                    style={styles.imageViewerImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* 页码指示器 */}
          {viewingImagePaths.length > 1 && (
            <View style={styles.imageViewerIndicator}>
              <Text style={styles.imageViewerIndicatorText}>
                {(viewingImageIndex || 0) + 1} / {viewingImagePaths.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* 添加图片弹窗 */}
      <Modal
        visible={showAddImageModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowAddImageModal(false)}
      >
        <TouchableOpacity
          style={styles.addImageModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddImageModal(false)}
        >
          <View style={[styles.addImageModalContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.addImageModalBtn} onPress={takePhoto}>
              <Text style={[styles.addImageModalBtnText, { color: '#333333' }]}>拍照</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addImageModalBtn} onPress={pickFromLibrary}>
              <Text style={[styles.addImageModalBtnText, { color: '#333333' }]}>从相册选择</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addImageModalBtn, styles.addImageModalBtnLast]} onPress={() => setShowAddImageModal(false)}>
              <Text style={[styles.addImageModalBtnText, { color: colors.textDisabled }]}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 长按图片菜单 */}
      <Modal
        visible={showLongPressMenu}
        transparent
        animationType="fade"
        onRequestClose={closeLongPressMenu}
      >
        <TouchableOpacity
          style={styles.longPressOverlay}
          activeOpacity={1}
          onPress={closeLongPressMenu}
        >
          <View
            style={[
              styles.longPressMenu,
              {
                top: Math.min(longPressPosition.y, Dimensions.get('window').height - 150),
                left: Math.min(longPressPosition.x, Dimensions.get('window').width - 120),
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.longPressMenuItem, styles.longPressMenuItemTop]}
              onPress={handleModifyDate}
            >
              <Text style={styles.longPressMenuItemText}>修改日期</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.longPressMenuItem, styles.longPressMenuItemBottom]}
              onPress={handleDeleteRecord}
            >
              <Text style={[styles.longPressMenuItemText, { color: '#FF4040' }]}>删除该记录</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 日期选择器弹窗 */}
      <Modal
        visible={showDatePickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View style={[styles.datePickerContent, { backgroundColor: colors.surface }]}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                <Text style={[styles.datePickerCancel, { color: colors.textDisabled }]}>取消</Text>
              </TouchableOpacity>
              <Text style={[styles.datePickerTitle, { color: colors.textPrimary }]}>选择日期</Text>
              <TouchableOpacity onPress={handleDateConfirm}>
                <Text style={[styles.datePickerConfirm, { color: colors.primary }]}>确认</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerYears}>
              <TouchableOpacity
                style={styles.yearArrow}
                onPress={() => {
                  const newDate = new Date(datePickerValue);
                  newDate.setFullYear(newDate.getFullYear() - 1);
                  setDatePickerValue(newDate);
                }}
              >
                <Text style={styles.yearArrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.datePickerYear, { color: colors.textPrimary }]}>
                {datePickerValue.getFullYear()}年
              </Text>
              <TouchableOpacity
                style={styles.yearArrow}
                onPress={() => {
                  const newDate = new Date(datePickerValue);
                  newDate.setFullYear(newDate.getFullYear() + 1);
                  setDatePickerValue(newDate);
                }}
              >
                <Text style={styles.yearArrowText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerMonths}>
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const isSelected = datePickerValue.getMonth() === i;
                return (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthItem,
                      isSelected && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => {
                      const newDate = new Date(datePickerValue);
                      newDate.setMonth(i);
                      setDatePickerValue(newDate);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthText,
                        { color: isSelected ? '#fff' : colors.textPrimary },
                      ]}
                    >
                      {month}月
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.datePickerDays}>
              {Array.from({ length: 31 }, (_, i) => {
                const day = i + 1;
                const isSelected = datePickerValue.getDate() === day;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayItem,
                      isSelected && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => {
                      const newDate = new Date(datePickerValue);
                      newDate.setDate(day);
                      setDatePickerValue(newDate);
                    }}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: isSelected ? '#fff' : colors.textPrimary },
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* 添加到分组弹窗 */}
      <Modal
        visible={showAddToGroupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddToGroupModal(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View style={[styles.datePickerContent, { backgroundColor: colors.surface }]}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowAddToGroupModal(false)}>
                <Text style={[styles.datePickerCancel, { color: colors.textDisabled }]}>取消</Text>
              </TouchableOpacity>
              <Text style={[styles.datePickerTitle, { color: colors.textPrimary }]}>添加到分组</Text>
              <TouchableOpacity onPress={handleConfirmAddToGroup}>
                <Text style={[styles.datePickerConfirm, { color: colors.primary }]}>完成</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.groupListContainer}>
              {availableGroups.length === 0 ? (
                <Text style={[styles.noGroupsText, { color: colors.textDisabled }]}>暂无分组</Text>
              ) : (
                availableGroups.map(group => (
                  <TouchableOpacity
                    key={group.id}
                    style={styles.groupItem}
                    onPress={() => {
                      setSelectedGroupIds(prev =>
                        prev.includes(group.id)
                          ? prev.filter(id => id !== group.id)
                          : [...prev, group.id]
                      );
                    }}
                  >
                    <Text style={[styles.groupItemText, { color: colors.textPrimary }]}>{group.title}</Text>
                    <View style={[
                      styles.groupCheckbox,
                      selectedGroupIds.includes(group.id) && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}>
                      {selectedGroupIds.includes(group.id) && <Text style={styles.groupCheckboxText}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
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
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#e8e8e8',
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  individualTitle: {
    fontSize: 16,
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
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
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
    backgroundColor: 'rgba(0,0,0,0.95)',
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
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
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
    marginBottom: '20%',
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