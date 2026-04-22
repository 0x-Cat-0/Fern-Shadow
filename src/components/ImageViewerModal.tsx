import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface ImageViewerModalProps {
  visible: boolean;
  imagePaths: string[];
  currentIndex: number | null;
  onClose: () => void;
  scrollViewRef: React.RefObject<ScrollView | null>;
}

export function ImageViewerModal({
  visible,
  imagePaths,
  currentIndex,
  onClose,
  scrollViewRef,
}: ImageViewerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.imageViewerContainer}>
        {/* 顶部关闭按钮 */}
        <View style={styles.imageViewerHeader}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={onClose}
          >
            <Text style={styles.imageViewerCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 图片滑动区域 */}
        <FlatList
          ref={scrollViewRef as any}
          data={imagePaths}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={currentIndex ?? 0}
          getItemLayout={(data, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          keyExtractor={(item, index) => `viewer-${index}`}
          renderItem={({ item: path }) => (
            <View style={[styles.imageViewerItem, { width: screenWidth }]}>
              <TouchableOpacity
                style={styles.imageTouchable}
                onPress={onClose}
                activeOpacity={1}
              >
                <Image
                  source={{ uri: path }}
                  style={styles.imageViewerImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          )}
        />

        {/* 页码指示器 */}
        {imagePaths.length > 1 && (
          <View style={styles.imageViewerIndicator}>
            <Text style={styles.imageViewerIndicatorText}>
              {(currentIndex || 0) + 1} / {imagePaths.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageViewerHeader: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  imageViewerClose: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseText: {
    fontSize: 24,
    color: '#ffffff',
  },
  imageViewerItem: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerIndicator: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  imageViewerIndicatorText: {
    color: '#ffffff',
    fontSize: 12,
  },
});