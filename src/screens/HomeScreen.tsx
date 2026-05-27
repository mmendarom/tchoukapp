import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { useMatchStore } from '../store/useMatchStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const players = useMatchStore((state) => state.players);
  const matches = useMatchStore((state) => state.matches);
  const fixtures = useMatchStore((state) => state.fixtures);
  const resetDemoData = useMatchStore((state) => state.resetDemoData);
  const activeMatch = matches.find((match) => match.status === 'live' || match.status === 'period_break');

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Selección Uruguaya de Tchoukball</Text>
        <Text style={styles.title}>Estadísticas de partido sin conexión</Text>
        <Text style={styles.copy}>
          Registrá puntos, errores, cambios y rendimiento durante el partido. Los datos quedan guardados localmente en el dispositivo.
        </Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Jugadores" value={players.length} />
        <StatCard label="Partidos" value={matches.filter((match) => match.status !== 'cancelled').length} />
        <StatCard label="Fixture" value={fixtures.length} />
      </View>

      <View style={styles.grid}>
        <ActionButton label="Jugadores" onPress={() => navigation.navigate('Players')} />
        <ActionButton label="Partidos" onPress={() => navigation.navigate('Matches')} />
        <ActionButton label="Fixture" onPress={() => navigation.navigate('Fixtures')} />
        <ActionButton
          label={activeMatch ? 'Retomar en vivo' : 'Iniciar partido'}
          onPress={() => navigation.navigate('LiveMatch', { matchId: activeMatch?.id })}
          variant={activeMatch ? 'primary' : 'secondary'}
        />
        <ActionButton label="Reiniciar datos demo" onPress={resetDemoData} variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  kicker: {
    color: '#8bd3ff',
    fontSize: fontSize.small,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  copy: {
    maxWidth: 760,
    color: '#d7e5f2',
    fontSize: fontSize.body,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
