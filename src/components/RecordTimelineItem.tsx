import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { RecordItem } from '../screens/IndividualDetailScreen';

const IMAGE_GAP = 4;

interface RecordTimelineItemProps {
  item: RecordItem;
  index: number;
  isFirst: boolean;
  isToday: (timestamp: number) => boolean;
  imageSize: number;
  editingTitleId: number | null;
  editingDescId: number | null;
  editTitle: string;
  editDescription: string;
  onTitlePress: (item: RecordItem) => void;
  onDescPress: (item: RecordItem) => void;
  onSaveTitle: (recordId: number) => void;
  onSaveDescription: (recordId: number) => void;
  onImagePress: (allRecordsPaths: { recordId: number; paths: string[] }[], clickedPath: string) => void;
  onImageLongPress: (
    event: any,
    recordId: number,
    recordDateTimestamp: number,
    imagePath: string,
    imageIndex: number
  ) => void;
  onAddImage: (recordId: number) => void;
  records: RecordItem[];
  titleInputRef: React.RefObject<TextInput | null>;
  descInputRef: React.RefObject<TextInput | null>;
  setEditTitle: (text: string) => void;
  setEditDescription: (text: string) => void;
}

export function RecordTimelineItem({
  item,
  index,
  isFirst,
  isToday,
  imageSize,
  editingTitleId,
  editingDescId,
  editTitle,
  editDescription,
  onTitlePress,
  onDescPress,
  onSaveTitle,
  onSaveDescription,
  onImagePress,
  onImageLongPress,
  onAddImage,
  records,
  titleInputRef,
  descInputRef,
  setEditTitle,
  setEditDescription,
}: RecordTimelineItemProps) {
  const isEditingTitle = editingTitleId === item.id;
  const isEditingDesc = editingDescId === item.id;

  const formatYear = (timestamp: number): string => {
    return String(new Date(timestamp).getFullYear());
  };

  const measureTextWidth = (text: string): number => {
    return Math.max(50, text.length * 8 + 10);
  };

  return (
    <View style={styles.recordItem}>
      {/* 日期 - 左侧固定宽度 */}
      <View style={styles.dateSection}>
        <View style={styles.dateTextWrapper}>
          <Text style={[styles.dateText, { color: '#333333' }]}>{item.date}</Text>
          <Text style={[styles.yearText, { color: '#cccccc' }]}>{formatYear(item.dateTimestamp)}</Text>
        </View>
      </View>

      {/* 节点区域 */}
      <View style={styles.nodeSection}>
        {/* 如果有虚拟今天记录，第一个实际记录需要显示连接线 */}
        {!isFirst && <View style={styles.nodeLineTop} />}
        <View style={[styles.nodeDot, { backgroundColor: '#ffffff', borderColor: '#e0e0e0' }]} />
        <View style={styles.nodeLineBottom} />
      </View>

      {/* 内容区域 */}
      <View style={styles.contentSection}>
        {/* 标题 */}
        {isEditingTitle ? (
          <TextInput
            ref={titleInputRef}
            style={[styles.recordTitle, styles.inlineInput, { color: '#333333', width: measureTextWidth(editTitle) }]}
            value={editTitle}
            onChangeText={setEditTitle}
            onBlur={() => onSaveTitle(item.id)}
            onSubmitEditing={() => onSaveTitle(item.id)}
            autoFocus
          />
        ) : (
          <TouchableOpacity onPress={() => onTitlePress(item)} activeOpacity={0.7} style={styles.inlineTouchable}>
            <Text style={[styles.recordTitle, { color: '#333333' }]}>{item.title}</Text>
          </TouchableOpacity>
        )}

        {/* 描述 */}
        {isEditingDesc ? (
          <TextInput
            ref={descInputRef}
            style={[styles.recordDesc, styles.inlineInput, { color: '#666666', width: measureTextWidth(editDescription || '点击添加描述...') }]}
            value={editDescription}
            onChangeText={setEditDescription}
            onBlur={() => onSaveDescription(item.id)}
            multiline
            placeholder="点击添加描述..."
            placeholderTextColor="#cccccc"
          />
        ) : (
          <TouchableOpacity onPress={() => onDescPress(item)} activeOpacity={0.7} style={styles.inlineTouchable}>
            <Text style={[styles.recordDesc, { color: item.description ? '#666666' : '#cccccc' }]}>
              {item.description || '点击添加描述...'}
            </Text>
          </TouchableOpacity>
        )}

        {/* 图片 */}
        <View style={styles.imagesContainer}>
          {item.imagePaths.length > 0 ? (
            <>
              {item.imagePaths.map((path: string, idx: number) => {
                return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    const allPaths = records.map(r => ({ recordId: r.id, paths: r.imagePaths }));
                    onImagePress(allPaths, path);
                  }}
                  onLongPress={(e) => onImageLongPress(e, item.id, item.dateTimestamp, path, idx)}
                  delayLongPress={500}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: path }}
                    style={[styles.recordImage, { width: imageSize, height: imageSize }]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
              })}
              {/* 今天的记录显示添加按钮 */}
              {isToday(item.dateTimestamp) && (
                <TouchableOpacity
                  style={[styles.recordImage, styles.addImageBtn, { width: imageSize, height: imageSize }]}
                  onPress={() => onAddImage(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addImageIcon}>+</Text>
                </TouchableOpacity>
              )}
            </>
          ) : isToday(item.dateTimestamp) ? (
            /* 今天无图片时显示占位符 */
            <TouchableOpacity
              style={[styles.recordImage, styles.addImageBtn, { width: imageSize, height: imageSize }]}
              onPress={() => onAddImage(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.addImageIcon}>+</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  recordItem: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  dateSection: {
    width: 60,
    alignItems: 'flex-end',
  },
  dateTextWrapper: {
    alignItems: 'flex-end',
    width: 60,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  yearText: {
    fontSize: 10,
    marginTop: 2,
  },
  nodeSection: {
    width: 16,
    alignItems: 'center',
  },
  nodeLineTop: {
    position: 'absolute',
    top: 0,
    width: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
  },
  nodeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginTop: 1,
  },
  nodeLineBottom: {
    position: 'absolute',
    top: 11,
    bottom: -20,
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  contentSection: {
    flex: 1,
    paddingLeft: 12,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  recordDesc: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  inlineInput: {
    padding: 0,
    margin: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#999999',
    backgroundColor: 'transparent',
  },
  inlineTouchable: {
    alignSelf: 'flex-start',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IMAGE_GAP,
    marginTop: 8,
  },
  recordImage: {
    borderRadius: 4,
    backgroundColor: '#e8e8e8',
  },
  addImageBtn: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageIcon: {
    fontSize: 32,
    color: '#cccccc',
    fontWeight: '300',
  },
});