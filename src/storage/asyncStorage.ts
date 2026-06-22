import AsyncStorage from '@react-native-async-storage/async-storage';

export const appStorage = AsyncStorage;

export const STORAGE_KEYS = {
  appState: 'tchoukstats:app-state',
  trainingState: 'tchoukstats:training-state',
};
