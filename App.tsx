import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FinalSummaryScreen } from './src/screens/FinalSummaryScreen';
import { FixturesScreen } from './src/screens/FixturesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LiveMatchScreen } from './src/screens/LiveMatchScreen';
import { MatchDashboardScreen } from './src/screens/MatchDashboardScreen';
import { MatchesScreen } from './src/screens/MatchesScreen';
import { PeriodSummaryScreen } from './src/screens/PeriodSummaryScreen';
import { PlayersScreen } from './src/screens/PlayersScreen';
import { RootStackParamList } from './src/utils/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
