import React, { useState, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../hooks/useTheme';
import { GroupRepository, IndividualRepository } from '../database/repositories';
import { copyImageToDocumentDirectory } from '../utils/ImageStorage';
import type { RootStackParamList, Individual } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateGroup'>;

export default function CreateGroupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const [coverImagePath, setCoverImagePath] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIndividualIds, setSelectedIndividualIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showIndividualPicker, setShowIndividualPicker] = useState(false);
  const [individuals, setIndividuals] = useState<Individual[]>([]);

  // 弹窗视图模式
  const [pickerViewMode, setPickerViewMode] = useState<'list' | 'grid'>('grid');

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

  const pickImage = async (type: 'camera' | 'library') => {
    const hasPermission = await requestPermission(type);
    if (!hasPermission) return;

    const result =
      type === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 1,
          });

    if (!result.canceled && result.assets[0]) {
      setCoverImagePath(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    setShowImageModal(true);
  };

  const loadIndividuals = async () => {
    try {
      const data = await IndividualRepository.findAll();
      setIndividuals(data);
    } catch (error) {
      console.error('Failed to load individuals:', error);
    }
  };

  const handleShowIndividualPicker = () => {
    loadIndividuals();
    setShowIndividualPicker(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入标题');
      return;
    }

    setSaving(true);
    try {
      let permanentUri: string | undefined;
      if (coverImagePath) {
        permanentUri = await copyImageToDocumentDirectory(coverImagePath);
      }

      // 创建分组并获取新分组ID
      const newGroupId = await GroupRepository.create({
        coverImagePath: permanentUri || '',
        title: title.trim(),
        description: description.trim(),
      });

      // 如果选择了植物，添加到分组
      if (selectedIndividualIds.length > 0) {
        await GroupRepository.addIndividualsToGroup(newGroupId, selectedIndividualIds);
      }

      // 跳转到新创建的分组详情页
      navigation.replace('GroupDetail', { groupId: newGroupId });
    } catch (error) {
      console.error('Failed to create group:', error);
      Alert.alert('错误', '创建分组失败');
    } finally {
      setSaving(false);
    }
  };

  const canSave = title.trim() && !saving;

  return (
    <View style={styles.container}>
      {/* 顶部安全区域 */}
      <View style={{ height: insets.top, backgroundColor: '#ffffff' }} />
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>创建分组</Text>
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
          {/* 封面图 */}
          <TouchableOpacity style={styles.imageSection} onPress={showImageOptions}>
            {coverImagePath ? (
              <Image source={{ uri: coverImagePath }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Text style={styles.coverPlaceholderText}>+</Text>
              </View>
            )}
          </TouchableOpacity>

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

          {/* 选择植物 */}
          <TouchableOpacity
            style={styles.optionItem}
            onPress={handleShowIndividualPicker}
          >
            <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>选择植物</Text>
            <View style={styles.optionRight}>
              <Text style={[styles.optionValue, { color: selectedIndividualIds.length > 0 ? colors.textPrimary : colors.textDisabled }]}>
                {selectedIndividualIds.length > 0 ? `已选择 ${selectedIndividualIds.length} 个植物` : '请选择（可选）'}
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
        >
          <Text style={styles.saveBtnPrimaryText}>保存</Text>
        </TouchableOpacity>
      </View>

      {/* 选择图片弹窗 */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowImageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImageModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.modalBtn} onPress={() => { setShowImageModal(false); pickImage('camera'); }}>
              <Text style={styles.modalBtnText}>拍照</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtn} onPress={() => { setShowImageModal(false); pickImage('library'); }}>
              <Text style={styles.modalBtnText}>从相册选择</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnLast]} onPress={() => setShowImageModal(false)}>
              <Text style={styles.modalBtnText}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 选择植物弹窗 */}
      <Modal
        visible={showIndividualPicker}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowIndividualPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowIndividualPicker(false)}
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
              <TouchableOpacity onPress={() => setShowIndividualPicker(false)}>
                <Text style={[styles.modalCancel, { color: colors.textPrimary }]}>取消</Text>
              </TouchableOpacity>
              <View style={styles.modalHeaderRight}>
                <TouchableOpacity
                  style={styles.viewModeBtn}
                  onPress={() => setPickerViewMode(pickerViewMode === 'list' ? 'grid' : 'list')}
                >
                  <Text style={[styles.viewModeBtnText, { color: colors.textPrimary }]}>
                    {pickerViewMode === 'list' ? '▦' : '☰'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowIndividualPicker(false)}>
                  <Text style={[styles.modalConfirm, { color: colors.textPrimary }]}>
                    完成{selectedIndividualIds.length > 0 ? ` (${selectedIndividualIds.length})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={pickerViewMode === 'list' ? styles.modalList : styles.modalGridList}>
              {individuals.length === 0 ? (
                <Text style={[styles.noIndividualsText, { color: colors.textDisabled }]}>暂无可添加的植物</Text>
              ) : pickerViewMode === 'list' ? (
                <>
                  {individuals.map(individual => (
                    <TouchableOpacity
                      key={individual.id}
                      style={styles.modalItem}
                      onPress={() => {
                        setSelectedIndividualIds(prev =>
                          prev.includes(individual.id)
                            ? prev.filter(id => id !== individual.id)
                            : [...prev, individual.id]
                        );
                      }}
                    >
                      <Image
                        source={individual.coverImagePath ? { uri: individual.coverImagePath } : require('../../assets/icons/鹿角蕨.png')}
                        style={styles.modalItemImage}
                      />
                      <View style={styles.modalItemContent}>
                        <Text style={[styles.modalItemTitle, { color: colors.textPrimary }]}>{individual.title}</Text>
                      </View>
                      <View style={[
                        styles.checkbox,
                        selectedIndividualIds.includes(individual.id) && styles.checkboxSelected
                      ]}>
                        {selectedIndividualIds.includes(individual.id) && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <View style={styles.modalGridContainer}>
                  {individuals.map(individual => {
                    const isSelected = selectedIndividualIds.includes(individual.id);
                    return (
                      <TouchableOpacity
                        key={individual.id}
                        style={[
                          styles.modalGridCard,
                          !isSelected && { borderColor: '#cccccc', borderWidth: 1 },
                        ]}
                        onPress={() => {
                          setSelectedIndividualIds(prev =>
                            prev.includes(individual.id)
                              ? prev.filter(id => id !== individual.id)
                              : [...prev, individual.id]
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.modalGridCardInner}>
                          <Image
                            source={individual.coverImagePath ? { uri: individual.coverImagePath } : require('../../assets/icons/鹿角蕨.png')}
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
  coverImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
  },
  coverPlaceholder: {
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
