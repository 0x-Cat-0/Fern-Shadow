import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onValueChange: (date: Date) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function DatePickerModal({
  visible,
  value,
  onValueChange,
  onClose,
  onConfirm,
}: DatePickerModalProps) {
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
            <Text style={[styles.datePickerTitle, { color: colors.textPrimary }]}>选择日期</Text>
            <TouchableOpacity onPress={onConfirm}>
              <Text style={[styles.datePickerConfirm, { color: colors.primary }]}>确认</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.datePickerYears}>
            <TouchableOpacity
              style={styles.yearArrow}
              onPress={() => {
                const newDate = new Date(value);
                newDate.setFullYear(newDate.getFullYear() - 1);
                onValueChange(newDate);
              }}
            >
              <Text style={styles.yearArrowText}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.datePickerYear, { color: colors.textPrimary }]}>
              {value.getFullYear()}年
            </Text>
            <TouchableOpacity
              style={styles.yearArrow}
              onPress={() => {
                const newDate = new Date(value);
                newDate.setFullYear(newDate.getFullYear() + 1);
                onValueChange(newDate);
              }}
            >
              <Text style={styles.yearArrowText}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.datePickerMonths}>
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              const isSelected = value.getMonth() === i;
              return (
                <TouchableOpacity
                  key={month}
                  style={[
                    styles.monthItem,
                    isSelected && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    const newDate = new Date(value);
                    newDate.setMonth(i);
                    onValueChange(newDate);
                  }}
                >
                  <Text
                    style={[
                      styles.monthText,
                      { color: isSelected ? '#fff' : colors.textPrimary },
                    ]}
                  >
                    {month}月
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.datePickerDays}>
            {Array.from({ length: 31 }, (_, i) => {
              const day = i + 1;
              const isSelected = value.getDate() === day;
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayItem,
                    isSelected && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    const newDate = new Date(value);
                    newDate.setDate(day);
                    onValueChange(newDate);
                  }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#fff' : colors.textPrimary },
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
  datePickerYears: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  yearArrow: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearArrowText: {
    fontSize: 24,
    color: '#333333',
  },
  datePickerYear: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
  },
  datePickerMonths: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthItem: {
    width: '23%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 8,
  },
  monthText: {
    fontSize: 14,
  },
  datePickerDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayItem: {
    width: '14%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  dayText: {
    fontSize: 14,
  },
});