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
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../hooks/useTheme';
import { GroupRepository, IndividualRepository } from '../database/repositories';
import { copyImageToDocumentDirectory } from '../utils/ImageStorage';
import type { RootStackParamList, Individual, Group } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditGroup'>;
type EditGroupRouteProp = RouteProp<RootStackParamList, 'EditGroup'>;

export default function EditGroupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditGroupRouteProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const { groupId } = route.params;

  const [group, setGroup] = useState<Group | null>(null);
  const [coverImagePath, setCoverImagePath] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIndividualIds, setSelectedIndividualIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showIndividualPicker, setShowIndividualPicker] = useState(false);
  const [individuals, setIndividuals] = useState<Individual[]>([]);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    try {
      const groupData = await GroupRepository.findById(groupId);
      const allIndividuals = await IndividualRepository.findAll();
      const currentInGroup = await GroupRepository.getIndividualsInGroup(groupId);

      if (groupData) {
        setGroup(groupData);
        setCoverImagePath(groupData.coverImagePath);
        setTitle(groupData.title);
        setDescription(groupData.description || '');
      }
      setIndividuals(allIndividuals);
      setSelectedIndividualIds(currentInGroup.map(i => i.id));
    } catch (error) {
      console.error('Failed to load group:', error);
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

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入分组标题');
      return;
    }

    setSaving(true);
    try {
      const permanentUri = coverImagePath
        ? await copyImageToDocumentDirectory(coverImagePath)
        : 'https://picsum.photos/400/400';

      await GroupRepository.update(groupId, {
        coverImagePath: permanentUri,
        title: title.trim(),
        description: description.trim(),
      });

      // 更新分组中的个体
      const currentInGroup = await GroupRepository.getIndividualsInGroup(groupId);
      const currentIds = currentInGroup.map(i => i.id);

      // 需要添加的
      const toAdd = selectedIndividualIds.filter(id => !currentIds.includes(id));
      // 需要移除的
      const toRemove = currentIds.filter(id => !selectedIndividualIds.includes(id));

      if (toAdd.length > 0) {
        await GroupRepository.addIndividualsToGroup(groupId, toAdd);
      }
      for (const id of toRemove) {
        await GroupRepository.removeIndividualFromGroup(groupId, id);
      }

      navigation.goBack();
    } catch (error) {
      console.error('Failed to update group:', error);
      Alert.alert('错误', '更新分组失败');
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>编辑分组</Text>
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>编辑分组</Text>
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
          <TouchableOpacity style={styles.imageSection} onPress={() => setShowImageModal(true)}>
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
              placeholder="添加正文或发语音"
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
            onPress={() => setShowIndividualPicker(true)}
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
          disabled={!canSave}
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
          onPress={() => {
            setTimeout(() => setShowIndividualPicker(false), 100);
          }}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
            activeOpacity={1}
            onPress={() => {
              setTimeout(() => setShowIndividualPicker(false), 100);
            }}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>选择植物</Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setSelectedIndividualIds([])}
            >
              <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>
                不选择任何植物
              </Text>
              {selectedIndividualIds.length === 0 && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            {individuals.map(individual => (
              <TouchableOpacity
                key={individual.id}
                style={styles.modalBtn}
                onPress={() => {
                  setSelectedIndividualIds(prev =>
                    prev.includes(individual.id)
                      ? prev.filter(id => id !== individual.id)
                      : [...prev, individual.id]
                  );
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>{individual.title}</Text>
                {selectedIndividualIds.includes(individual.id) && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnLast]} onPress={() => setShowIndividualPicker(false)}>
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#999999',
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
