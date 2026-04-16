import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface LongPressMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onModifyDate: () => void;
  onDeleteRecord: () => void;
}

export function LongPressMenu({
  visible,
  position,
  onClose,
  onModifyDate,
  onDeleteRecord,
}: LongPressMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.longPressOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.longPressMenu,
            {
              top: Math.min(position.y, screenHeight - 150),
              left: Math.min(position.x, screenWidth - 120),
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.longPressMenuItem, styles.longPressMenuItemTop]}
            onPress={onModifyDate}
          >
            <Text style={styles.longPressMenuItemText}>修改日期</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.longPressMenuItem, styles.longPressMenuItemBottom]}
            onPress={onDeleteRecord}
          >
            <Text style={[styles.longPressMenuItemText, { color: '#FF4040' }]}>删除该记录</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  longPressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  longPressMenu: {
    position: 'absolute',
    width: 120,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  longPressMenuItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  longPressMenuItemTop: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  longPressMenuItemBottom: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  longPressMenuItemText: {
    fontSize: 14,
    color: '#333333',
  },
});