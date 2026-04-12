import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore } from '../store/settingsStore';

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 280;

export function SideDrawer({ visible, onClose }: SideDrawerProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { copyImageToApp, setCopyImageToApp } = useSettingsStore();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      slideAnim.setValue(-DRAWER_WIDTH);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isRendered) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsRendered(false);
      });
    }
  }, [visible, isRendered, slideAnim, fadeAnim]);

  if (!isRendered) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* 背景遮罩 */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* 抽屉内容 - 左侧 */}
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.surface,
            paddingTop: insets.top + 20,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.drawerContent}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>设置</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                复制图片到应用目录
              </Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                关闭则直接使用原图路径，加载更快但原图删除后无法显示
              </Text>
            </View>
            <Switch
              value={copyImageToApp}
              onValueChange={setCopyImageToApp}
              trackColor={{ false: '#e0e0e0', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
        >
          <Text style={[styles.closeBtnText, { color: colors.primary }]}>
            关闭
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    paddingHorizontal: 20,
  },
  drawerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  closeBtn: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
