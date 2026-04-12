import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  copyImageToApp: boolean;
  setCopyImageToApp: (value: boolean) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  copyImageToApp: false,

  setCopyImageToApp: async (value: boolean) => {
    set({ copyImageToApp: value });
    await AsyncStorage.setItem('copyImageToApp', JSON.stringify(value));
  },

  loadSettings: async () => {
    try {
      const value = await AsyncStorage.getItem('copyImageToApp');
      if (value !== null) {
        set({ copyImageToApp: JSON.parse(value) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },
}));
