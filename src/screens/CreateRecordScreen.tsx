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

import { Header, ImagePickerButton } from '../components';
import { useTheme } from '../hooks/useTheme';
import { IndividualRepository, RecordRepository } from '../database/repositories';
import { copyImageToDocumentDirectory } from '../utils/ImageStorage';
import { spacing, layout } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { Individual, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateRecord'>;
type CreateRecordRouteProp = RouteProp<RootStackParamList, 'CreateRecord'>;

export default function CreateRecordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CreateRecordRouteProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const { individualId } = route.params;

  const [individual, setIndividual] = useState<Individual | null>(null);
  const [imagePath, setImagePath] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recordDate, setRecordDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await IndividualRepository.findById(individualId);
      setIndividual(data);
      setLoading(false);
    }
    load();
  }, [individualId]);

  const handleSave = async () => {
    if (!imagePath || !title.trim() || saving) {
      return;
    }

    setSaving(true);
    try {
      // 始终复制到文档目录以保证可靠性
      const permanentUri = await copyImageToDocumentDirectory(imagePath);

      await RecordRepository.create({
        individualId,
        imagePath: permanentUri,
        imageAssetIds: [],
        title: title.trim(),
        description: description.trim(),
        recordDate: recordDate.getTime(),
      });
      navigation.goBack();
    } catch (error) {
      console.error('Failed to create record:', error);
    } finally {
      setSaving(false);
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
        <Header title="添加记录" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={`添加记录${individual ? ` - ${individual.title}` : ''}`}
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
              点击选择记录图片
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
});