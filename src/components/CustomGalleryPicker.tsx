import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Switch,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { useTheme } from '../hooks/useTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NUM_COLUMNS = 4;
const GRID_GAP = 8;
const PADDING_HORIZONTAL = 16;
const IMAGE_SIZE = (SCREEN_WIDTH - PADDING_HORIZONTAL * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

function normalizeUri(uri: string): string {
  try {
    const url = new URL(uri);
    return url.origin + url.pathname;
  } catch {
    return uri;
  }
}

interface GalleryImageItemProps {
  item: MediaLibrary.Asset;
  isSelected: boolean;
  isAlreadyAdded: boolean;
  onImagePress: () => void;
  onCheckboxPress: () => void;
  onLongPress: () => void;
  colors: any;
}

function GalleryImageItem({
  item,
  isSelected,
  isAlreadyAdded,
  onImagePress,
  onCheckboxPress,
  onLongPress,
  colors,
}: GalleryImageItemProps) {
  // 已添加但未选中：显示灰色对号
  const showGrayCheck = isAlreadyAdded && !isSelected;
  // 选中状态：显示蓝色对号
  const showBlueCheck = isSelected;

  return (
    <View style={styles.gridItem}>
      <TouchableOpacity
        style={styles.imageTouchable}
        onPress={onImagePress}
        onLongPress={onLongPress}
        delayLongPress={500}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.gridImage}
          resizeMethod="auto"
          fadeDuration={100}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.checkbox,
          showBlueCheck ? { backgroundColor: '#2196F3' } :
          showGrayCheck ? { backgroundColor: '#888888' } : { backgroundColor: 'rgba(255,255,255,0.85)' },
          !isSelected && { borderColor: '#ddd', borderWidth: 2 },
        ]}
        onPress={onCheckboxPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[styles.checkmarkWhite, { opacity: (showBlueCheck || showGrayCheck) ? 1 : 0 }]}>✓</Text>
      </TouchableOpacity>
    </View>
  );
}

interface CustomGalleryPickerProps {
  visible: boolean;
  images: MediaLibrary.Asset[];
  selectedIds: string[];
  existingUris?: string[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onClose: () => void;
  onConfirm: (selectedAssets: MediaLibrary.Asset[]) => void;
  onToggleSelection: (asset: MediaLibrary.Asset) => void;
}

export function CustomGalleryPicker({
  visible,
  images,
  selectedIds,
  existingUris = [],
  loading,
  hasMore,
  onLoadMore,
  onClose,
  onConfirm,
  onToggleSelection,
}: CustomGalleryPickerProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [hideAlreadyAdded, setHideAlreadyAdded] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);

  const [sheetHeight, setSheetHeight] = useState(screenHeight * 0.8);
  const minHeight = screenHeight * 0.4;
  const maxHeight = screenHeight * 0.9;

  // 预览页触摸关闭
  const previewPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const { pageY } = evt.nativeEvent;
        const screenH = SCREEN_HEIGHT;
        // 顶部按钮区域 (y < 100)
        if (pageY < 100) return;
        // 底部按钮区域 (y > screenH - 120)
        if (pageY > screenH - 120) return;
        // 中间区域，关闭预览
        handleClosePreview();
      },
    })
  ).current;

  // 底部弹窗拖动
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isSelecting,
      onMoveShouldSetPanResponder: () => !isSelecting,
      onPanResponderMove: (_, gestureState) => {
        const newHeight = screenHeight - gestureState.moveY;
        if (newHeight >= minHeight && newHeight <= maxHeight) {
          setSheetHeight(newHeight);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const normalizedExisting = useMemo(() => existingUris.map(normalizeUri), [existingUris]);

  // 检查图片是否已添加（数据库中已存在）
  const checkIsAlreadyAdded = useCallback((uri: string) => {
    const normalizedUri = normalizeUri(uri);
    return normalizedExisting.includes(normalizedUri);
  }, [normalizedExisting]);

  const handleConfirm = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selected = images.filter(img => img.id && selectedIds.includes(img.id));
    onConfirm(selected);
  }, [selectedIds, images, onConfirm]);

  const handleImagePress = useCallback((index: number) => {
    setPreviewIndex(index);
  }, []);

  const handleCheckboxPress = useCallback((item: MediaLibrary.Asset) => {
    onToggleSelection(item);
  }, [onToggleSelection]);

  const handleLongPress = useCallback((item: MediaLibrary.Asset) => {
    if (item.id && !selectedIds.includes(item.id)) {
      onToggleSelection(item);
    }
    setIsSelecting(true);
  }, [selectedIds, onToggleSelection]);

  const handleClosePreview = useCallback(() => {
    setPreviewIndex(null);
  }, []);

  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) {
      onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <TouchableOpacity style={styles.loadMoreBtn} onPress={onLoadMore} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.loadMoreText, { color: colors.primary }]}>加载更多</Text>
        )}
      </TouchableOpacity>
    );
  };

  // 格式化日期为显示字符串
  const formatDateHeader = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const imageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (imageDate.getTime() === today.getTime()) {
      return '今天';
    } else if (imageDate.getTime() === yesterday.getTime()) {
      return '昨天';
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  };

  // 按日期分组 - 考虑 hideAlreadyAdded 过滤
  const groupedImages = useMemo(() => {
    // 先过滤：隐藏已添加的图片，但保留当前会话已选择的
    let filtered = images;
    if (hideAlreadyAdded) {
      filtered = images.filter(img => {
        // 如果图片已选择（在当前会话中），保留显示
        if (img.id && selectedIds.includes(img.id)) {
          return true;
        }
        // 否则检查是否已在数据库中存在
        return !checkIsAlreadyAdded(img.uri);
      });
    }

    const groups: { date: string; timestamp: number; data: MediaLibrary.Asset[] }[] = [];
    let currentGroup: { date: string; timestamp: number; data: MediaLibrary.Asset[] } | null = null;

    for (const img of filtered) {
      const timestamp = img.creationTime || Date.now();
      const dateKey = formatDateHeader(timestamp);

      if (!currentGroup || currentGroup.date !== dateKey) {
        if (currentGroup && currentGroup.data.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = { date: dateKey, timestamp, data: [img] };
      } else {
        currentGroup.data.push(img);
      }
    }
    if (currentGroup && currentGroup.data.length > 0) {
      groups.push(currentGroup);
    }
    return groups;
  }, [images, hideAlreadyAdded, checkIsAlreadyAdded, selectedIds]);

  // 渲染一行图片网格（最多4列）
  const renderImageRow = (rowImages: MediaLibrary.Asset[], rowIndex: number, sectionIndex: number) => {
    return (
      <View key={`row-${sectionIndex}-${rowIndex}`} style={styles.gridRow}>
        {rowImages.map((img, idx) => {
          const isSelected = img.id ? selectedIds.includes(img.id) : false;
          const isAlreadyAdded = checkIsAlreadyAdded(img.uri);
          const globalIndex = images.indexOf(img);

          return (
            <GalleryImageItem
              key={img.id || String(img.uri) + idx}
              item={img}
              isSelected={isSelected}
              isAlreadyAdded={isAlreadyAdded}
              onImagePress={() => handleImagePress(globalIndex)}
              onCheckboxPress={() => handleCheckboxPress(img)}
              onLongPress={() => handleLongPress(img)}
              colors={colors}
            />
          );
        })}
        {/* 填充空白 */}
        {Array.from({ length: NUM_COLUMNS - rowImages.length }).map((_, idx) => (
          <View key={`empty-${idx}`} style={styles.gridItem} />
        ))}
      </View>
    );
  };

  // 渲染整个分组列表
  const renderGroupedList = () => {
    return groupedImages.map((group, sectionIndex) => (
      <View key={`section-${sectionIndex}`}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{group.date}</Text>
        </View>
        <View style={styles.gridContent}>
          {Array.from({ length: Math.ceil(group.data.length / NUM_COLUMNS) }).map((_, rowIndex) => {
            const startIdx = rowIndex * NUM_COLUMNS;
            const rowImages = group.data.slice(startIdx, startIdx + NUM_COLUMNS);
            return renderImageRow(rowImages, rowIndex, sectionIndex);
          })}
        </View>
      </View>
    ));
  };

  const currentPreviewItem = previewIndex !== null ? images[previewIndex] : null;
  const isCurrentSelected = currentPreviewItem?.id ? selectedIds.includes(currentPreviewItem.id) : false;
  const isAlreadyAddedForPreview = currentPreviewItem ? checkIsAlreadyAdded(currentPreviewItem.uri) : false;

  // 预览页面的处理
  const scrollViewRef = useRef<ScrollView>(null);

  const handlePreviewScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (newIndex !== previewIndex && newIndex >= 0 && newIndex < images.length) {
      setPreviewIndex(newIndex);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.sheet, { height: sheetHeight, backgroundColor: colors.surface }]}>
          <View style={styles.dragHandleContainer} {...sheetPanResponder.panHandlers}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Text style={[styles.closeText, { color: colors.textPrimary }]}>×</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                已选 {selectedIds.length} 项
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={[styles.hideToggleText, { color: colors.textSecondary }]}>隐藏已添加</Text>
              <Switch
                value={hideAlreadyAdded}
                onValueChange={setHideAlreadyAdded}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {isSelecting && (
            <View style={[styles.selectionTip, { backgroundColor: colors.primary }]}>
              <Text style={styles.selectionTipText}>滑动选择中...</Text>
            </View>
          )}

          <View style={styles.gridContainer}>
            {loading && images.length === 0 ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : groupedImages.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ color: colors.textSecondary }}>没有可选择的图片</Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={{ paddingBottom: 16 }}
                onScroll={(e) => {
                  const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                  if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 100) {
                    handleEndReached();
                  }
                }}
                scrollEventThrottle={100}
                showsVerticalScrollIndicator={false}
              >
                {renderGroupedList()}
                {renderFooter()}
              </ScrollView>
            )}
          </View>

          <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
            <View style={styles.previewInfo}>
              <Text style={[styles.previewText, { color: colors.primary }]}>
                预览 {selectedIds.length}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: selectedIds.length > 0 ? colors.primary : colors.border }
              ]}
              onPress={handleConfirm}
              disabled={selectedIds.length === 0}
            >
              <Text style={styles.confirmBtnText}>确认</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 全屏预览 - 可左右滑动 */}
        <Modal
          visible={previewIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={handleClosePreview}
        >
          <View style={styles.previewContainer} {...previewPanResponder.panHandlers}>
            {/* 关闭按钮 */}
            <TouchableOpacity style={styles.previewCloseBtn} onPress={handleClosePreview}>
              <Text style={styles.previewCloseText}>×</Text>
            </TouchableOpacity>

            {/* 可滑动的图片 */}
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handlePreviewScroll}
              scrollEventThrottle={16}
              style={styles.previewScrollView}
              contentContainerStyle={styles.previewScrollContent}
            >
              {images.map((image: MediaLibrary.Asset, index: number) => (
                <View key={image.id || String(image.uri) + index} style={styles.previewImageWrapper}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>

            {/* 关闭按钮 */}
            <TouchableOpacity style={styles.previewCloseBtn} onPress={handleClosePreview}>
              <Text style={styles.previewCloseText}>×</Text>
            </TouchableOpacity>

            {/* 页码指示器 */}
            <View style={styles.previewIndicator}>
              <Text style={styles.previewIndicatorText}>
                {images.length > 0 ? (previewIndex ?? 0) + 1 : 0}/{images.length}
              </Text>
            </View>

            {/* 右下角选择圆点 - 蓝色选中，灰色已添加 */}
            {currentPreviewItem && (
              <TouchableOpacity
                style={[
                  styles.previewCheckbox,
                  {
                    backgroundColor: isCurrentSelected ? '#2196F3' : isAlreadyAddedForPreview ? '#888888' : 'rgba(255,255,255,0.3)',
                    borderColor: isCurrentSelected ? '#2196F3' : isAlreadyAddedForPreview ? '#888888' : 'rgba(255,255,255,0.5)',
                  }
                ]}
                onPress={() => handleCheckboxPress(currentPreviewItem)}
              >
                                <Text style={[styles.previewCheckboxText, { opacity: (isCurrentSelected || isAlreadyAddedForPreview) ? 1 : 0 }]}>✓</Text>
              </TouchableOpacity>
            )}
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  closeText: {
    fontSize: 28,
    fontWeight: '300',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  hideToggleText: {
    fontSize: 13,
  },
  selectionTip: {
    position: 'absolute',
    top: 70,
    left: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 50,
  },
  selectionTipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  gridContainer: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: PADDING_HORIZONTAL,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  checkbox: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkWhite: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateHeader: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreBtn: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  previewInfo: {
    flex: 1,
  },
  previewText: {
    fontSize: 14,
  },
  confirmBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  previewScrollView: {
    flex: 1,
    zIndex: 2,
  },
  previewScrollContent: {
    flexDirection: 'row',
  },
  previewImageWrapper: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
  },
  previewIndicator: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    zIndex: 10,
  },
  previewIndicatorText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  previewCheckbox: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  previewCheckboxText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
