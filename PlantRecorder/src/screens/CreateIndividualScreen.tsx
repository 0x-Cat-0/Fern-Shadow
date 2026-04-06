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

import { Header, ImagePickerButton } from '../components';
import { useTheme } from '../hooks/useTheme';
import { GroupRepository, IndividualRepository } from '../database/repositories';
import { spacing, layout } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { Group, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateIndividual'>;
type CreateIndividualRouteProp = RouteProp<RootStackParamList, 'CreateIndividual'>;

export default function CreateIndividualScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CreateIndividualRouteProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const { groupId } = route.params;

  const [group, setGroup] = useState<Group | null>(null);
  const [coverImagePath, setCoverImagePath] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await GroupRepository.findById(groupId);
      setGroup(data);
      setLoading(false);
    }
    load();
  }, [groupId]);

  const handleSave = async () => {
    if (!coverImagePath || !title.trim() || saving) {
      return;
    }

    setSaving(true);
    try {
      await IndividualRepository.create({
        groupId,
        coverImagePath,
        title: title.trim(),
        description: description.trim(),
      });
      navigation.goBack();
    } catch (error) {
      console.error('Failed to create individual:', error);
    } finally {
      setSaving(false);
    }
  };

  const canSave = coverImagePath && title.trim() && !saving;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="创建个体" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={`创建个体${group ? ` - ${group.title}` : ''}`}
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
              点击选择封面图片
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
        </ScrollView>
      </KeyboardAvoidingView>
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
});