import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { initDatabase, isDatabaseInitialized } from './src/database';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { lightColors } from './src/theme/colors';
import MainScreen from './src/screens/MainScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import IndividualDetailScreen from './src/screens/IndividualDetailScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import EditGroupScreen from './src/screens/EditGroupScreen';
import CreateIndividualScreen from './src/screens/CreateIndividualScreen';
import EditIndividualScreen from './src/screens/EditIndividualScreen';
import CreateRecordScreen from './src/screens/CreateRecordScreen';
import EditRecordScreen from './src/screens/EditRecordScreen';

export type RootStackParamList = {
  Main: undefined;
  GroupDetail: { groupId: number };
  IndividualDetail: { individualId: number; groupId: number };
  CreateGroup: undefined;
  EditGroup: { groupId: number };
  CreateIndividual: { groupId: number };
  EditIndividual: { individualId: number };
  CreateRecord: { individualId: number };
  EditRecord: { recordId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={lightColors.primary} />
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
        <StatusBar style="auto" />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="IndividualDetail" component={IndividualDetailScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="EditGroup" component={EditGroupScreen} />
            <Stack.Screen name="CreateIndividual" component={CreateIndividualScreen} />
            <Stack.Screen name="EditIndividual" component={EditIndividualScreen} />
            <Stack.Screen name="CreateRecord" component={CreateRecordScreen} />
            <Stack.Screen name="EditRecord" component={EditRecordScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: lightColors.background,
  },
});