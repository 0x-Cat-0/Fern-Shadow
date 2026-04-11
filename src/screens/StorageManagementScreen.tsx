import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import { IndividualRepository, RecordRepository } from '../database/repositories';
import { getFileSize, formatFileSize } from '../utils/StorageUtils';

interface Props {
  onClose: () => void;
}

interface StorageItem {
  plantName: string;
  imageCount: number;
  size: number;
  coverImage?: string;
}

export default function StorageManagementScreen({ onClose }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const [totalSize, setTotalSize] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [storageList, setStorageList] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const individuals = await IndividualRepository.findAll();
      const items: StorageItem[] = [];
      let totalSize = 0;
      let totalImages = 0;

      for (const individual of individuals) {
        const records = await RecordRepository.findByIndividualId(individual.id);
        let imageCount = 0;
        let totalIndividualSize = 0;

        for (const record of records) {
          const paths = Array.isArray(record.imagePath)
            ? record.imagePath
            : record.imagePath ? [record.imagePath] : [];
          imageCount += paths.length;
          totalImages += paths.length;

          // 逐个获取每个文件的大小
          for (const path of paths) {
            totalIndividualSize += await getFileSize(path);
          }
        }

        items.push({
          plantName: individual.title,
          imageCount,
          size: totalIndividualSize,
          coverImage: individual.coverImagePath,
        });

        totalSize += totalIndividualSize;
      }

      // 按大小排序
      items.sort((a, b) => b.size - a.size);
      setStorageList(items);
      setTotalSize(totalSize);
      setTotalImages(totalImages);
    } catch (error) {
      console.error('Failed to load storage data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />

      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textPrimary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>存储管理</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* 总览 */}
        <View style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
          <View style={styles.overviewRow}>
            <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>已用空间</Text>
            <Text style={[styles.overviewValue, { color: colors.textPrimary }]}>{formatFileSize(totalSize)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.overviewRow}>
            <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>照片数量</Text>
            <Text style={[styles.overviewValue, { color: colors.textPrimary }]}>{totalImages} 张</Text>
          </View>
        </View>

        {/* 存储列表 */}
        <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.listTitle, { color: colors.textPrimary }]}>各植物存储</Text>
          {storageList.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textDisabled }]}>暂无数据</Text>
          ) : (
            storageList.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <View style={styles.listItem}>
                  <Image
                    source={item.coverImage ? { uri: item.coverImage } : require('../../assets/icons/fern.png')}
                    style={styles.itemCover}
                    resizeMode="cover"
                  />
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.plantName}</Text>
                    <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{item.imageCount} 张照片</Text>
                  </View>
                  <Text style={[styles.itemSize, { color: colors.textSecondary }]}>{formatFileSize(item.size)}</Text>
                </View>
              </React.Fragment>
            ))
          )}
        </View>
      </ScrollView>
    </View>
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
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  overviewCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  overviewLabel: {
    fontSize: 15,
  },
  overviewValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  listCard: {
    borderRadius: 12,
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemCover: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
  },
  itemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  itemSize: {
    fontSize: 13,
  },
});