import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { Individual } from '../types';

interface IndividualCardProps {
  individual: Individual | null;
  daysSinceCreation: number;
  daysSinceLastRecord: number;
  recordCount: number;
  totalImages: number;
}

export function IndividualCard({
  individual,
  daysSinceCreation,
  daysSinceLastRecord,
  recordCount,
  totalImages,
}: IndividualCardProps) {
  return (
    <View style={styles.individualCard}>
      <Image
        source={individual?.coverImagePath ? { uri: individual.coverImagePath } : require('../../assets/icons/fern.png')}
        style={styles.coverImage}
        resizeMode="cover"
      />
      <View style={styles.infoContent}>
        <View style={styles.infoTop}>
          <Text style={[styles.individualTitle, { color: '#333333' }]}>{individual?.title}</Text>
          {individual?.description ? (
            <Text style={[styles.individualDesc, { color: '#666666' }]} numberOfLines={2}>
              {individual.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.infoBottom}>
          <Text style={[styles.individualStats, { color: '#999999' }]}>
            已经陪伴{daysSinceCreation}天 · 上次记录{daysSinceLastRecord}天前
          </Text>
          <Text style={[styles.individualStats, { color: '#999999' }]}>
            {recordCount} 条记录 · 共{totalImages}张图片 · <Image source={require('../../assets/icons/view.png')} style={{width: 12, height: 12}} /> {individual?.viewCount || 0}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  individualCard: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  coverImage: {
    width: 100,
    height: 120,
    borderRadius: 6,
    backgroundColor: '#e8e8e8',
  },
  infoContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  infoTop: {
    gap: 4,
    paddingTop: 8,
  },
  infoBottom: {
    gap: 4,
  },
  individualTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  individualDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  individualStats: {
    fontSize: 12,
  },
});