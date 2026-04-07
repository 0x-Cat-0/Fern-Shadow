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
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header, ImagePickerButton, ConfirmDialog } from '../components';
import { useTheme } from '../hooks/useTheme';
import { IndividualRepository } from '../database/repositories';
import { spacing, layout } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { Individual, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditIndividual'>;
type EditIndividualRouteProp = RouteProp<RootStackParamList, 'EditIndividual'>;

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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await IndividualRepository.findById(individualId);
      if (data) {
        setIndividual(data);
        setCoverImagePath(data.coverImagePath);
        setTitle(data.title);
        setDescription(data.description);
      }
      setLoading(false);
    }
    load();
  }, [individualId]);

  const handleSave = async () => {
    if (!coverImagePath || !title.trim() || saving) {
      return;
    }

    setSaving(true);
    try {
      await IndividualRepository.update(individualId, {
        coverImagePath,
        title: title.trim(),
        description: description.trim(),
      });
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update individual:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await IndividualRepository.delete(individualId);
      navigation.navigate('Main');
    } catch (error) {
      console.error('Failed to delete individual:', error);
    }
  };

  const canSave = coverImagePath && title.trim() && !saving;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="编辑个体" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!individual) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="编辑个体" showBack onBack={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="编辑个体"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleSave} disabled={!canSave}>
            <Text
              style={[
                styles.saveButton,
                { color: canSave ? colors.primary : colors.textDisabled },
              ]}
            >
              保存
            </Text>
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.imageSection}>
            <ImagePickerButton
              imagePath={coverImagePath}
              onImageSelected={setCoverImagePath}
              onImageRemoved={() => setCoverImagePath('')}
              placeholder="封面图"
              size="large"
            />
            <Text style={[styles.imageHint, { color: colors.textSecondary }]}>
              点击更换封面图片
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>标题</Text>
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
              placeholder="输入个体标题"
              placeholderTextColor={colors.textDisabled}
              maxLength={50}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>描述</Text>
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
              placeholder="输入个体描述（可选）"
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={4}
              maxLength={200}
            />
          </View>

          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: colors.danger }]}
            onPress={() => setDeleteDialogVisible(true)}
          >
            <Text style={[styles.deleteButtonText, { color: colors.textInverse }]}>
              删除个体
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="删除个体"
        message="确定要删除这个个体吗？个体下的所有记录都将被删除，且无法恢复。"
        confirmText="删除"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogVisible(false)}
        destructive
      />
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  imageHint: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.sm,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  input: {
    height: 44,
    borderRadius: layout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.base,
  },
  textArea: {
    borderRadius: layout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  deleteButton: {
    height: 44,
    borderRadius: layout.cardRadius,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  deleteButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});