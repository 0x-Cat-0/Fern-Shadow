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
  ActivityIndicator,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../hooks/useTheme';
import { IndividualRepository, RecordRepository, GroupRepository } from '../database/repositories';
import { copyImageToDocumentDirectory } from '../utils/ImageStorage';
import type { RootStackParamList, Group, Individual, Record as RecordType } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditIndividual'>;
type EditIndividualRouteProp = RouteProp<RootStackParamList, 'EditIndividual'>;

interface RecordImage {
  recordId: number;
  imagePath: string;
}

export default function EditIndividualScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditIndividualRouteProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const { individualId } = route.params;

  const [individual, setIndividual] = useState<Individual | null>(null);
  const [coverImagePath, setCoverImagePath] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [recordImages, setRecordImages] = useState<RecordImage[]>([]);

  // 弹窗视图模式
  const [groupPickerViewMode, setGroupPickerViewMode] = useState<'list' | 'grid'>('grid');

  // 弹窗高度
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

  useEffect(() => {
    loadData();
  }, [individualId]);

  const loadData = async () => {
    try {
      const [individualData, allGroups, recordsData] = await Promise.all([
        IndividualRepository.findById(individualId),
        GroupRepository.findAll(),
        RecordRepository.findByIndividualId(individualId),
      ]);

      if (individualData) {
        setIndividual(individualData);
        setCoverImagePath(individualData.coverImagePath);
        setTitle(individualData.title);
        setDescription(individualData.description || '');
      }

      setGroups(allGroups);

      // 获取个体所属的分组
      const memberGroups = await GroupRepository.getGroupsForIndividual(individualId);
      setGroupIds(memberGroups.map(g => g.id));

      // 收集所有记录的图片
      const allImages: RecordImage[] = [];
      for (const record of recordsData) {
        const paths: string[] = Array.isArray(record.imagePath)
          ? record.imagePath
          : record.imagePath ? [record.imagePath] : [];
        for (const path of paths) {
          allImages.push({ recordId: record.id, imagePath: path });
        }
      }
      setRecordImages(allImages);
    } catch (error) {
      console.error('Failed to load individual:', error);
    } finally {
      setLoading(false);
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

  const getImageCreationTime = (asset: ImagePicker.ImagePickerAsset): number => {
    let timestamp: number = Date.now();
    const assetAny = asset as any;

    if (assetAny.creationTime) {
      timestamp = assetAny.creationTime;
    }

    const date = new Date(timestamp);
    if (date.getFullYear() < 2020) {
      timestamp = timestamp * 1000;
    }

    const finalDate = new Date(timestamp);
    if (finalDate.getFullYear() < 2020 || finalDate.getFullYear() > 2100) {
      return Date.now();
    }

    return timestamp;
  };

  const isSameDay = (ts1: number, ts2: number): boolean => {
    const d1 = new Date(ts1);
    const d2 = new Date(ts2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
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
        // 按日期分组图片
        const imagesByDate = new Map<number, string[]>();

        for (const asset of result.assets) {
          const uri = asset.uri;
          const timestamp = getImageCreationTime(asset);
          const dayKey = new Date(timestamp).setHours(0, 0, 0, 0);

          if (!imagesByDate.has(dayKey)) {
            imagesByDate.set(dayKey, []);
          }
          imagesByDate.get(dayKey)!.push(uri);
        }

        // 获取当前所有记录
        const currentRecords = await RecordRepository.findByIndividualId(individualId);

        // 分别保存每个日期组的图片
        for (const [dayKey, uris] of imagesByDate) {
          const permanentUris = await Promise.all(uris.map(uri => copyImageToDocumentDirectory(uri)));

          // 查找目标日期是否有记录
          const targetRecord = currentRecords.find(r => isSameDay(r.recordDate, dayKey));

          if (targetRecord) {
            // 合并到目标记录
            const record = await RecordRepository.findById(targetRecord.id);
            if (record) {
              const existingPaths: string[] = Array.isArray(record.imagePath)
                ? record.imagePath
                : record.imagePath ? [record.imagePath] : [];
              const newPaths = [...existingPaths, ...permanentUris];
              await RecordRepository.update(targetRecord.id, { imagePath: newPaths });
            }
          } else {
            // 创建新记录
            const imageDate = new Date(dayKey);
            const dateStr = `${String(imageDate.getMonth() + 1).padStart(2, '0')}.${String(imageDate.getDate()).padStart(2, '0')}`;
            await RecordRepository.create({
              individualId,
              imagePath: permanentUris,
              title: `${dateStr} 记录`,
              description: '',
              recordDate: dayKey,
            });
          }
        }

        setShowImagePicker(false);
        loadData();
      } else {
        setShowImagePicker(false);
      }
    } catch (error) {
      console.error('Failed to pick images:', error);
      setShowImagePicker(false);
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
        const timestamp = getImageCreationTime(asset);
        const dayKey = new Date(timestamp).setHours(0, 0, 0, 0);
        const permanentUri = await copyImageToDocumentDirectory(asset.uri);

        // 获取当前所有记录
        const currentRecords = await RecordRepository.findByIndividualId(individualId);

        // 查找目标日期是否有记录
        const targetRecord = currentRecords.find(r => isSameDay(r.recordDate, dayKey));

        if (targetRecord) {
          // 合并到目标记录
          const record = await RecordRepository.findById(targetRecord.id);
          if (record) {
            const existingPaths: string[] = Array.isArray(record.imagePath)
              ? record.imagePath
              : record.imagePath ? [record.imagePath] : [];
            const newPaths = [...existingPaths, permanentUri];
            await RecordRepository.update(targetRecord.id, { imagePath: newPaths });
          }
        } else {
          // 创建新记录
          const imageDate = new Date(dayKey);
          const dateStr = `${String(imageDate.getMonth() + 1).padStart(2, '0')}.${String(imageDate.getDate()).padStart(2, '0')}`;
          await RecordRepository.create({
            individualId,
            imagePath: [permanentUri],
            title: `${dateStr} 记录`,
            description: '',
            recordDate: dayKey,
          });
        }

        setShowImagePicker(false);
        loadData();
      } else {
        setShowImagePicker(false);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      setShowImagePicker(false);
    }
  };

  const handleDeleteImage = (recordImage: RecordImage, index: number) => {
    Alert.alert(
      '删除图片',
      '确定要删除该图片吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const record = await RecordRepository.findById(recordImage.recordId);
              if (record) {
                const currentPaths: string[] = Array.isArray(record.imagePath)
                  ? record.imagePath
                  : record.imagePath ? [record.imagePath] : [];
                const updatedPaths = currentPaths.filter((_, idx) => idx !== index);

                if (updatedPaths.length === 0) {
                  await RecordRepository.delete(recordImage.recordId);
                } else {
                  await RecordRepository.update(recordImage.recordId, { imagePath: updatedPaths });
                }
              }

              // 如果删除的是封面，重新设置封面
              if (coverImagePath === recordImage.imagePath) {
                const updatedImages = recordImages.filter((_, idx) => idx !== index);
                if (updatedImages.length > 0) {
                  setCoverImagePath(updatedImages[0].imagePath);
                } else {
                  setCoverImagePath(individual?.coverImagePath || 'https://picsum.photos/400/400');
                }
              }

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

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入个体标题');
      return;
    }

    setSaving(true);
    try {
      await IndividualRepository.update(individualId, {
        coverImagePath: coverImagePath,
        title: title.trim(),
        description: description.trim(),
      });

      // 更新分组关联
      const currentGroups = await GroupRepository.getGroupsForIndividual(individualId);
      const currentGroupIds = currentGroups.map(g => g.id);

      const toAdd = groupIds.filter(id => !currentGroupIds.includes(id));
      const toRemove = currentGroupIds.filter(id => !groupIds.includes(id));

      for (const groupId of toAdd) {
        await GroupRepository.addIndividualsToGroup(groupId, [individualId]);
      }
      for (const groupId of toRemove) {
        await GroupRepository.removeIndividualFromGroup(groupId, individualId);
      }

      navigation.goBack();
    } catch (error) {
      console.error('Failed to update individual:', error);
      Alert.alert('错误', '更新个体失败');
    } finally {
      setSaving(false);
    }
  };

  const canSave = title.trim() && !saving;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ height: insets.top, backgroundColor: '#ffffff' }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={{ fontSize: 22, color: colors.textPrimary }}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>编辑植物</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#ff4757" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部安全区域 */}
      <View style={{ height: insets.top, backgroundColor: '#ffffff' }} />
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>编辑植物</Text>
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
          {/* 顶部显示所有记录图片 - 横向滚动 */}
          <View style={styles.imageSection}>
            {recordImages.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageScrollContent}
              >
                {recordImages.map((recordImage, index) => (
                  <TouchableOpacity
                    key={`${recordImage.recordId}-${index}`}
                    style={styles.imageScrollItem}
                    onPress={() => setCoverImagePath(recordImage.imagePath)}
                    onLongPress={() => handleDeleteImage(recordImage, index)}
                  >
                    <Image source={{ uri: recordImage.imagePath }} style={styles.scrollImage} resizeMode="cover" />
                    {coverImagePath === recordImage.imagePath && (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>封面</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
                {/* 添加按钮 */}
                <TouchableOpacity style={styles.addScrollBtn} onPress={() => setShowImagePicker(true)}>
                  <Text style={styles.addScrollText}>+</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <TouchableOpacity style={styles.coverPlaceholder} onPress={() => setShowImagePicker(true)}>
                <Text style={styles.coverPlaceholderText}>+</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 标题输入 */}
          <View style={styles.inputSection}>
            <TextInput
              style={styles.titleInput}
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
              style={styles.descInput}
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
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelBtnText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveBtnPrimary}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnPrimaryText}>保存</Text>
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
              <Text style={styles.modalBtnText}>拍照</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtn} onPress={pickImagesFromLibrary}>
              <Text style={styles.modalBtnText}>从相册选择</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnLast]} onPress={() => setShowImagePicker(false)}>
              <Text style={styles.modalBtnText}>取消</Text>
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
                        source={{ uri: group.coverImagePath || 'https://picsum.photos/200/200' }}
                        style={styles.modalItemImage}
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
                            source={{ uri: group.coverImagePath || 'https://picsum.photos/200/200' }}
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageSection: {
    paddingVertical: 12,
  },
  imageScrollContent: {
    paddingHorizontal: 16,
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
  inputSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 12,
    color: '#333333',
  },
  descInput: {
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 8,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#333333',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
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
