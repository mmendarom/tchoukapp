import AsyncStorage from '@react-native-async-storage/async-storage';

export const appStorage = AsyncStorage;

export const STORAGE_KEYS = {
  appState: 'tchoukstats:app-state',
  practiceState: 'tchoukstats:practice-state',
  trainingState: 'tchoukstats:training-state',
  statsMatchState: 'tchoukstats:stats-match-state',
  sessionState: 'tchoukstats:session-state',
};
