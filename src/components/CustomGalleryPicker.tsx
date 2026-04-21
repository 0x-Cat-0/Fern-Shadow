import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  SectionList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  onLongPressSelection?: (asset: MediaLibrary.Asset) => void;  // 长按选择回调
}

// 按日期分组的数据结构
interface GallerySection {
  title: string;
  data: MediaLibrary.Asset[];
}

// 将图片按日期分组
function groupImagesByDate(images: MediaLibrary.Asset[], existingAssetIds: string[] = [], hideAlreadyAdded: boolean = false): GallerySection[] {
  // 如果开启隐藏，则过滤掉已添加的图片
  const filteredImages = hideAlreadyAdded && existingAssetIds.length > 0
    ? images.filter(img => !(img.id && existingAssetIds.includes(img.id)))
    : images;

  const groups = new Map<string, MediaLibrary.Asset[]>();

  for (const image of filteredImages) {
    const date = new Date(image.creationTime || Date.now());
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(image);
  }

  // 转换为数组并按日期降序排列（最新的在前）
  const sections: GallerySection[] = [];
  groups.forEach((data, title) => {
    sections.push({ title, data });
  });
  sections.sort((a, b) => b.title.localeCompare(a.title));

  return sections;
}

// 格式化日期显示
function formatDateTitle(dateStr: string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateStr === todayStr) return '今天';
  if (dateStr === yesterdayStr) return '昨天';
  return dateStr;
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
  onLongPressSelection,
}: CustomGalleryPickerProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  // 长按选择模式
  const handleLongPress = (asset: MediaLibrary.Asset) => {
    if (onLongPressSelection) {
      onLongPressSelection(asset);
    } else {
      // 默认行为：直接切换选择状态
      onToggleSelection(asset);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.customGalleryContainer, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* 顶部栏 */}
        <View style={[styles.customGalleryHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={[styles.customGalleryCancelText, { color: colors.textSecondary }]}>取消</Text>
          </TouchableOpacity>
          <Text style={[styles.customGalleryTitle, { color: colors.textPrimary }]}>
            选择图片 {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Text>
          <TouchableOpacity onPress={onConfirm} style={styles.headerBtn}>
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
          <SectionList
            sections={useMemo(() => groupImagesByDate(images, existingAssetIds, hideAlreadyAdded), [images, existingAssetIds, hideAlreadyAdded])}
            keyExtractor={(item) => item.id || String(item.uri)}
            renderItem={({ item }) => {
              const isSelected = item.id ? selectedIds.includes(item.id) : false;
              const isAlreadyAdded = item.id ? existingAssetIds.includes(item.id) : false;
              const isDisabled = hideAlreadyAdded && isAlreadyAdded;

              return (
                <TouchableOpacity
                  style={[styles.customGalleryItem, isDisabled && styles.customGalleryItemDisabled]}
                  onPress={() => !isDisabled && onToggleSelection(item)}
                  onLongPress={() => !isDisabled && handleLongPress(item)}
                  delayLongPress={300}
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
            renderSectionHeader={({ section: { title } }) => (
              <View style={[styles.customGallerySectionHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.customGallerySectionTitle, { color: colors.textSecondary }]}>
                  {formatDateTitle(title)}
                </Text>
              </View>
            )}
            contentContainerStyle={styles.customGalleryGrid}
            stickySectionHeadersEnabled={false}
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
  headerBtn: {
    minWidth: 50,
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
  customGallerySectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customGallerySectionTitle: {
    fontSize: 14,
    fontWeight: '500',
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
    width: '100%',
    height: '100%',
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