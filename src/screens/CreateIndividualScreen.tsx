import React, { useState, useEffect, useRef } from 'react';
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
  PanResponder,
  useWindowDimensions,
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

  // 弹窗视图模式
  const [groupPickerViewMode, setGroupPickerViewMode] = useState<'list' | 'grid'>('grid');

  // 弹窗高度
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [modalHeight, setModalHeight] = useState(screenHeight * 0.5);
  const [isDragging, setIsDragging] = useState(false);

  // 计算缩略图尺寸 - 根据屏幕宽度调整，小屏手机适当缩小
  const thumbnailSize = Math.max(70, Math.min(100, screenWidth * 0.22));
  const listItemImageSize = Math.max(45, Math.min(60, screenWidth * 0.14));

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
      // 始终复制到文档目录以保证可靠性
      const sourceUris = selectedImages.map(img => img.uri);
      const permanentUris = await copyImagesToDocumentDirectory(sourceUris);

      const imagesWithPermanentUri = selectedImages.map((img, index) => ({
        ...img,
        permanentUri: permanentUris[index],
      }));

      const imageGroups = groupImagesByDate(imagesWithPermanentUri);

      const individualId = await IndividualRepository.create({
        coverImagePath: imagesWithPermanentUri[0]?.permanentUri || '',
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
          imageAssetIds: [],
          title: titleForRecord,
          description: defaultDesc,
          recordDate,
        });
      }

      navigation.replace('IndividualDetail', { individualId });
    } catch (error) {
      console.error('Failed to create individual:', error);
      Alert.alert('错误', '新建植物失败');
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
            style={[styles.imageScrollItem, { width: thumbnailSize, height: thumbnailSize }]}
            onPress={() => setCoverIndex(index)}
            onLongPress={() => {
              Alert.alert('删除图片', '确定要删除这张图片吗？', [
                { text: '取消', style: 'cancel' },
                { text: '删除', style: 'destructive', onPress: () => removeImage(index) },
              ]);
            }}
          >
            <Image source={{ uri: image.uri }} style={[styles.scrollImage, { width: thumbnailSize, height: thumbnailSize }]} resizeMode="cover" />
            {index === coverIndex && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>封面</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        {/* 添加按钮 */}
        <TouchableOpacity style={[styles.addScrollBtn, { width: thumbnailSize, height: thumbnailSize }]} onPress={showImageOptions}>
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>新建植物</Text>
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
              <TouchableOpacity style={[styles.coverPlaceholder, { width: thumbnailSize, height: thumbnailSize }]} onPress={showImageOptions}>
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
              placeholder="请添加描述"
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
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowGroupPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGroupPicker(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + 20,
              height: modalHeight,
            }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* 拖动手柄 */}
            <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
              <View style={[styles.dragHandle, isDragging && styles.dragHandleActive]} />
            </View>

            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowGroupPicker(false)}>
                <Text style={[styles.modalCancel, { color: colors.textPrimary }]}>取消</Text>
              </TouchableOpacity>
              <View style={styles.modalHeaderRight}>
                <TouchableOpacity
                  style={styles.viewModeBtn}
                  onPress={() => setGroupPickerViewMode(groupPickerViewMode === 'list' ? 'grid' : 'list')}
                >
                  <Text style={[styles.viewModeBtnText, { color: colors.textPrimary }]}>
                    {groupPickerViewMode === 'list' ? '▦' : '☰'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowGroupPicker(false)}>
                  <Text style={[styles.modalConfirm, { color: colors.textPrimary }]}>
                    完成{groupIds.length > 0 ? ` (${groupIds.length})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={groupPickerViewMode === 'list' ? styles.modalList : styles.modalGridList}>
              {groups.length === 0 ? (
                <Text style={[styles.noGroupsText, { color: colors.textDisabled }]}>暂无分组</Text>
              ) : groupPickerViewMode === 'list' ? (
                <>
                  {groups.map(group => (
                    <TouchableOpacity
                      key={group.id}
                      style={styles.modalItem}
                      onPress={() => {
                        setGroupIds(prev =>
                          prev.includes(group.id)
                            ? prev.filter(id => id !== group.id)
                            : [...prev, group.id]
                        );
                      }}
                    >
                      <Image
                        source={group.coverImagePath ? { uri: group.coverImagePath } : require('../../assets/icons/fern.png')}
                        style={[styles.modalItemImage, { width: listItemImageSize, height: listItemImageSize }]}
                      />
                      <View style={styles.modalItemContent}>
                        <Text style={[styles.modalItemTitle, { color: colors.textPrimary }]}>{group.title}</Text>
                      </View>
                      <View style={[
                        styles.checkbox,
                        groupIds.includes(group.id) && styles.checkboxSelected
                      ]}>
                        {groupIds.includes(group.id) && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <View style={styles.modalGridContainer}>
                  {groups.map(group => {
                    const isSelected = groupIds.includes(group.id);
                    return (
                      <TouchableOpacity
                        key={group.id}
                        style={[
                          styles.modalGridCard,
                          !isSelected && { borderColor: '#cccccc', borderWidth: 1 },
                        ]}
                        onPress={() => {
                          setGroupIds(prev =>
                            prev.includes(group.id)
                              ? prev.filter(id => id !== group.id)
                              : [...prev, group.id]
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.modalGridCardInner}>
                          <Image
                            source={group.coverImagePath ? { uri: group.coverImagePath } : require('../../assets/icons/fern.png')}
                            style={styles.modalGridCardImage}
                          />
                          {!isSelected && (
                            <View style={styles.modalGridCardOverlay} pointerEvents="none" />
                          )}
                          <View style={styles.modalGridCardTitleWrapper}>
                            <Text
                              style={[styles.modalGridCardTitle, { color: '#ffffff' }]}
                              numberOfLines={1}
                            >
                              {group.title}
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    color: '#666666',
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
    backgroundColor: '#999999',
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
  modalCancel: {
    fontSize: 16,
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
  modalGridCardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  modalGridCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalGridCardTitleWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(128,128,128,0.6)',
  },
  modalGridCardTitle: {
    fontSize: 11,
    textAlign: 'center',
  },
  noGroupsText: {
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
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
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
