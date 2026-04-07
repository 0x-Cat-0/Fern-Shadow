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
import DateTimePicker from '@react-native-community/datetimepicker';

import { Header, ImagePickerButton, ConfirmDialog } from '../components';
import { useTheme } from '../hooks/useTheme';
import { RecordRepository } from '../database/repositories';
import { spacing, layout } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { Record as RecordType, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditRecord'>;
type EditRecordRouteProp = RouteProp<RootStackParamList, 'EditRecord'>;

export default function EditRecordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditRecordRouteProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const { recordId } = route.params;

  const [record, setRecord] = useState<RecordType | null>(null);
  const [imagePath, setImagePath] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recordDate, setRecordDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await RecordRepository.findById(recordId);
      if (data) {
        setRecord(data);
        setImagePath(data.imagePath);
        setTitle(data.title);
        setDescription(data.description);
        setRecordDate(new Date(data.recordDate));
      }
      setLoading(false);
    }
    load();
  }, [recordId]);

  const handleSave = async () => {
    if (!imagePath || !title.trim() || saving) {
      return;
    }

    setSaving(true);
    try {
      await RecordRepository.update(recordId, {
        imagePath,
        title: title.trim(),
        description: description.trim(),
        recordDate: recordDate.getTime(),
      });
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update record:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await RecordRepository.delete(recordId);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to delete record:', error);
    }
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const onDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setRecordDate(selectedDate);
    }
  };

  const canSave = imagePath && title.trim() && !saving;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="编辑记录" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="编辑记录" showBack onBack={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="编辑记录"
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
              imagePath={imagePath}
              onImageSelected={setImagePath}
              onImageRemoved={() => setImagePath('')}
              placeholder="记录图片"
              size="large"
            />
            <Text style={[styles.imageHint, { color: colors.textSecondary }]}>
              点击更换记录图片
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>记录日期</Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                {formatDate(recordDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={recordDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
            />
          )}

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
              placeholder="输入记录标题"
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
              placeholder="输入记录描述（可选）"
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
              删除记录
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="删除记录"
        message="确定要删除这条记录吗？此操作无法恢复。"
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
  dateButton: {
    height: 44,
    borderRadius: layout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: typography.fontSize.base,
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