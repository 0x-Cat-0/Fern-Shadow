import React, { useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { useTheme } from '../hooks/useTheme';

const NUM_COLUMNS = 4;

interface CustomGalleryPickerProps {
  visible: boolean;
  images: MediaLibrary.Asset[];
  selectedIds: string[];
  existingUris: string[];
  hideAlreadyAdded: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onToggleSelection: (asset: MediaLibrary.Asset) => void;
  onHideToggle: (value: boolean) => void;
  onLongPressSelection?: (asset: MediaLibrary.Asset) => void;
}

// 按日期分组的数据结构
interface GallerySection {
  title: string;
  data: MediaLibrary.Asset[];
}

// 将图片按日期分组
function groupImagesByDate(images: MediaLibrary.Asset[], existingUris: string[] = [], hideAlreadyAdded: boolean = false): GallerySection[] {
  // 如果开启隐藏，则过滤掉已添加的图片（使用 URI 判断）
  const filteredImages = hideAlreadyAdded && existingUris.length > 0
    ? images.filter(img => {
        const imgUri = img.uri;
        // 判断是否已添加（精确匹配 URI）
        return !existingUris.includes(imgUri);
      })
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

// 图片项组件
function ImageItem({
  item,
  isSelected,
  isAlreadyAdded,
  isDisabled,
  onPress,
  onLongPress,
  colors
}: {
  item: MediaLibrary.Asset;
  isSelected: boolean;
  isAlreadyAdded: boolean;
  isDisabled: boolean;
  onPress: () => void;
  onLongPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.itemContainer, isDisabled && styles.itemDisabled]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      activeOpacity={isDisabled ? 1 : 0.7}
      disabled={isDisabled}
    >
      <Image source={{ uri: item.uri }} style={styles.itemImage} />
      {isAlreadyAdded && !isDisabled && (
        <View style={styles.markedBadge}>
          <Text style={styles.markedText}>✓</Text>
        </View>
      )}
      {isSelected && (
        <View style={[styles.selectedBorder, { borderColor: colors.primary }]}>
          <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.selectedText}>✓</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function CustomGalleryPicker({
  visible,
  images,
  selectedIds,
  existingUris,
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

  // 按日期分组
  const sections = useMemo(() => groupImagesByDate(images, existingUris, hideAlreadyAdded), [images, existingUris, hideAlreadyAdded]);

  // 处理长按选择
  const handleLongPress = useCallback((asset: MediaLibrary.Asset) => {
    // 长按选中当前项
    if (asset.id) {
      onLongPressSelection?.(asset);
    }
  }, [onLongPressSelection]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* 顶部栏 */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>取消</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            选择图片{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </Text>
          <TouchableOpacity onPress={onConfirm} style={styles.headerBtn}>
            <Text style={[styles.confirmText, { color: selectedIds.length > 0 ? colors.primary : colors.textDisabled }]}>
              完成
            </Text>
          </TouchableOpacity>
        </View>

        {/* 模式切换栏 */}
        <View style={[styles.modeBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.modeText, { color: colors.textPrimary }]}>
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
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ color: colors.textSecondary }}>没有可选择的图片</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {formatDateTitle(section.title)}
                </Text>
                <View style={styles.grid}>
                  {section.data.map((item) => {
                    const isSelected = item.id ? selectedIds.includes(item.id) : false;
                    const isAlreadyAdded = existingUris.includes(item.uri);
                    const isDisabled = hideAlreadyAdded && isAlreadyAdded;

                    return (
                      <ImageItem
                        key={item.id || String(item.uri)}
                        item={item}
                        isSelected={isSelected}
                        isAlreadyAdded={isAlreadyAdded}
                        isDisabled={isDisabled}
                        onPress={() => onToggleSelection(item)}
                        onLongPress={() => handleLongPress(item)}
                        colors={colors}
                      />
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
  cancelText: {
    fontSize: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  modeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 1,
  },
  itemContainer: {
    width: '25%',
    aspectRatio: 1,
    padding: 1,
  },
  itemDisabled: {
    opacity: 0.3,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  markedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
