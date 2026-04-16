import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { Group } from '../types';

interface AddToGroupModalProps {
  visible: boolean;
  groups: Group[];
  selectedGroupIds: number[];
  onClose: () => void;
  onConfirm: () => void;
  onToggleGroup: (groupId: number) => void;
}

export function AddToGroupModal({
  visible,
  groups,
  selectedGroupIds,
  onClose,
  onConfirm,
  onToggleGroup,
}: AddToGroupModalProps) {
  const colors = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.datePickerOverlay}>
        <View style={[styles.datePickerContent, { backgroundColor: colors.surface }]}>
          <View style={styles.datePickerHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.datePickerCancel, { color: colors.textDisabled }]}>取消</Text>
            </TouchableOpacity>
            <Text style={[styles.datePickerTitle, { color: colors.textPrimary }]}>添加到分组</Text>
            <TouchableOpacity onPress={onConfirm}>
              <Text style={[styles.datePickerConfirm, { color: colors.primary }]}>完成</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.groupListContainer}>
            {groups.length === 0 ? (
              <Text style={[styles.noGroupsText, { color: colors.textDisabled }]}>暂无分组</Text>
            ) : (
              groups.map(group => (
                <TouchableOpacity
                  key={group.id}
                  style={styles.groupItem}
                  onPress={() => onToggleGroup(group.id)}
                >
                  <Text style={[styles.groupItemText, { color: colors.textPrimary }]}>{group.title}</Text>
                  <View style={[
                    styles.groupCheckbox,
                    selectedGroupIds.includes(group.id) && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}>
                    {selectedGroupIds.includes(group.id) && <Text style={styles.groupCheckboxText}>✓</Text>}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerCancel: {
    fontSize: 16,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerConfirm: {
    fontSize: 16,
    fontWeight: '600',
  },
  groupListContainer: {
    maxHeight: 400,
  },
  noGroupsText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  groupItemText: {
    fontSize: 15,
  },
  groupCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cccccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupCheckboxText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});