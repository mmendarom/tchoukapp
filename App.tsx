import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FinalSummaryScreen } from './src/screens/FinalSummaryScreen';
import { FixturesScreen } from './src/screens/FixturesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LiveMatchScreen } from './src/screens/LiveMatchScreen';
import { LiveTrainingMiniMatchScreen } from './src/screens/LiveTrainingMiniMatchScreen';
import { MatchDashboardScreen } from './src/screens/MatchDashboardScreen';
import { MatchesScreen } from './src/screens/MatchesScreen';
import { PeriodSummaryScreen } from './src/screens/PeriodSummaryScreen';
import { PlayersScreen } from './src/screens/PlayersScreen';
import { PracticeSessionsScreen } from './src/screens/PracticeSessionsScreen';
import { TrainingSessionsScreen } from './src/screens/TrainingSessionsScreen';
import { useMatchStore } from './src/store/useMatchStore';
import { RootStackParamList } from './src/utils/navigation';
import { fontSize, spacing } from './src/utils/responsive';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const hasHydrated = useMatchStore((state) => state.hasHydrated);

  return (
    <SafeAreaProvider>
      {!hasHydrated ? (
        <View style={styles.loadingScreen}>
          <StatusBar style="light" />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      ) : (
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerStyle: { backgroundColor: '#0b1f33' },
              headerTintColor: '#ffffff',
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: '#f4f7fb' },
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
            <Stack.Screen name="Players" component={PlayersScreen} options={{ title: 'Jugadores' }} />
            <Stack.Screen name="Matches" component={MatchesScreen} options={{ title: 'Partidos' }} />
            <Stack.Screen name="LiveMatch" component={LiveMatchScreen} options={{ title: 'Partido en vivo' }} />
            <Stack.Screen name="MatchDashboard" component={MatchDashboardScreen} options={{ title: 'Estadisticas' }} />
            <Stack.Screen name="PeriodSummary" component={PeriodSummaryScreen} options={{ title: 'Resumen del tiempo' }} />
            <Stack.Screen name="FinalSummary" component={FinalSummaryScreen} options={{ title: 'Resumen final' }} />
            <Stack.Screen name="Fixtures" component={FixturesScreen} options={{ title: 'Fixture' }} />
            <Stack.Screen name="PracticeSessions" component={PracticeSessionsScreen} options={{ title: 'Entrenamiento' }} />
            <Stack.Screen name="TrainingSessions" component={TrainingSessionsScreen} options={{ title: 'Práctica 3v3' }} />
            <Stack.Screen name="LiveTrainingMiniMatch" component={LiveTrainingMiniMatchScreen} options={{ title: 'Mini partido' }} />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1f33',
    padding: spacing.md,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: fontSize.section,
    fontWeight: '900',
    textAlign: 'center',
  },
});
