import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  SectionList,
  ScrollView,
  Dimensions,
  Switch,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
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
  onImagePress: (img: MediaLibrary.Asset) => void;
  onCheckboxPress: () => void;
  colors: any;
}

const MemoizedGalleryImageItem = React.memo(GalleryImageItem);

// 预定义样式
const checkboxBaseStyle = {
  position: 'absolute' as const,
  bottom: 6,
  right: 6,
  width: 22,
  height: 22,
  borderRadius: 11,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

function GalleryImageItem({
  item,
  isSelected,
  isAlreadyAdded,
  onImagePress,
  onCheckboxPress,
  colors,
}: GalleryImageItemProps) {
  const showGrayCheck = isAlreadyAdded && !isSelected;
  const showBlueCheck = isSelected;
  const checkboxBgColor = showBlueCheck ? '#2196F3' : showGrayCheck ? '#888888' : 'rgba(255,255,255,0.85)';
  const hasBorder = !isSelected;
  const checkmarkOpacity = (showBlueCheck || showGrayCheck) ? 1 : 0;

  return (
    <View style={styles.gridItem}>
      <TouchableOpacity
        style={styles.imageTouchable}
        onPress={() => onImagePress(item)}
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
          checkboxBaseStyle,
          { backgroundColor: checkboxBgColor },
          hasBorder && { borderColor: '#ddd', borderWidth: 2 },
        ]}
        onPress={onCheckboxPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={1}
      >
        <Text style={[styles.checkmarkWhite, { opacity: checkmarkOpacity }]}>✓</Text>
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

// SectionList 的 section 类型
interface Section {
  title: string;
  data: MediaLibrary.Asset[];
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
  const { height: screenHeight } = useWindowDimensions();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [hideAlreadyAdded, setHideAlreadyAdded] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);

  // 使用 Set 存储选中 ID
  const [localSelectedSet, setLocalSelectedSet] = useState<Set<string>>(new Set());

  // 同步外部 selectedIds 到本地 Set
  useEffect(() => {
    setLocalSelectedSet(new Set(selectedIds));
  }, [selectedIds]);

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
        if (pageY < 100) return;
        if (pageY > screenH - 120) return;
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

  // 使用 Set 进行 O(1) 查找
  const normalizedExistingSet = useMemo(() => new Set(existingUris.map(normalizeUri)), [existingUris]);

  const checkIsAlreadyAdded = useCallback((uri: string) => {
    return normalizedExistingSet.has(normalizeUri(uri));
  }, [normalizedExistingSet]);

  const handleConfirm = useCallback(() => {
    if (localSelectedSet.size === 0) return;
    const selected = images.filter(img => img.id && localSelectedSet.has(img.id));
    onConfirm(selected);
  }, [localSelectedSet, images, onConfirm]);

  // 点击复选框
  const handleCheckboxPress = useCallback((item: MediaLibrary.Asset) => {
    if (!item.id) return;

    setLocalSelectedSet(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item.id)) {
        newSet.delete(item.id);
      } else {
        newSet.add(item.id);
      }
      return newSet;
    });

    requestAnimationFrame(() => {
      onToggleSelection(item);
    });
  }, [onToggleSelection]);

  // 长按选择
  const handleLongPress = useCallback((item: MediaLibrary.Asset) => {
    if (item.id && !localSelectedSet.has(item.id)) {
      setLocalSelectedSet(prev => new Set(prev).add(item.id));
      requestAnimationFrame(() => {
        onToggleSelection(item);
      });
    }
    setIsSelecting(true);
  }, [localSelectedSet, onToggleSelection]);

  // 预览当前图片
  const [previewItem, setPreviewItem] = useState<MediaLibrary.Asset | null>(null);

  const handleClosePreview = useCallback(() => {
    setPreviewIndex(null);
    setPreviewItem(null);
  }, []);

  // 格式化日期
  const formatDateHeader = useCallback((timestamp: number): string => {
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
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    }
  }, []);

  // 将图片转换为 SectionList 需要的 section 格式
  const sections = useMemo((): Section[] => {
    let filtered = images;
    if (hideAlreadyAdded) {
      filtered = images.filter(img => {
        if (img.id && localSelectedSet.has(img.id)) {
          return true;
        }
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

    return groups.map(g => ({ title: g.date, data: g.data }));
  }, [images, hideAlreadyAdded, checkIsAlreadyAdded, localSelectedSet, formatDateHeader]);

  // 展平分组图片为一维数组（用于预览）
  const flatGroupedImages = useMemo(() => {
    const result: MediaLibrary.Asset[] = [];
    sections.forEach(section => {
      result.push(...section.data);
    });
    return result;
  }, [sections]);

  const handleImagePress = useCallback((img: MediaLibrary.Asset) => {
    const index = flatGroupedImages.findIndex(i => i.id === img.id);
    if (index >= 0) {
      setPreviewIndex(index);
      setPreviewItem(img);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: false });
      }, 0);
    }
  }, [flatGroupedImages]);

  // 渲染一行图片（每行4张）
  const renderRow = useCallback(({ item, index, section }: { item: MediaLibrary.Asset; index: number; section: Section }) => {
    // SectionList 会为每个 item 调用一次 renderItem
    // 只在每行的第一项时渲染整行
    const isFirstInRow = index % NUM_COLUMNS === 0;
    if (!isFirstInRow) {
      return null;
    }

    const rowStartIndex = index;
    const rowImages = section.data.slice(rowStartIndex, rowStartIndex + NUM_COLUMNS);

    return (
      <View style={styles.gridRow}>
        {rowImages.map((img, idx) => {
          const isSelected = img.id ? localSelectedSet.has(img.id) : false;
          const isAlreadyAdded = checkIsAlreadyAdded(img.uri);

          return (
            <MemoizedGalleryImageItem
              key={img.id ?? `${img.uri}-${idx}`}
              item={img}
              isSelected={isSelected}
              isAlreadyAdded={isAlreadyAdded}
              onImagePress={() => handleImagePress(img)}
              onCheckboxPress={() => handleCheckboxPress(img)}
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
  }, [localSelectedSet, checkIsAlreadyAdded, handleImagePress, handleCheckboxPress, colors]);

  // 渲染 section header
  const renderSectionHeader = useCallback(({ section }: { section: Section }) => {
    return (
      <View style={styles.dateHeader}>
        <Text style={styles.dateHeaderText}>{section.title}</Text>
      </View>
    );
  }, []);

  // 加载更多检测
  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) {
      onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  // 预览相关
  const currentPreviewItem = previewItem;
  const isCurrentSelected = currentPreviewItem?.id ? localSelectedSet.has(currentPreviewItem.id) : false;
  const isAlreadyAddedForPreview = currentPreviewItem ? checkIsAlreadyAdded(currentPreviewItem.uri) : false;

  const scrollViewRef = useRef<any>(null);

  const handlePreviewScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (newIndex !== previewIndex && newIndex >= 0 && newIndex < flatGroupedImages.length) {
      setPreviewIndex(newIndex);
      setPreviewItem(flatGroupedImages[newIndex]);
    }
  }, [previewIndex, flatGroupedImages]);

  // 计算可见项的 key
  const keyExtractor = useCallback((item: MediaLibrary.Asset, index: number) => {
    return item.id ?? `${item.uri}-${index}`;
  }, []);

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
                已选 {localSelectedSet.size} 项
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
            ) : sections.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ color: colors.textSecondary }}>没有可选择的图片</Text>
              </View>
            ) : (
              <SectionList
                sections={sections}
                keyExtractor={keyExtractor}
                renderItem={renderRow}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={false}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  loading && hasMore ? (
                    <View style={styles.loadMoreLoading}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : null
                }
                contentContainerStyle={{
                  paddingHorizontal: PADDING_HORIZONTAL,
                  paddingBottom: 16,
                }}
                style={styles.sectionList}
                windowSize={5}
                maxToRenderPerBatch={20}
                initialNumToRender={50}
              />
            )}
          </View>

          <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
            <View style={styles.previewInfo}>
              <Text style={[styles.previewText, { color: colors.primary }]}>
                预览 {localSelectedSet.size}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: localSelectedSet.size > 0 ? colors.primary : colors.border }
              ]}
              onPress={handleConfirm}
              disabled={localSelectedSet.size === 0}
            >
              <Text style={styles.confirmBtnText}>确认</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 全屏预览 */}
        <Modal
          visible={previewIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={handleClosePreview}
        >
          <View style={styles.previewContainer} {...previewPanResponder.panHandlers}>
            <TouchableOpacity style={styles.previewCloseBtn} onPress={handleClosePreview}>
              <Text style={styles.previewCloseText}>×</Text>
            </TouchableOpacity>

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
              {flatGroupedImages.map((image: MediaLibrary.Asset, index: number) => (
                <View key={image.id ?? `${image.uri}-${index}`} style={styles.previewImageWrapper}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.previewIndicator}>
              <Text style={styles.previewIndicatorText}>
                {flatGroupedImages.length > 0 ? (previewIndex ?? 0) + 1 : 0}/{flatGroupedImages.length}
              </Text>
            </View>

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
                activeOpacity={1}
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
  sectionList: {
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
    overflow: 'hidden',
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
  loadMoreLoading: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  previewScrollView: {
    flex: 1,
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
