import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ViewStyle,
  StyleProp,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../hooks/useTheme';
import { spacing, layout } from '../theme/spacing';
import { typography } from '../theme/typography';

interface ImagePickerButtonProps {
  imagePath?: string;
  onImageSelected: (uri: string) => void;
  onImageRemoved?: () => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  size?: 'small' | 'normal' | 'large';
}

export function ImagePickerButton({
  imagePath,
  onImageSelected,
  onImageRemoved,
  placeholder = '选择图片',
  style,
  size = 'normal',
}: ImagePickerButtonProps) {
  const colors = useTheme();

  const dimension =
    size === 'small' ? 80 : size === 'large' ? 200 : layout.avatarSize;

  const requestPermission = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相机权限才能拍照');
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相册权限才能选择图片');
        return false;
      }
    }
    return true;
  };

  const pickImage = async (type: 'camera' | 'library') => {
    const hasPermission = await requestPermission(type);
    if (!hasPermission) return;

    const result =
      type === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
          });

    if (!result.canceled && result.assets[0]) {
      // 直接使用原始 URI，不复制到应用目录
      onImageSelected(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert('选择图片', '请选择图片来源', [
      { text: '拍照', onPress: () => pickImage('camera') },
      { text: '从相册选择', onPress: () => pickImage('library') },
      ...(imagePath && onImageRemoved
        ? [{ text: '移除图片', onPress: onImageRemoved, style: 'destructive' as const }]
        : []),
      { text: '取消', style: 'cancel' as const },
    ]);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        style,
      ]}
      onPress={showImageOptions}
      activeOpacity={0.7}
    >
      {imagePath ? (
        <Image
          source={{ uri: imagePath }}
          style={[
            styles.image,
            {
              width: dimension - 4,
              height: dimension - 4,
              borderRadius: (dimension - 4) / 2,
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={[styles.icon, { color: colors.textDisabled }]}>+</Text>
          <Text style={[styles.placeholderText, { color: colors.textDisabled }]}>
            {placeholder}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  placeholderText: {
    fontSize: typography.fontSize.xs,
  },
});