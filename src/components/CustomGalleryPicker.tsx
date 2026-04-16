import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useTheme } from '../hooks/useTheme';

interface CustomGalleryPickerProps {
  visible: boolean;
  images: MediaLibrary.Asset[];
  selectedIds: string[];
  existingAssetIds: string[];
  hideAlreadyAdded: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onToggleSelection: (asset: MediaLibrary.Asset) => void;
  onHideToggle: (value: boolean) => void;
}

export function CustomGalleryPicker({
  visible,
  images,
  selectedIds,
  existingAssetIds,
  hideAlreadyAdded,
  loading,
  onClose,
  onConfirm,
  onToggleSelection,
  onHideToggle,
}: CustomGalleryPickerProps) {
  const colors = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.customGalleryContainer, { backgroundColor: colors.background }]}>
        {/* 顶部栏 */}
        <View style={[styles.customGalleryHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.customGalleryCancelText, { color: colors.textSecondary }]}>取消</Text>
          </TouchableOpacity>
          <Text style={[styles.customGalleryTitle, { color: colors.textPrimary }]}>
            选择图片 {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Text>
          <TouchableOpacity onPress={onConfirm}>
            <Text style={[styles.customGalleryConfirmText, { color: selectedIds.length > 0 ? colors.primary : colors.textDisabled }]}>
              完成
            </Text>
          </TouchableOpacity>
        </View>

        {/* 模式切换栏 */}
        <View style={[styles.customGalleryModeBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.customGalleryModeText, { color: colors.textPrimary }]}>
            {hideAlreadyAdded ? '隐藏已添加' : '显示全部'}
          </Text>
          <Switch
            value={hideAlreadyAdded}
            onValueChange={onHideToggle}
            trackColor={{ false: '#e0e0e0', true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* 图片网格 */}
        {loading ? (
          <View style={styles.customGalleryLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={images}
            keyExtractor={(item) => item.id || String(item.uri)}
            numColumns={4}
            contentContainerStyle={styles.customGalleryGrid}
            renderItem={({ item }) => {
              const isSelected = item.id ? selectedIds.includes(item.id) : false;
              const isAlreadyAdded = item.id ? existingAssetIds.includes(item.id) : false;
              const isDisabled = hideAlreadyAdded && isAlreadyAdded;

              return (
                <TouchableOpacity
                  style={[styles.customGalleryItem, isDisabled && styles.customGalleryItemDisabled]}
                  onPress={() => !isDisabled && onToggleSelection(item)}
                  activeOpacity={isDisabled ? 1 : 0.7}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={[styles.customGalleryImage, isDisabled && styles.customGalleryImageDisabled]}
                  />
                  {/* 已添加标记（仅在非隐藏模式下显示） */}
                  {!hideAlreadyAdded && isAlreadyAdded && (
                    <View style={styles.customGalleryMarkedOverlay}>
                      <View style={[styles.customGalleryMarkedIcon, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                        <Text style={styles.customGalleryMarkedCheck}>✓</Text>
                      </View>
                    </View>
                  )}
                  {/* 选中标记 */}
                  {isSelected && !isDisabled && (
                    <View style={[styles.customGallerySelectedOverlay, { borderColor: colors.primary }]}>
                      <View style={[styles.customGallerySelectedIcon, { backgroundColor: colors.primary }]}>
                        <Text style={styles.customGallerySelectedCheck}>✓</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.customGalleryEmpty}>
                <Text style={{ color: colors.textSecondary }}>没有可选择的图片</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  customGalleryContainer: {
    flex: 1,
  },
  customGalleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  customGalleryCancelText: {
    fontSize: 16,
  },
  customGalleryTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  customGalleryConfirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customGalleryModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  customGalleryModeText: {
    fontSize: 14,
  },
  customGalleryGrid: {
    padding: 2,
  },
  customGalleryItem: {
    width: '25%',
    aspectRatio: 1,
    padding: 2,
  },
  customGalleryItemDisabled: {
    opacity: 0.3,
  },
  customGalleryImage: {
    flex: 1,
    borderRadius: 4,
  },
  customGalleryImageDisabled: {
    opacity: 0.5,
  },
  customGalleryMarkedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    margin: 2,
  },
  customGalleryMarkedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customGalleryMarkedCheck: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  customGallerySelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderRadius: 4,
    margin: 2,
  },
  customGallerySelectedIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customGallerySelectedCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  customGalleryLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customGalleryEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});