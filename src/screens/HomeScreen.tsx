import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { PlayerManagerModal } from '../components/PlayerManagerModal';
import { Screen } from '../components/Screen';
import { TeamPoolManagerModal } from '../components/TeamPoolManagerModal';
import { useMatchStore } from '../store/useMatchStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const associationLogo = require('../../assets/association-logo.png');

export function HomeScreen({ navigation }: Props) {
  const [poolManagerVisible, setPoolManagerVisible] = useState(false);
  const [playerManagerVisible, setPlayerManagerVisible] = useState(false);
  const players = useMatchStore((state) => state.players);
  const matches = useMatchStore((state) => state.matches);
  const fixtures = useMatchStore((state) => state.fixtures);
  const teamPools = useMatchStore((state) => state.teamPools);
  const resetDemoData = useMatchStore((state) => state.resetDemoData);
  const activeMatch = matches.find((match) => match.status === 'live' || match.status === 'period_break');
  const visibleMatchCount = matches.filter((match) => match.status !== 'cancelled').length;

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logoShell}>
          <Image source={associationLogo} resizeMode="contain" style={styles.logo} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>Selección Uruguaya de Tchoukball</Text>
          <Text style={styles.title}>Tchoukball Uruguay</Text>
          <Text style={styles.copy}>Estadísticas, planteles y análisis en tiempo real</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <HomeStat label="Partidos" value={visibleMatchCount} />
        <HomeStat label="Planteles" value={teamPools.length} />
        <HomeStat label="Próximos" value={fixtures.length} />
      </View>

      <View style={styles.actionsPanel}>
        {activeMatch && (
          <HomeActionCard
            label="Retomar en vivo"
            description="Volver al partido activo"
            onPress={() => navigation.navigate('LiveMatch', { matchId: activeMatch.id })}
            tone="live"
          />
        )}
        <HomeActionCard
          label="Crear partido"
          description="Configurar rival, plantel y titulares"
          onPress={() => navigation.navigate('Matches', { openCreate: true })}
          tone="primary"
        />
        <View style={styles.actionRow}>
          <HomeActionCard
            label="Partidos"
            description="Ver historial y continuar"
            onPress={() => navigation.navigate('Matches')}
            tone="secondary"
          />
          <HomeActionCard
            label="Gestionar planteles"
            description="Mayores, +40 y planteles propios"
            onPress={() => setPoolManagerVisible(true)}
            tone="management"
          />
        </View>
        <View style={styles.actionRow}>
          <HomeActionCard
            label="Gestionar jugadores"
            description="Crear y editar roster local"
            onPress={() => setPlayerManagerVisible(true)}
            tone="management"
          />
          <HomeActionCard
            label="Jugadores"
            description={`${players.length} jugadores cargados`}
            onPress={() => navigation.navigate('Players')}
            tone="quiet"
          />
          <HomeActionCard
            label="Fixture"
            description={`${fixtures.length} próximos`}
            onPress={() => navigation.navigate('Fixtures')}
            tone="quiet"
          />
        </View>
      </View>

      <View style={styles.utilityRow}>
        <ActionButton
          label="Reiniciar datos demo"
          onPress={resetDemoData}
          variant="secondary"
        />
      </View>
      <TeamPoolManagerModal visible={poolManagerVisible} onClose={() => setPoolManagerVisible(false)} />
      <PlayerManagerModal visible={playerManagerVisible} onClose={() => setPlayerManagerVisible(false)} />
    </Screen>
  );
}

type HomeActionCardProps = {
  label: string;
  description: string;
  onPress: () => void;
  tone: 'primary' | 'secondary' | 'management' | 'quiet' | 'live';
};

function HomeActionCard({ label, description, onPress, tone }: HomeActionCardProps) {
  const darkText = tone === 'quiet' || tone === 'management';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        styles[`${tone}Action`],
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.actionLabel, darkText && styles.actionLabelDark]}>{label}</Text>
      <Text style={[styles.actionDescription, darkText && styles.actionDescriptionDark]}>{description}</Text>
    </Pressable>
  );
}

function HomeStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    borderWidth: 1,
    borderColor: '#16456e',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
  },
  logoShell: {
    width: 104,
    height: 104,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#8bd3ff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  heroText: {
    flex: 1,
    gap: spacing.xs,
  },
  kicker: {
    color: '#8bd3ff',
    fontSize: fontSize.small,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
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
  statCard: {
    flexGrow: 1,
    flexBasis: 104,
    minHeight: 76,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  statValue: {
    color: '#0b6bcb',
    fontSize: 28,
    fontWeight: '900',
  },
  statLabel: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  actionsPanel: {
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    flexGrow: 1,
    flexBasis: 156,
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  primaryAction: {
    flexBasis: '100%',
    minHeight: 112,
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
  },
  liveAction: {
    flexBasis: '100%',
    backgroundColor: '#188038',
    borderColor: '#188038',
  },
  secondaryAction: {
    backgroundColor: '#0b1f33',
    borderColor: '#0b1f33',
  },
  managementAction: {
    backgroundColor: '#e8f6ff',
    borderColor: '#8bd3ff',
  },
  quietAction: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe4ef',
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  actionLabelDark: {
    color: '#0b1f33',
  },
  actionDescription: {
    marginTop: 4,
    color: '#d7e5f2',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  actionDescriptionDark: {
    color: '#5d6b7a',
  },
  utilityRow: {
    alignItems: 'flex-start',
  },
  pressed: {
    opacity: 0.86,
  },
});
