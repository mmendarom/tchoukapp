import { StyleSheet, Text, View } from 'react-native';

import { PlayerCard } from '../components/PlayerCard';
import { Screen } from '../components/Screen';
import { useMatchStore } from '../store/useMatchStore';
import { fontSize } from '../utils/responsive';

export function PlayersScreen() {
  const players = useMatchStore((state) => state.players);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Plantel</Text>
        <Text style={styles.subtitle}>Plantel de Uruguay listo para probar sin conexion.</Text>
      </View>
      {players.map((player) => (
        <PlayerCard key={player.id} player={player} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
  title: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  subtitle: {
    color: '#5d6b7a',
    fontSize: fontSize.body,
  },
});
