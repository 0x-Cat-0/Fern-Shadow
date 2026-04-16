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
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../hooks/useTheme';
import { recognizePlant, imageUriToBase64, PlantResult } from '../utils/baiduPlantApi';
import type { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PlantRecognitionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlantResult[]>([]);
  const [error, setError] = useState<string | null>(null);

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

      // 如果传入的是 URI 而不是 base64，需要转换
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

  // 使用识别结果创建植物
  const handleCreatePlant = (plantName: string) => {
    navigation.navigate('CreateIndividual', {
      imageSource: 'library',
    });
  };

  // 重新选择图片
  const handleReselect = () => {
    setSelectedImage(null);
    setResults([]);
    setError(null);
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
        {/* 没有选择图片时，显示默认图和按钮 */}
        {!selectedImage && (
          <View style={styles.selectArea}>
            {/* 默认图标 */}
            <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
              <Image
                source={require('../../assets/icons/icon.png')}
                style={styles.defaultIcon}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.selectTitle, { color: colors.textPrimary }]}>
              拍摄或选择植物图片
            </Text>
            <Text style={[styles.selectSubtitle, { color: colors.textSecondary }]}>
              识别植物种类
            </Text>

            {/* 按钮组 */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleTakePhoto}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>拍照识别</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { borderColor: colors.primary }]}
                onPress={handlePickFromLibrary}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonTextSecondary, { color: colors.primary }]}>相册选择</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 加载中 */}
        {loading && (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              AI 识别中...
            </Text>
          </View>
        )}

        {/* 显示选中的图片和结果 */}
        {selectedImage && !loading && (
          <View style={styles.resultArea}>
            {/* 图片预览 */}
            <View style={[styles.imageWrapper, { backgroundColor: colors.surface }]}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.selectedImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <TouchableOpacity
                  style={[styles.changeBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                  onPress={handleReselect}
                >
                  <Text style={styles.changeBtnText}>更换图片</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 识别结果列表 */}
            {results.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  识别结果
                </Text>
                <View style={styles.resultsList}>
                  {results.map((result, index) => (
                    <View
                      key={index}
                      style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <View style={styles.resultTop}>
                        <View style={styles.resultInfo}>
                          <Text style={[styles.resultName, { color: colors.textPrimary }]}>
                            {result.name}
                          </Text>
                          <Text style={[styles.resultScore, { color: colors.textSecondary }]}>
                            置信度 {Math.round(result.probability! * 100)}%
                          </Text>
                        </View>
                        {index === 0 && (
                          <View style={[styles.topBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.topBadgeText}>最佳匹配</Text>
                          </View>
                        )}
                      </View>

                      {result.description && (
                        <Text style={[styles.resultDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                          {result.description}
                        </Text>
                      )}

                      <TouchableOpacity
                        style={[styles.createBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleCreatePlant(result.name)}
                      >
                        <Text style={styles.createBtnText}>创建植物记录</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 错误提示 */}
            {error && (
              <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
                <TouchableOpacity
                  style={[styles.errorBtn, { borderColor: colors.primary }]}
                  onPress={handleReselect}
                >
                  <Text style={[styles.errorBtnText, { color: colors.primary }]}>重新选择图片</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
    flexGrow: 1,
    padding: 20,
  },
  selectArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  defaultIcon: {
    width: 80,
    height: 80,
  },
  selectTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectSubtitle: {
    fontSize: 14,
    marginBottom: 32,
  },
  buttonGroup: {
    width: '100%',
    maxWidth: 280,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 60,
  },
  loadingText: {
    fontSize: 16,
  },
  resultArea: {
    gap: 20,
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: 220,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    alignItems: 'flex-end',
  },
  changeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  changeBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  resultsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultsList: {
    gap: 12,
  },
  resultCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultScore: {
    fontSize: 13,
  },
  topBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  topBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resultDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  createBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});