import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import {
  filterStatsMatches,
  StatsMatch,
  StatsMatchFilter,
  StatsMatchStatus,
} from '../domain/statsMatch';
import {
  buildStatsMatchSettingsFromInputs,
  buildStatsMatchSetupValidation,
  buildStatsSetupTeam,
  getStatsPoolPlayers,
  parseStatsSetupInteger,
} from '../domain/statsMatchSetup';
import { Player, TeamPool } from '../domain/types';
import { useMatchStore } from '../store/useMatchStore';
import { useStatsMatchStore } from '../store/useStatsMatchStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'StatsMatches'>;

const matchFilters: { id: StatsMatchFilter; label: string }[] = [
  { id: 'active', label: 'Activos' },
  { id: 'finished', label: 'Finalizados' },
  { id: 'archived', label: 'Archivados' },
  { id: 'all', label: 'Todos' },
];

const statsStatusLabel: Record<StatsMatchStatus, string> = {
  draft: 'Borrador',
  live: 'En vivo',
  period_break: 'Entre tiempos',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-UY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getPlayerLabel = (player: Player) => `#${player.number} ${player.lastName || player.firstName}`.trim();

export function StatsMatchesScreen({ navigation }: Props) {
  const players = useMatchStore((state) => state.players);
  const teamPools = useMatchStore((state) => state.teamPools);
  const statsMatches = useStatsMatchStore((state) => state.statsMatches);
  const createStatsMatch = useStatsMatchStore((state) => state.createStatsMatch);
  const startStatsMatch = useStatsMatchStore((state) => state.startStatsMatch);
  const cancelStatsMatch = useStatsMatchStore((state) => state.cancelStatsMatch);
  const archiveStatsMatch = useStatsMatchStore((state) => state.archiveStatsMatch);
  const unarchiveStatsMatch = useStatsMatchStore((state) => state.unarchiveStatsMatch);
  const deleteStatsMatch = useStatsMatchStore((state) => state.deleteStatsMatch);

  const [homePoolId, setHomePoolId] = useState<string | undefined>();
  const [awayPoolId, setAwayPoolId] = useState<string | undefined>();
  const [homeCategory, setHomeCategory] = useState('');
  const [awayCategory, setAwayCategory] = useState('');
  const [homeSelectedIds, setHomeSelectedIds] = useState<string[]>([]);
  const [awaySelectedIds, setAwaySelectedIds] = useState<string[]>([]);
  const [playersPerTeamInput, setPlayersPerTeamInput] = useState('7');
  const [periodCountInput, setPeriodCountInput] = useState('3');
  const [periodMinutesInput, setPeriodMinutesInput] = useState('15');
  const [matchFilter, setMatchFilter] = useState<StatsMatchFilter>('active');
  const [selectedMatchId, setSelectedMatchId] = useState<string | undefined>();
  const [createStatus, setCreateStatus] = useState('');

  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const homePool = useMemo(() => teamPools.find((pool) => pool.id === homePoolId), [homePoolId, teamPools]);
  const awayPool = useMemo(() => teamPools.find((pool) => pool.id === awayPoolId), [awayPoolId, teamPools]);
  const homePoolPlayers = useMemo(() => getStatsPoolPlayers(homePool, players), [homePool, players]);
  const awayPoolPlayers = useMemo(() => getStatsPoolPlayers(awayPool, players), [awayPool, players]);
  const settings = useMemo(
    () =>
      buildStatsMatchSettingsFromInputs({
        playersPerTeam: parseStatsSetupInteger(playersPerTeamInput),
        periodCount: parseStatsSetupInteger(periodCountInput),
        periodMinutes: parseStatsSetupInteger(periodMinutesInput),
      }),
    [periodCountInput, periodMinutesInput, playersPerTeamInput],
  );
  const homeTeam = useMemo(
    () => buildStatsSetupTeam(homePool, homeSelectedIds, homeCategory),
    [homeCategory, homePool, homeSelectedIds],
  );
  const awayTeam = useMemo(
    () => buildStatsSetupTeam(awayPool, awaySelectedIds, awayCategory),
    [awayCategory, awayPool, awaySelectedIds],
  );
  const validationMessage = useMemo(
    () => buildStatsMatchSetupValidation({ homePoolId, awayPoolId, homeTeam, awayTeam, settings }),
    [awayPoolId, awayTeam, homePoolId, homeTeam, settings],
  );
  const visibleMatches = useMemo(() => filterStatsMatches(statsMatches, matchFilter), [matchFilter, statsMatches]);
  const selectedMatch = statsMatches.find((match) => match.id === selectedMatchId);

  const resetSetup = () => {
    setHomePoolId(undefined);
    setAwayPoolId(undefined);
    setHomeCategory('');
    setAwayCategory('');
    setHomeSelectedIds([]);
    setAwaySelectedIds([]);
    setPlayersPerTeamInput('7');
    setPeriodCountInput('3');
    setPeriodMinutesInput('15');
  };

  const handleSelectHomePool = (pool: TeamPool) => {
    setHomePoolId(pool.id);
    setHomeSelectedIds(pool.playerIds);
    setCreateStatus('');
  };

  const handleSelectAwayPool = (pool: TeamPool) => {
    setAwayPoolId(pool.id);
    setAwaySelectedIds(pool.playerIds);
    setCreateStatus('');
  };

  const toggleHomePlayer = (playerId: string) => {
    setHomeSelectedIds((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId],
    );
  };

  const toggleAwayPlayer = (playerId: string) => {
    setAwaySelectedIds((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId],
    );
  };

  const handleCreateMatch = () => {
    setCreateStatus('');

    if (validationMessage) {
      setCreateStatus(validationMessage);
      return;
    }

    const matchId = createStatsMatch({
      homeTeam: { id: homeTeam.id, name: homeTeam.name, category: homeTeam.category, playerIds: homeTeam.playerIds },
      awayTeam: { id: awayTeam.id, name: awayTeam.name, category: awayTeam.category, playerIds: awayTeam.playerIds },
      settings,
    });

    if (!matchId) {
      setCreateStatus('No se pudo crear el partido.');
      return;
    }

    setSelectedMatchId(matchId);
    setCreateStatus('Partido creado.');
    resetSetup();
  };

  const handleArchiveMatch = () => {
    if (!selectedMatch) {
      return;
    }

    archiveStatsMatch(selectedMatch.id);
    setSelectedMatchId(undefined);
  };

  const handleUnarchiveMatch = () => {
    if (!selectedMatch) {
      return;
    }

    unarchiveStatsMatch(selectedMatch.id);
    setSelectedMatchId(undefined);
  };

  const handleCancelMatch = () => {
    if (!selectedMatch) {
      return;
    }

    Alert.alert('Cancelar partido', 'El partido quedará marcado como cancelado.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cancelar partido',
        style: 'destructive',
        onPress: () => {
          cancelStatsMatch(selectedMatch.id);
        },
      },
    ]);
  };

  const handleStartMatch = () => {
    if (!selectedMatch) {
      return;
    }

    if (selectedMatch.status === 'draft') {
      const started = startStatsMatch(selectedMatch.id);

      if (!started) {
        setCreateStatus('No se pudo iniciar el partido.');
        return;
      }
    }

    navigation.navigate('LiveStatsMatch', { matchId: selectedMatch.id });
  };

  const handleDeleteMatch = () => {
    if (!selectedMatch) {
      return;
    }

    Alert.alert('Eliminar partido', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteStatsMatch(selectedMatch.id);
          setSelectedMatchId(undefined);
        },
      },
    ]);
  };

  const renderConvocadosGrid = (
    poolPlayers: Player[],
    selectedIds: string[],
    onToggle: (playerId: string) => void,
  ) => (
    <View style={styles.playerGrid}>
      {poolPlayers.map((player) => {
        const selected = selectedIds.includes(player.id);

        return (
          <Pressable
            key={player.id}
            onPress={() => onToggle(player.id)}
            style={({ pressed }) => [styles.playerTile, selected && styles.playerTileSelected, pressed && styles.pressed]}
          >
            <Text style={[styles.playerNumber, selected && styles.playerSelectedText]}>#{player.number}</Text>
            <Text numberOfLines={1} style={[styles.playerName, selected && styles.playerSelectedText]}>
              {player.lastName || player.firstName}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderTeamSummary = (match: StatsMatch, side: 'home' | 'away') => {
    const team = side === 'home' ? match.homeTeam : match.awayTeam;

    return (
      <View style={styles.teamPreviewCard}>
        <Text style={styles.teamTitle}>
          {side === 'home' ? 'Local' : 'Visitante'}: {team.name}
          {team.category ? ` · ${team.category}` : ''}
        </Text>
        <Text style={styles.teamPlayers}>{team.playerIds.length} convocados</Text>
        <Text style={styles.teamPlayers}>
          {team.playerIds
            .map((playerId) => playersById.get(playerId))
            .filter((player): player is Player => Boolean(player))
            .map(getPlayerLabel)
            .join(' · ') || 'Sin convocados'}
        </Text>
      </View>
    );
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Partido</Text>
          <Text style={styles.title}>Estadística 7v7</Text>
          <Text style={styles.copy}>
            Registrá un partido entre dos cuadros y analizá a ambos: quién tira, desde dónde y quién defiende.
          </Text>
        </View>
        <ActionButton label="Inicio" onPress={() => navigation.navigate('Home')} variant="secondary" />
      </View>

      {statsMatches.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Partidos guardados</Text>
          <View style={styles.filterRow}>
            {matchFilters.map((filter) => {
              const selected = matchFilter === filter.id;

              return (
                <Pressable
                  key={filter.id}
                  onPress={() => {
                    setMatchFilter(filter.id);
                    setSelectedMatchId(undefined);
                  }}
                  style={({ pressed }) => [styles.filterButton, selected && styles.filterButtonSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{filter.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.matchList}>
            {visibleMatches.length === 0 ? (
              <Text style={styles.helperText}>No hay partidos en este filtro.</Text>
            ) : (
              visibleMatches.map((match) => (
                <Pressable
                  key={match.id}
                  onPress={() => {
                    setSelectedMatchId(match.id);
                    setCreateStatus('');
                  }}
                  style={({ pressed }) => [
                    styles.matchCard,
                    selectedMatchId === match.id && styles.matchCardSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.matchTitle}>
                    {match.homeTeam.name} vs {match.awayTeam.name}
                  </Text>
                  <Text style={styles.matchMeta}>
                    {formatDate(match.createdAt)} · {match.settings.playersPerTeam}v{match.settings.playersPerTeam} ·{' '}
                    {match.settings.periodCount}×{Math.round(match.settings.periodDurationSeconds / 60)}′
                  </Text>
                  <View style={styles.matchBadgeRow}>
                    <Text style={styles.matchStatus}>{statsStatusLabel[match.status]}</Text>
                    {match.archivedAt ? <Text style={styles.archivedBadge}>Archivado</Text> : null}
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      )}

      {selectedMatch && (
        <View style={[styles.card, styles.detailCard]}>
          <Text style={styles.sectionTitle}>
            {selectedMatch.homeTeam.name} vs {selectedMatch.awayTeam.name}
          </Text>
          <Text style={styles.detailText}>Estado: {statsStatusLabel[selectedMatch.status]}</Text>
          <Text style={styles.detailText}>
            Formato: {selectedMatch.settings.playersPerTeam} jugadores · {selectedMatch.settings.periodCount} tiempos ×{' '}
            {Math.round(selectedMatch.settings.periodDurationSeconds / 60)} min
          </Text>
          <View style={styles.teamPreviewGrid}>
            {renderTeamSummary(selectedMatch, 'home')}
            {renderTeamSummary(selectedMatch, 'away')}
          </View>
          {!selectedMatch.archivedAt && selectedMatch.status === 'draft' ? (
            <ActionButton label="Iniciar partido" onPress={handleStartMatch} />
          ) : null}
          {!selectedMatch.archivedAt && (selectedMatch.status === 'live' || selectedMatch.status === 'period_break') ? (
            <ActionButton label="Abrir registro en vivo" onPress={handleStartMatch} />
          ) : null}
          {selectedMatch.events.length > 0 ? (
            <ActionButton
              label="Ver resumen"
              onPress={() => navigation.navigate('StatsMatchSummary', { matchId: selectedMatch.id })}
              variant="secondary"
            />
          ) : null}
          <View style={styles.managementActions}>
            {selectedMatch.archivedAt ? (
              <ActionButton label="Restaurar" onPress={handleUnarchiveMatch} variant="secondary" />
            ) : (
              <ActionButton label="Archivar" onPress={handleArchiveMatch} variant="secondary" />
            )}
            {selectedMatch.status !== 'finished' && selectedMatch.status !== 'cancelled' && !selectedMatch.archivedAt ? (
              <ActionButton label="Cancelar partido" onPress={handleCancelMatch} variant="secondary" />
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={handleDeleteMatch}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            >
              <Text style={styles.deleteButtonText}>Eliminar</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nuevo partido</Text>
        {teamPools.length < 2 ? (
          <Text style={styles.helperText}>
            Necesitás al menos dos planteles cargados. Creálos desde Gestionar planteles en Inicio.
          </Text>
        ) : null}

        <Text style={styles.subTitle}>Cuadro local</Text>
        <View style={styles.optionRow}>
          {teamPools.map((pool) => {
            const selected = homePoolId === pool.id;

            return (
              <Pressable
                key={`home-${pool.id}`}
                onPress={() => handleSelectHomePool(pool)}
                style={({ pressed }) => [styles.choiceButton, selected && styles.choiceButtonSelected, pressed && styles.pressed]}
              >
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{pool.name}</Text>
                <Text style={[styles.choiceHint, selected && styles.choiceTextSelected]}>{pool.playerIds.length} jugadores</Text>
              </Pressable>
            );
          })}
        </View>
        {homePool ? (
          <>
            <Text style={styles.inputLabel}>Categoría (opcional)</Text>
            <TextInput
              onChangeText={setHomeCategory}
              placeholder="Mayores, Sub-18..."
              placeholderTextColor="#8a98a8"
              style={styles.input}
              value={homeCategory}
            />
            <View style={styles.sectionHeader}>
              <Text style={styles.inputLabel}>Convocados</Text>
              <Text style={styles.countBadge}>
                {homeSelectedIds.length}/{settings.playersPerTeam} mín.
              </Text>
            </View>
            {renderConvocadosGrid(homePoolPlayers, homeSelectedIds, toggleHomePlayer)}
          </>
        ) : null}

        <Text style={styles.subTitle}>Cuadro visitante</Text>
        <View style={styles.optionRow}>
          {teamPools.map((pool) => {
            const selected = awayPoolId === pool.id;

            return (
              <Pressable
                key={`away-${pool.id}`}
                onPress={() => handleSelectAwayPool(pool)}
                style={({ pressed }) => [styles.choiceButton, selected && styles.choiceButtonSelected, pressed && styles.pressed]}
              >
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{pool.name}</Text>
                <Text style={[styles.choiceHint, selected && styles.choiceTextSelected]}>{pool.playerIds.length} jugadores</Text>
              </Pressable>
            );
          })}
        </View>
        {awayPool ? (
          <>
            <Text style={styles.inputLabel}>Categoría (opcional)</Text>
            <TextInput
              onChangeText={setAwayCategory}
              placeholder="Mayores, Sub-18..."
              placeholderTextColor="#8a98a8"
              style={styles.input}
              value={awayCategory}
            />
            <View style={styles.sectionHeader}>
              <Text style={styles.inputLabel}>Convocados</Text>
              <Text style={styles.countBadge}>
                {awaySelectedIds.length}/{settings.playersPerTeam} mín.
              </Text>
            </View>
            {renderConvocadosGrid(awayPoolPlayers, awaySelectedIds, toggleAwayPlayer)}
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Formato</Text>
        <Text style={styles.helperText}>Por defecto 7 jugadores y 3 tiempos de 15 minutos.</Text>
        <View style={styles.formatGrid}>
          <View style={styles.formatItem}>
            <Text style={styles.inputLabel}>Jugadores por equipo</Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={setPlayersPerTeamInput}
              placeholder="7"
              placeholderTextColor="#8a98a8"
              style={styles.input}
              value={playersPerTeamInput}
            />
          </View>
          <View style={styles.formatItem}>
            <Text style={styles.inputLabel}>Cantidad de tiempos</Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={setPeriodCountInput}
              placeholder="3"
              placeholderTextColor="#8a98a8"
              style={styles.input}
              value={periodCountInput}
            />
          </View>
          <View style={styles.formatItem}>
            <Text style={styles.inputLabel}>Minutos por tiempo</Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={setPeriodMinutesInput}
              placeholder="15"
              placeholderTextColor="#8a98a8"
              style={styles.input}
              value={periodMinutesInput}
            />
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        {validationMessage || createStatus ? (
          <Text style={[styles.statusText, (validationMessage || createStatus.startsWith('No ')) && styles.errorText]}>
            {validationMessage || createStatus}
          </Text>
        ) : null}
        <ActionButton label="Crear partido" onPress={handleCreateMatch} disabled={Boolean(validationMessage)} />
        <ActionButton label="Volver a Inicio" onPress={() => navigation.navigate('Home')} variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    gap: spacing.sm,
  },
  headerText: {
    gap: spacing.xs,
  },
  kicker: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  copy: {
    color: '#36546f',
    fontSize: fontSize.body,
    fontWeight: '700',
    lineHeight: 20,
  },
  card: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.sm,
  },
  detailCard: {
    borderColor: '#8bd3ff',
    backgroundColor: '#f0faff',
  },
  sectionTitle: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  subTitle: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  helperText: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  detailText: {
    color: '#36546f',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choiceButton: {
    flexGrow: 1,
    flexBasis: 112,
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  choiceButtonSelected: {
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
  },
  choiceText: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  choiceHint: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '800',
    marginTop: 2,
  },
  choiceTextSelected: {
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  countBadge: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  playerTile: {
    flexGrow: 1,
    flexBasis: 104,
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  playerTileSelected: {
    backgroundColor: '#188038',
    borderColor: '#188038',
  },
  playerNumber: {
    color: '#0b6bcb',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  playerName: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  playerSelectedText: {
    color: '#ffffff',
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  formatItem: {
    flexGrow: 1,
    flexBasis: 140,
    gap: spacing.xs,
  },
  teamPreviewGrid: {
    gap: spacing.sm,
  },
  teamPreviewCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: 3,
  },
  teamTitle: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  teamPlayers: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  inputLabel: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '800',
    paddingHorizontal: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  errorText: {
    color: '#b42318',
  },
  statusText: {
    color: '#188038',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  matchList: {
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterButton: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  filterButtonSelected: {
    borderColor: '#0b6bcb',
    backgroundColor: '#0b6bcb',
  },
  filterText: {
    color: '#36546f',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  filterTextSelected: {
    color: '#ffffff',
  },
  matchCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: 3,
  },
  matchCardSelected: {
    borderColor: '#0b6bcb',
    backgroundColor: '#f0f7ff',
  },
  matchTitle: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  matchMeta: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  matchStatus: {
    color: '#0b6bcb',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  matchBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  archivedBadge: {
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    color: '#374151',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  managementActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
    backgroundColor: '#fff7f7',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  deleteButtonText: {
    color: '#b42318',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
