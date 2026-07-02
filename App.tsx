import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { fetchEntitlement } from './src/backend/accountService';
import { isBackendConfigured } from './src/backend/config';
import { evaluateAccess } from './src/domain/session';
import { AccessBlockedScreen } from './src/screens/AccessBlockedScreen';
import { FinalSummaryScreen } from './src/screens/FinalSummaryScreen';
import { FixturesScreen } from './src/screens/FixturesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LiveMatchScreen } from './src/screens/LiveMatchScreen';
import { LiveTrainingMiniMatchScreen } from './src/screens/LiveTrainingMiniMatchScreen';
import { MatchDashboardScreen } from './src/screens/MatchDashboardScreen';
import { MatchesScreen } from './src/screens/MatchesScreen';
import { PeriodSummaryScreen } from './src/screens/PeriodSummaryScreen';
import { PlayersScreen } from './src/screens/PlayersScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LiveStatsMatchScreen } from './src/screens/LiveStatsMatchScreen';
import { PracticeSessionsScreen } from './src/screens/PracticeSessionsScreen';
import { StatsMatchSummaryScreen } from './src/screens/StatsMatchSummaryScreen';
import { StatsMatchesScreen } from './src/screens/StatsMatchesScreen';
import { TrainingSessionsScreen } from './src/screens/TrainingSessionsScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { useMatchStore } from './src/store/useMatchStore';
import { useSessionStore } from './src/store/useSessionStore';
import { RootStackParamList } from './src/utils/navigation';
import { fontSize, spacing } from './src/utils/responsive';
import { APP_NAME, colors } from './src/utils/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const hasHydrated = useMatchStore((state) => state.hasHydrated);
  const matches = useMatchStore((state) => state.matches);
  const sessionHydrated = useSessionStore((state) => state.hasHydrated);
  const profile = useSessionStore((state) => state.profile);
  const updateEntitlement = useSessionStore((state) => state.updateEntitlement);
  const accountId = profile?.accountId;

  // Refresca la licencia en background al abrir con cuenta vinculada; si falla
  // (sin conexión), la gracia offline de evaluateAccess decide.
  useEffect(() => {
    if (!sessionHydrated || !accountId || !isBackendConfigured()) {
      return;
    }

    let cancelled = false;

    void fetchEntitlement().then((result) => {
      if (!cancelled && result.success) {
        updateEntitlement(result.entitlement);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionHydrated, accountId, updateEntitlement]);

  const access = evaluateAccess(profile);
  const hasLiveMatch = matches.some((match) => match.status === 'live' || match.status === 'period_break');
  // Nunca se bloquea un partido en vivo ya iniciado (spec 015).
  const isBlocked = Boolean(profile) && access !== 'local' && access !== 'active' && !hasLiveMatch;

  return (
    <SafeAreaProvider>
      {!hasHydrated || !sessionHydrated ? (
        <View style={styles.loadingScreen}>
          <StatusBar style="light" />
          <Text style={styles.loadingBrand}>{APP_NAME}</Text>
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      ) : isBlocked ? (
        <>
          <StatusBar style="light" />
          <AccessBlockedScreen access={access} />
        </>
      ) : (
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.navy },
              headerTintColor: colors.white,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            {!profile ? (
              <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            ) : (
              <>
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={({ navigation }) => ({
                    title: 'Inicio',
                    headerRight: () => (
                      <Pressable
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => navigation.navigate('Profile')}
                      >
                        <Text style={styles.headerProfileLabel}>Perfil</Text>
                      </Pressable>
                    ),
                  })}
                />
                <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
                <Stack.Screen name="Players" component={PlayersScreen} options={{ title: 'Jugadores' }} />
                <Stack.Screen name="Matches" component={MatchesScreen} options={{ title: 'Partidos' }} />
                <Stack.Screen name="LiveMatch" component={LiveMatchScreen} options={{ title: 'Partido en vivo' }} />
                <Stack.Screen name="MatchDashboard" component={MatchDashboardScreen} options={{ title: 'Estadisticas' }} />
                <Stack.Screen name="PeriodSummary" component={PeriodSummaryScreen} options={{ title: 'Resumen del tiempo' }} />
                <Stack.Screen name="FinalSummary" component={FinalSummaryScreen} options={{ title: 'Resumen final' }} />
                <Stack.Screen name="Fixtures" component={FixturesScreen} options={{ title: 'Fixture' }} />
                <Stack.Screen name="StatsMatches" component={StatsMatchesScreen} options={{ title: 'Estadística 7v7' }} />
                <Stack.Screen name="LiveStatsMatch" component={LiveStatsMatchScreen} options={{ title: 'Registro en vivo' }} />
                <Stack.Screen name="StatsMatchSummary" component={StatsMatchSummaryScreen} options={{ title: 'Resumen del partido' }} />
                <Stack.Screen name="PracticeSessions" component={PracticeSessionsScreen} options={{ title: 'Entrenamiento' }} />
                <Stack.Screen name="TrainingSessions" component={TrainingSessionsScreen} options={{ title: 'Práctica 3v3' }} />
                <Stack.Screen name="LiveTrainingMiniMatch" component={LiveTrainingMiniMatchScreen} options={{ title: 'Mini partido' }} />
              </>
            )}
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
    backgroundColor: colors.navy,
    padding: spacing.md,
    gap: spacing.xs,
  },
  loadingBrand: {
    color: colors.sky,
    fontSize: fontSize.title,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: fontSize.section,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerProfileLabel: {
    color: colors.sky,
    fontSize: fontSize.body,
    fontWeight: '900',
  },
});
