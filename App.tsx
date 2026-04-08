import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, useNavigation } from '@react-navigation/native';

import { initDatabase, isDatabaseInitialized } from './src/database';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useTheme } from './src/hooks/useTheme';
import { lightColors } from './src/theme/colors';
import MainScreen from './src/screens/MainScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import IndividualDetailScreen from './src/screens/IndividualDetailScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import EditGroupScreen from './src/screens/EditGroupScreen';
import CreateIndividualScreen from './src/screens/CreateIndividualScreen';
import EditIndividualScreen from './src/screens/EditIndividualScreen';
import CreateRecordScreen from './src/screens/CreateRecordScreen';
import EditRecordScreen from './src/screens/EditRecordScreen';
import type { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

type ViewMode = 'all' | 'groups';
type TabName = 'main' | 'community' | 'profile';

function MainStack({ viewMode }: { viewMode: ViewMode }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: lightColors.background },
      }}
    >
      <Stack.Screen name="MainHome">
        {() => <MainScreen viewMode={viewMode} />}
      </Stack.Screen>
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="IndividualDetail" component={IndividualDetailScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="EditGroup" component={EditGroupScreen} />
      <Stack.Screen name="CreateIndividual" component={CreateIndividualScreen} />
      <Stack.Screen name="EditIndividual" component={EditIndividualScreen} />
      <Stack.Screen name="CreateRecord" component={CreateRecordScreen} />
      <Stack.Screen name="EditRecord" component={EditRecordScreen} />
    </Stack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={[styles.loading, { backgroundColor: lightColors.background }]}>
      <ActivityIndicator size="large" color={lightColors.primary} />
    </View>
  );
}

function TabContent() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [currentTab, setCurrentTab] = useState<TabName>('main');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [hideBottomNav, setHideBottomNav] = useState(false);

  // 监听导航状态变化，隐藏/显示底部导航
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      const currentRouteName = e.data.state?.routes?.[e.data.state.index]?.name;
      // 在这些页面隐藏底部导航
      const hideNavRoutes = ['IndividualDetail', 'GroupDetail', 'CreateGroup', 'EditGroup', 'CreateIndividual', 'EditIndividual', 'CreateRecord', 'EditRecord'];
      setHideBottomNav(hideNavRoutes.includes(currentRouteName));
    });
    return unsubscribe;
  }, [navigation]);

  const handleCreate = () => {
    setShowImagePickerModal(true);
  };

  const handleImageSourceSelect = (source: 'camera' | 'library') => {
    setShowImagePickerModal(false);
    navigation.navigate('CreateIndividual', { imageSource: source });
  };

  const handleTabPress = (tab: TabName) => {
    setCurrentTab(tab);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {currentTab === 'main' && <MainStack viewMode={viewMode} />}
        {currentTab === 'community' && <CommunityScreen />}
        {currentTab === 'profile' && <ProfileScreen />}
      </View>

      {/* 底部导航 - 当hideBottomNav为true时隐藏 */}
      {!hideBottomNav && (
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            handleTabPress('main');
            setViewMode('all');
          }}
        >
          <Text style={[styles.navText, { color: currentTab === 'main' && viewMode === 'all' ? colors.primary : colors.textDisabled }]}>
            全部
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            handleTabPress('main');
            setViewMode('groups');
          }}
        >
          <Text style={[styles.navText, { color: currentTab === 'main' && viewMode === 'groups' ? colors.primary : colors.textDisabled }]}>
            分组
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={handleCreate}
        >
          <View style={[styles.plusBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.plusIcon}>+</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('community')}
        >
          <Text style={[styles.navText, { color: currentTab === 'community' ? colors.primary : colors.textDisabled }]}>
            社区
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('profile')}
        >
          <Text style={[styles.navText, { color: currentTab === 'profile' ? colors.primary : colors.textDisabled }]}>
            我
          </Text>
        </TouchableOpacity>
      </View>
      )}

      {/* 图片来源选择弹窗 */}
      <Modal
        visible={showImagePickerModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePickerModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => handleImageSourceSelect('camera')}
            >
              <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>拍照</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => handleImageSourceSelect('library')}
            >
              <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>从相册选择</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnLast]}
              onPress={() => setShowImagePickerModal(false)}
            >
              <Text style={[styles.modalBtnText, { color: colors.textDisabled }]}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        if (!isDatabaseInitialized()) {
          await initDatabase();
        }
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setIsReady(true);
      }
    }
    init();
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar barStyle="dark-content" backgroundColor={lightColors.background} />
        <NavigationContainer>
          <TabContent />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: lightColors.border,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  navText: {
    fontSize: 12,
  },
  plusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
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
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalBtn: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  modalBtnLast: {
    borderBottomWidth: 0,
  },
  modalBtnText: {
    fontSize: 16,
  },
});