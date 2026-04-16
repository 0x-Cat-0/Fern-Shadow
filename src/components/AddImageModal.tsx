import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Switch,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface AddImageModalProps {
  visible: boolean;
  hideAlreadyAdded: boolean;
  onHideToggle: (value: boolean) => void;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickFromGallery: () => void;
}

export function AddImageModal({
  visible,
  hideAlreadyAdded,
  onHideToggle,
  onClose,
  onTakePhoto,
  onPickFromGallery,
}: AddImageModalProps) {
  const colors = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.addImageModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.addImageModalContent, { backgroundColor: colors.surface }]}>
          {/* 隐藏已添加开关 - 左侧描述，右侧开关 */}
          <View style={styles.addImageHideToggle}>
            <Text style={[styles.addImageHideToggleText, { color: colors.textPrimary }]}>
              隐藏已添加的图片
            </Text>
            <Switch
              value={hideAlreadyAdded}
              onValueChange={onHideToggle}
              trackColor={{ false: '#e0e0e0', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.addImageModalDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.addImageModalBtn} onPress={onTakePhoto}>
            <Text style={[styles.addImageModalBtnText, { color: '#333333' }]}>拍照</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addImageModalBtn} onPress={onPickFromGallery}>
            <Text style={[styles.addImageModalBtnText, { color: '#333333' }]}>从相册选择</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addImageModalBtn, styles.addImageModalBtnLast]} onPress={onClose}>
            <Text style={[styles.addImageModalBtnText, { color: colors.textDisabled }]}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addImageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  addImageModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 40,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  addImageHideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  addImageHideToggleText: {
    fontSize: 15,
  },
  addImageModalDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  addImageModalBtn: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  addImageModalBtnLast: {
    borderBottomWidth: 0,
  },
  addImageModalBtnText: {
    fontSize: 16,
  },
});