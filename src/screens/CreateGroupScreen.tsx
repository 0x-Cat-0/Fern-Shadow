import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../hooks/useTheme';
import { GroupRepository } from '../database/repositories';
import { copyImageToDocumentDirectory } from '../utils/ImageStorage';
import { spacing, layout } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateGroup'>;

export default function CreateGroupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const [coverImagePath, setCoverImagePath] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

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
    Alert.alert('选择图片', '请选择图片来源', [
      { text: '拍照', onPress: () => pickImage('camera') },
      { text: '从相册选择', onPress: () => pickImage('library') },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入分组标题');
      return;
    }

    setSaving(true);
    try {
      // 将图片复制到文档目录，获取永久 URI
      const permanentUri = coverImagePath
        ? await copyImageToDocumentDirectory(coverImagePath)
        : 'https://picsum.photos/400/400';

      await GroupRepository.create({
        coverImagePath: permanentUri,
        title: title.trim(),
        description: description.trim(),
      });
      navigation.goBack();
    } catch (error) {
      console.error('Failed to create group:', error);
      Alert.alert('错误', '创建分组失败');
    } finally {
      setSaving(false);
    }
  };

  const canSave = title.trim() && !saving;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 顶部安全区域 */}
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />
      {/* 顶部导航栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>创建分组</Text>
        <TouchableOpacity onPress={handleSave} disabled={!canSave}>
          <Text style={[styles.saveBtn, { color: canSave ? colors.primary : colors.textDisabled }]}>
            保存
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 封面图 */}
        <TouchableOpacity style={styles.coverSection} onPress={showImageOptions}>
          {coverImagePath ? (
            <Image source={{ uri: coverImagePath }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: '#e0e0e0' }]}>
              <Text style={styles.coverIcon}>📷</Text>
              <Text style={[styles.coverHint, { color: '#999' }]}>点击选择图片</Text>
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
              placeholder="请输入分组标题"
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
              placeholder="请输入分组描述"
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={4}
              maxLength={200}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
  coverSection: {
    width: '100%',
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: '100%',
    aspectRatio: 16 / 9,
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
});