import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../hooks/useTheme';
import { IndividualRepository, RecordRepository, GroupRepository } from '../database/repositories';
import { copyImagesToDocumentDirectory } from '../utils/ImageStorage';
import { spacing, layout } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { RootStackParamList, Group } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateIndividual'>;
type CreateIndividualRouteProp = RouteProp<RootStackParamList, 'CreateIndividual'>;

interface SelectedImage {
  uri: string;
  width: number;
  height: number;
  creationTime: number | null;
  permanentUri?: string;
}

export default function CreateIndividualScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CreateIndividualRouteProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const imageSource = route.params?.imageSource;

  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);

  React.useEffect(() => {
    loadGroups();
    if (imageSource === 'camera') {
      takePhoto();
    } else if (imageSource === 'library') {
      pickImagesFromLibrary();
    }
  }, [imageSource]);

  const loadGroups = async () => {
    try {
      const data = await GroupRepository.findAll();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const requestPermission = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相机权限才能拍照');
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相册权限才能选择图片');
        return false;
      }
    }
    return true;
  };

  const getImageCreationTime = (asset: ImagePicker.ImagePickerAsset): number | null => {
    let timestamp: number | null = null;

    // Cast to any to access runtime properties not in type definition
    const assetAny = asset as any;

    // Try direct creationTime first (newer versions of expo-image-picker)
    if (assetAny.creationTime) {
      timestamp = assetAny.creationTime;
    }
    // Try EXIF DateTimeOriginal
    else if (assetAny.exif && assetAny.exif.DateTimeOriginal) {
      const dateStr = assetAny.exif.DateTimeOriginal as string;
      const parsed = new Date(dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed.getTime();
      }
    }
    // Try EXIF DateTime
    else if (assetAny.exif && assetAny.exif.DateTime) {
      const dateStr = assetAny.exif.DateTime as string;
      const parsed = new Date(dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed.getTime();
      }
    }

    if (timestamp === null) {
      return null;
    }

    // Check if timestamp is in seconds (Unix timestamp) rather than milliseconds
    // If the resulting date is before 2020, it's likely in seconds
    const date = new Date(timestamp);
    if (date.getFullYear() < 2020) {
      // Convert from seconds to milliseconds
      timestamp = timestamp * 1000;
    }

    // Final validation - should be between 2020 and 2100
    const finalDate = new Date(timestamp);
    if (finalDate.getFullYear() < 2020 || finalDate.getFullYear() > 2100) {
      return null;
    }

    return timestamp;
  };

  const pickImagesFromLibrary = async () => {
    const hasPermission = await requestPermission('library');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
        selectionLimit: 0, // 不限制数量
        exif: true, // 请求EXIF数据
      });

      if (!result.canceled && result.assets.length > 0) {
        const newImages: SelectedImage[] = result.assets.map(asset => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          creationTime: getImageCreationTime(asset),
        }));
        setSelectedImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('Failed to pick images:', error);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermission('camera');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const newImage: SelectedImage = {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          creationTime: Date.now(), // 拍照时的时间
        };
        setSelectedImages(prev => [...prev, newImage]);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    if (coverIndex >= index && coverIndex > 0) {
      setCoverIndex(prev => prev - 1);
    }
  };

  const showImageOptions = () => {
    setShowImagePicker(true);
  };

  // 按日期分组图片
  const groupImagesByDate = (images: SelectedImage[]): Map<string, SelectedImage[]> => {
    const groups = new Map<string, SelectedImage[]>();
    for (const img of images) {
      if (img.creationTime) {
        const date = new Date(img.creationTime);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const existing = groups.get(dateKey) || [];
        existing.push(img);
        groups.set(dateKey, existing);
      } else {
        // 没有时间的图片归到今天
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        const existing = groups.get(todayKey) || [];
        existing.push(img);
        groups.set(todayKey, existing);
      }
    }
    return groups;
  };

  const handleSave = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('提示', '请选择至少一张图片');
      return;
    }

    if (!title.trim()) {
      Alert.alert('提示', '请输入个体标题');
      return;
    }

    setSaving(true);
    try {
      // 先将所有图片复制到文档目录，获取永久 URI
      const sourceUris = selectedImages.map(img => img.uri);
      const permanentUris = await copyImagesToDocumentDirectory(sourceUris);

      // 按日期分组（使用永久 URI）
      const imagesWithPermanentUri = selectedImages.map((img, index) => ({
        ...img,
        permanentUri: permanentUris[index],
      }));

      const imageGroups = groupImagesByDate(imagesWithPermanentUri);

      // 创建个体，使用永久 URI 作为封面
      const individualId = await IndividualRepository.create({
        coverImagePath: imagesWithPermanentUri[coverIndex]?.permanentUri || 'https://picsum.photos/400/400',
        title: title.trim(),
        description: description.trim(),
        groupIds,
      });

      // 如果选择了分组，添加个体到这些分组
      if (groupIds.length > 0) {
        await GroupRepository.addIndividualsToGroup(groupIds[0], [individualId]);
        // 如果选择多个分组，添加个体到其他分组
        for (let i = 1; i < groupIds.length; i++) {
          await GroupRepository.addIndividualsToGroup(groupIds[i], [individualId]);
        }
      }

      // 为每个日期组创建一条记录
      const defaultTitle = '新记录';
      const defaultDesc = '暂无描述';

      for (const [dateKey, images] of imageGroups) {
        // 使用该组第一张图片的时间作为记录时间
        const recordDate = images[0].creationTime || Date.now();

        // 格式化日期作为默认标题
        const date = new Date(recordDate);
        const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
        const titleForRecord = `${dateStr} 记录`;

        await RecordRepository.create({
          individualId,
          imagePath: images.map(img => img.permanentUri).filter((uri): uri is string => uri !== undefined),
          title: titleForRecord,
          description: defaultDesc,
          recordDate,
        });
      }

      // 跳转到个体详情页面
      navigation.replace('IndividualDetail', { individualId });
    } catch (error) {
      console.error('Failed to create individual:', error);
      Alert.alert('错误', '创建个体失败');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const canSave = selectedImages.length > 0 && title.trim() && !saving;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 顶部安全区域 */}
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />
      {/* 顶部导航栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>创建个体</Text>
        <TouchableOpacity onPress={handleSave} disabled={!canSave}>
          <Text style={[styles.saveBtn, { color: canSave ? colors.primary : colors.textDisabled }]}>
            保存
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* 图片选择区域 */}
          <TouchableOpacity style={styles.imageSection} onPress={showImageOptions}>
            {selectedImages.length > 0 ? (
              <View style={styles.imagesContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedImages.map((image, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.imageWrapper}
                      onPress={() => setCoverIndex(index)}
                      onLongPress={() => removeImage(index)}
                    >
                      <Image source={{ uri: image.uri }} style={styles.thumbnailImage} />
                      {index === coverIndex && (
                        <View style={[styles.coverBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.coverBadgeText}>封面</Text>
                        </View>
                      )}
                      {image.creationTime && (
                        <Text style={styles.imageDate}>{formatDate(image.creationTime)}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={[styles.imageHint, { color: colors.textSecondary }]}>
                  {selectedImages.length} 张照片 · 长按删除 · 点击设封面
                </Text>
              </View>
            ) : (
              <View style={[styles.coverPlaceholder, { backgroundColor: '#e0e0e0' }]}>
                <Text style={styles.coverIcon}>📷</Text>
                <Text style={[styles.coverHint, { color: '#999' }]}>点击选择图片（可多选）</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 表单 */}
          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                标题 <Text style={{ color: colors.primary }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.textPrimary,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="请输入个体标题"
                placeholderTextColor={colors.textDisabled}
                maxLength={50}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>描述</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    color: colors.textPrimary,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="请输入个体描述（可选）"
                placeholderTextColor={colors.textDisabled}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>所属分组</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowGroupPicker(true)}
              >
                <Text style={{ color: groupIds.length > 0 ? colors.textPrimary : colors.textDisabled }}>
                  {groupIds.length > 0
                    ? `已选择 ${groupIds.length} 个分组`
                    : '不属于任何分组（可选）'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 图片选择弹窗 */}
      <Modal
        visible={showImagePicker}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowImagePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.modalBtn} onPress={takePhoto}>
              <Text style={[styles.modalBtnText, { color: colors.textDisabled }]}>拍照</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtn} onPress={pickImagesFromLibrary}>
              <Text style={[styles.modalBtnText, { color: colors.textDisabled }]}>从相册选择</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnLast]} onPress={() => setShowImagePicker(false)}>
              <Text style={[styles.modalBtnText, { color: colors.textDisabled }]}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 分组选择弹窗 */}
      <Modal
        visible={showGroupPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>选择分组</Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setGroupIds([]);
              }}
            >
              <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>
                不属于任何分组
              </Text>
              {groupIds.length === 0 && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            {groups.map(group => (
              <TouchableOpacity
                key={group.id}
                style={styles.modalBtn}
                onPress={() => {
                  setGroupIds(prev =>
                    prev.includes(group.id)
                      ? prev.filter(id => id !== group.id)
                      : [...prev, group.id]
                  );
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>{group.title}</Text>
                {groupIds.includes(group.id) && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowGroupPicker(false)}>
              <Text style={[styles.modalBtnText, { color: colors.primary }]}>完成</Text>
            </TouchableOpacity>
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
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  imageSection: {
    width: '100%',
  },
  imagesContainer: {
    paddingVertical: 12,
  },
  imageWrapper: {
    marginRight: 8,
    position: 'relative',
  },
  thumbnailImage: {
    width: 100,
    height: 100,
    borderRadius: 4,
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  coverBadgeText: {
    color: '#fff',
    fontSize: 10,
  },
  imageDate: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  coverPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  coverHint: {
    fontSize: 14,
  },
  imageHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    justifyContent: 'center',
  },
  textArea: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 40,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalBtn: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  modalBtnLast: {
    borderBottomWidth: 0,
  },
  modalBtnText: {
    fontSize: 16,
  },
  checkmark: {
    position: 'absolute',
    right: 16,
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600',
  },
});