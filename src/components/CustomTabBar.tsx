import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lightColors } from '../theme/colors';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const getLabel = (name: string) => {
    const labelMap: Record<string, string> = {
      Main: '全部',
      Community: '社区',
      Profile: '我',
    };
    return labelMap[name] || name;
  };

  const handleTabPress = (name: string, routeIndex: number) => {
    if (name === 'Main' && routeIndex === 0) {
      return;
    }
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[routeIndex].key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      navigation.navigate(name);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: lightColors.surface }]}>
      <View style={styles.tabBar}>
        {/* 全部 */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabPress('Main', 0)}
        >
          <Text style={[styles.tabText, { color: state.index === 0 ? lightColors.primary : lightColors.textDisabled }]}>
            全部
          </Text>
        </TouchableOpacity>

        {/* 分组 */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            const mainNavigation = navigation.getParent()?.getState();
            if (mainNavigation) {
              const mainRoute = mainNavigation.routes.find(r => r.name === 'Main');
              if (mainRoute?.state) {
                const mainState = mainRoute.state as any;
                const currentIndex = mainState.index || 0;
                if (currentIndex !== 1) {
                  navigation.navigate('Main', { screen: 'MainHome', params: { viewMode: 'groups' } });
                }
              }
            }
          }}
        >
          <Text style={[styles.tabText, { color: lightColors.textDisabled }]}>
            分组
          </Text>
        </TouchableOpacity>

        {/* 加号按钮 */}
        <TouchableOpacity
          style={styles.plusButton}
          onPress={() => {
            navigation.navigate('Main', { screen: 'CreateIndividual' });
          }}
        >
          <View style={[styles.plusIcon, { backgroundColor: lightColors.primary }]}>
            <Text style={styles.plusText}>+</Text>
          </View>
        </TouchableOpacity>

        {/* 社区 */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabPress('Community', 1)}
        >
          <Text style={[styles.tabText, { color: state.index === 1 ? lightColors.primary : lightColors.textDisabled }]}>
            社区
          </Text>
        </TouchableOpacity>

        {/* 我 */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabPress('Profile', 2)}
        >
          <Text style={[styles.tabText, { color: state.index === 2 ? lightColors.primary : lightColors.textDisabled }]}>
            我
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: lightColors.border,
  },
  tabBar: {
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabText: {
    fontSize: 12,
  },
  plusButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  plusIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },
});