import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../hooks/useTheme';
import { recognizePlant, imageUriToBase64, PlantResult } from '../utils/baiduPlantApi';

export default function PlantRecognitionScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlantResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // 请求相机权限
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相机权限才能拍照');
      return false;
    }
    return true;
  };

  // 请求相册权限
  const requestLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相册权限才能选择图片');
      return false;
    }
    return true;
  };

  // 拍照识别
  const handleTakePhoto = async () => {
    setShowSourceModal(false);
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);
      await recognizeImage(asset.base64 || asset.uri, asset.uri);
    }
  };

  // 从相册选择
  const handlePickFromLibrary = async () => {
    setShowSourceModal(false);
    const hasPermission = await requestLibraryPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);
      await recognizeImage(asset.base64 || asset.uri, asset.uri);
    }
  };

  // 识别图片
  const recognizeImage = async (imageData: string, uri: string) => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      let base64Data = imageData;

      if (!imageData.startsWith('/9') && !imageData.startsWith('iVBOR')) {
        base64Data = await imageUriToBase64(uri);
      }

      const plantResults = await recognizePlant(base64Data);
      setResults(plantResults);

      if (plantResults.length === 0) {
        setError('未能识别出植物，请尝试其他图片');
      }
    } catch (err) {
      console.error('Recognition failed:', err);
      setError('识别失败，请检查网络后重试');
    } finally {
      setLoading(false);
    }
  };

  // 重新选择图片
  const handleReselect = () => {
    setShowSourceModal(true);
  };

  // 展开/收起详情
  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 顶部留出状态栏 */}
      <View style={{ height: insets.top }} />

      {/* 标题栏 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          AI 植物识别
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 图片预览区域 - 点击可选择图片 */}
        <TouchableOpacity
          style={[styles.imageArea, { backgroundColor: colors.surface }]}
          onPress={() => setShowSourceModal(true)}
          activeOpacity={0.8}
        >
          {selectedImage ? (
            <>
              <Image
                source={{ uri: selectedImage }}
                style={styles.selectedImage}
                resizeMode="cover"
              />
              <View style={styles.imageHint}>
                <Text style={styles.imageHintText}>点击更换图片</Text>
              </View>
            </>
          ) : (
            <View style={styles.placeholderContent}>
              <Image
                source={require('../../assets/icons/icon.png')}
                style={styles.placeholderIcon}
                resizeMode="contain"
              />
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                点击上传植物图片
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 加载中 */}
        {loading && (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              AI 识别中...
            </Text>
          </View>
        )}

        {/* 识别结果 */}
        {results.length > 0 && !loading && (
          <View style={styles.resultsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              识别结果
            </Text>

            {results.slice(0, 5).map((result, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.resultItem,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  index === 0 && { borderColor: colors.primary, borderWidth: 2 },
                ]}
                onPress={() => toggleExpand(index)}
                activeOpacity={0.7}
              >
                <View style={styles.resultLeft}>
                  <Text style={[styles.resultRank, { color: index === 0 ? colors.primary : colors.textDisabled }]}>
                    {index + 1}
                  </Text>
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultName, { color: colors.textPrimary }]}>
                      {result.name}
                    </Text>
                    {result.description && (
                      <Text
                        style={[styles.resultDesc, { color: colors.textSecondary }]}
                        numberOfLines={expandedIndex === index ? undefined : 2}
                      >
                        {result.description}
                      </Text>
                    )}
                    {expandedIndex === index && result.imageUrl && (
                      <Image
                        source={{ uri: result.imageUrl }}
                        style={styles.exampleImage}
                        resizeMode="cover"
                      />
                    )}
                    {result.probability !== undefined && (
                      <View style={styles.resultMeta}>
                        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.progressFill,
                              { backgroundColor: index === 0 ? colors.primary : colors.textSecondary, width: `${Math.round(result.probability * 100)}%` },
                            ]}
                          />
                        </View>
                        <Text style={[styles.resultScore, { color: colors.textSecondary }]}>
                          {Math.round(result.probability * 100)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {index === 0 && (
                  <View style={[styles.topIcon, { backgroundColor: colors.primary }]}>
                    <Text style={styles.topIconText}>最优</Text>
                  </View>
                )}
                {result.description && (
                  <Text style={[styles.expandIcon, { color: colors.textDisabled }]}>
                    {expandedIndex === index ? '收起' : '展开'}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 错误提示 */}
        {error && !loading && (
          <View style={[styles.errorBox, { borderColor: colors.border }]}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* 图片来源选择弹窗 */}
      <Modal
        visible={showSourceModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setShowSourceModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSourceModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={handleTakePhoto}
            >
              <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>拍照</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={handlePickFromLibrary}
            >
              <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>从相册选择</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel]}
              onPress={() => setShowSourceModal(false)}
            >
              <Text style={[styles.modalBtnText, { color: colors.textDisabled }]}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  imageArea: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  imageHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  imageHintText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderIcon: {
    width: 80,
    height: 80,
    opacity: 0.6,
  },
  placeholderText: {
    fontSize: 15,
  },
  loadingArea: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
  resultsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  resultRank: {
    fontSize: 16,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  resultInfo: {
    flex: 1,
    gap: 6,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
  },
  resultDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  exampleImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 8,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  resultScore: {
    fontSize: 12,
    minWidth: 40,
  },
  topIcon: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  topIconText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 12,
    marginLeft: 8,
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  modalBtn: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  modalBtnCancel: {
    borderBottomWidth: 0,
  },
  modalBtnText: {
    fontSize: 16,
  },
});