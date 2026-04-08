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
    const assetAny = asset as any;

    if (assetAny.creationTime) {
      timestamp = assetAny.creationTime;
    } else if (assetAny.exif && assetAny.exif.DateTimeOriginal) {
      const dateStr = assetAny.exif.DateTimeOriginal as string;
      const parsed = new Date(dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed.getTime();
      }
    } else if (assetAny.exif && assetAny.exif.DateTime) {
      const dateStr = assetAny.exif.DateTime as string;
      const parsed = new Date(dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed.getTime();
      }
    }

    if (timestamp === null) return null;

    const date = new Date(timestamp);
    if (date.getFullYear() < 2020) {
      timestamp = timestamp * 1000;
    }

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
        selectionLimit: 0,
        exif: true,
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
          creationTime: Date.now(),
        };
        setSelectedImages(prev => [...prev, newImage]);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const showImageOptions = () => {
    setShowImagePicker(true);
  };

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
      const sourceUris = selectedImages.map(img => img.uri);
      const permanentUris = await copyImagesToDocumentDirectory(sourceUris);

      const imagesWithPermanentUri = selectedImages.map((img, index) => ({
        ...img,
        permanentUri: permanentUris[index],
      }));

      const imageGroups = groupImagesByDate(imagesWithPermanentUri);

      const individualId = await IndividualRepository.create({
        coverImagePath: imagesWithPermanentUri[0]?.permanentUri || 'https://picsum.photos/400/400',
        title: title.trim(),
        description: description.trim(),
        groupIds,
      });

      if (groupIds.length > 0) {
        await GroupRepository.addIndividualsToGroup(groupIds[0], [individualId]);
        for (let i = 1; i < groupIds.length; i++) {
          await GroupRepository.addIndividualsToGroup(groupIds[i], [individualId]);
        }
      }

      const defaultTitle = '新记录';
      const defaultDesc = '暂无描述';

      for (const [dateKey, images] of imageGroups) {
        const recordDate = images[0].creationTime || Date.now();
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

      navigation.replace('IndividualDetail', { individualId });
    } catch (error) {
      console.error('Failed to create individual:', error);
      Alert.alert('错误', '创建个体失败');
    } finally {
      setSaving(false);
    }
  };

  const canSave = selectedImages.length > 0 && title.trim() && !saving;

  // 渲染横向滚动图片
  const renderImageScroll = () => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imageScrollContent}
      >
        {selectedImages.map((image, index) => (
          <TouchableOpacity
            key={index}
            style={styles.imageScrollItem}
            onPress={() => setCoverIndex(index)}
            onLongPress={() => {
              Alert.alert('删除图片', '确定要删除这张图片吗？', [
                { text: '取消', style: 'cancel' },
                { text: '删除', style: 'destructive', onPress: () => removeImage(index) },
              ]);
            }}
          >
            <Image source={{ uri: image.uri }} style={styles.scrollImage} resizeMode="cover" />
            {index === coverIndex && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>封面</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        {/* 添加按钮 */}
        <TouchableOpacity style={styles.addScrollBtn} onPress={showImageOptions}>
          <Text style={styles.addScrollText}>+</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* 顶部安全区域 */}
      <View style={{ height: insets.top, backgroundColor: '#ffffff' }} />
      {/* 顶部导航栏 */}
      <View style={[styles.header, { backgroundColor: '#ffffff' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>创建个体</Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 80 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* 图片横向滚动 */}
          <View style={styles.imageSection}>
            {selectedImages.length > 0 ? renderImageScroll() : (
              <TouchableOpacity style={styles.coverPlaceholder} onPress={showImageOptions}>
                <Text style={styles.coverPlaceholderText}>+</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 标题输入 */}
          <View style={styles.inputSection}>
            <TextInput
              style={[styles.titleInput, { color: colors.textPrimary }]}
              value={title}
              onChangeText={setTitle}
              placeholder="添加标题"
              placeholderTextColor={colors.textDisabled}
              maxLength={50}
            />
          </View>

          {/* 描述输入 */}
          <View style={styles.inputSection}>
            <TextInput
              style={[styles.descInput, { color: colors.textPrimary }]}
              value={description}
              onChangeText={setDescription}
              placeholder="添加正文或发语音"
              placeholderTextColor={colors.textDisabled}
              multiline
              maxLength={500}
            />
          </View>

          {/* 分割线 */}
          <View style={styles.separator} />

          {/* 所属分组 */}
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => setShowGroupPicker(true)}
          >
            <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>所属分组</Text>
            <View style={styles.optionRight}>
              <Text style={[styles.optionValue, { color: groupIds.length > 0 ? colors.textPrimary : colors.textDisabled }]}>
                {groupIds.length > 0 ? `已选择 ${groupIds.length} 个分组` : '请选择（可选）'}
              </Text>
              <Text style={{ color: colors.textDisabled, fontSize: 18 }}> ›</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 底部操作按钮 */}
      <View style={[styles.bottomActions, { backgroundColor: '#ffffff', paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: '#e0e0e0' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelBtnText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtnPrimary, { backgroundColor: '#ff4757' }]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={[styles.saveBtnPrimaryText, { color: '#fff' }]}>保存</Text>
        </TouchableOpacity>
      </View>

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
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGroupPicker(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
            activeOpacity={1}
            onPress={() => {
              setTimeout(() => setShowGroupPicker(false), 100);
            }}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>选择分组</Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setGroupIds([])}
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
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnLast]} onPress={() => setShowGroupPicker(false)}>
              <Text style={[styles.modalBtnText, { color: colors.primary }]}>确定</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
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
  content: {
    flex: 1,
  },
  imageSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  imageScrollContent: {
    gap: 8,
  },
  imageScrollItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  scrollImage: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#ff4757',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
  },
  addScrollBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addScrollText: {
    fontSize: 36,
    color: '#999',
    fontWeight: '300',
  },
  coverPlaceholder: {
    marginHorizontal: 16,
    width: 80,
    height: 80,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    fontSize: 48,
    color: '#999',
    fontWeight: '300',
  },
  coverHint: {
    fontSize: 14,
    color: '#999',
  },
  addIconText: {
    fontSize: 48,
    color: '#999',
    fontWeight: '300',
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 12,
  },
  descInput: {
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 8,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  optionLabel: {
    fontSize: 15,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionValue: {
    fontSize: 14,
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
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  saveBtnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnPrimaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
});
