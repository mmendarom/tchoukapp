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
  StatsMatchSetupSide,
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

  const [wizardStep, setWizardStep] = useState(1);
  const [homePoolId, setHomePoolId] = useState<string | undefined>();
  const [awayPoolId, setAwayPoolId] = useState<string | undefined>();
  const [homeCategory, setHomeCategory] = useState('');
  const [awayCategory, setAwayCategory] = useState('');
  const [homeSelectedIds, setHomeSelectedIds] = useState<string[]>([]);
  const [awaySelectedIds, setAwaySelectedIds] = useState<string[]>([]);
  const [homeStarterIds, setHomeStarterIds] = useState<string[]>([]);
  const [awayStarterIds, setAwayStarterIds] = useState<string[]>([]);
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
    () => buildStatsSetupTeam(homePool, homeSelectedIds, homeCategory, homeStarterIds),
    [homeCategory, homePool, homeSelectedIds, homeStarterIds],
  );
  const awayTeam = useMemo(
    () => buildStatsSetupTeam(awayPool, awaySelectedIds, awayCategory, awayStarterIds),
    [awayCategory, awayPool, awaySelectedIds, awayStarterIds],
  );
  const validationMessage = useMemo(
    () => buildStatsMatchSetupValidation({ homePoolId, awayPoolId, homeTeam, awayTeam, settings }),
    [awayPoolId, awayTeam, homePoolId, homeTeam, settings],
  );
  const visibleMatches = useMemo(() => filterStatsMatches(statsMatches, matchFilter), [matchFilter, statsMatches]);
  const selectedMatch = statsMatches.find((match) => match.id === selectedMatchId);

  const startersCap = settings.playersPerTeam;
  const homeStarterTarget = Math.min(startersCap, homeSelectedIds.length);
  const awayStarterTarget = Math.min(startersCap, awaySelectedIds.length);
  const step1Ok = Boolean(homePoolId && awayPoolId && homePoolId !== awayPoolId);
  const homeRosterOk = homeSelectedIds.length >= startersCap && homeStarterIds.length === homeStarterTarget;
  const awayRosterOk = awaySelectedIds.length >= startersCap && awayStarterIds.length === awayStarterTarget;
  const canAdvance =
    wizardStep === 1 ? step1Ok : wizardStep === 3 ? homeRosterOk : wizardStep === 4 ? awayRosterOk : true;

  const resetSetup = () => {
    setWizardStep(1);
    setHomePoolId(undefined);
    setAwayPoolId(undefined);
    setHomeCategory('');
    setAwayCategory('');
    setHomeSelectedIds([]);
    setAwaySelectedIds([]);
    setHomeStarterIds([]);
    setAwayStarterIds([]);
    setPlayersPerTeamInput('7');
    setPeriodCountInput('3');
    setPeriodMinutesInput('15');
  };

  const goNext = () => {
    setCreateStatus('');

    if (canAdvance) {
      setWizardStep((step) => Math.min(5, step + 1));
    }
  };

  const goBack = () => {
    setCreateStatus('');
    setWizardStep((step) => Math.max(1, step - 1));
  };

  const handleSelectHomePool = (pool: TeamPool) => {
    setHomePoolId(pool.id);
    setHomeSelectedIds(pool.playerIds);
    setHomeStarterIds(pool.playerIds.slice(0, startersCap));
    setCreateStatus('');
  };

  const handleSelectAwayPool = (pool: TeamPool) => {
    setAwayPoolId(pool.id);
    setAwaySelectedIds(pool.playerIds);
    setAwayStarterIds(pool.playerIds.slice(0, startersCap));
    setCreateStatus('');
  };

  // Ciclo de rol al tocar un jugador: afuera -> titular (si hay lugar) -> suplente -> afuera.
  const cyclePlayerRole = (
    playerId: string,
    selectedIds: string[],
    setSelectedIds: (ids: string[]) => void,
    starterIds: string[],
    setStarterIds: (ids: string[]) => void,
  ) => {
    setCreateStatus('');

    if (!selectedIds.includes(playerId)) {
      setSelectedIds([...selectedIds, playerId]);

      if (starterIds.length < startersCap) {
        setStarterIds([...starterIds, playerId]);
      }

      return;
    }

    if (starterIds.includes(playerId)) {
      setStarterIds(starterIds.filter((id) => id !== playerId));
      return;
    }

    setSelectedIds(selectedIds.filter((id) => id !== playerId));
  };

  const selectAllForSide = (side: StatsMatchSetupSide) => {
    const poolPlayerIds = (side === 'home' ? homePoolPlayers : awayPoolPlayers).map((player) => player.id);

    if (side === 'home') {
      setHomeSelectedIds(poolPlayerIds);
      setHomeStarterIds(poolPlayerIds.slice(0, startersCap));
    } else {
      setAwaySelectedIds(poolPlayerIds);
      setAwayStarterIds(poolPlayerIds.slice(0, startersCap));
    }

    setCreateStatus('');
  };

  const clearForSide = (side: StatsMatchSetupSide) => {
    if (side === 'home') {
      setHomeSelectedIds([]);
      setHomeStarterIds([]);
    } else {
      setAwaySelectedIds([]);
      setAwayStarterIds([]);
    }

    setCreateStatus('');
  };

  const autoStartersForSide = (side: StatsMatchSetupSide) => {
    if (side === 'home') {
      setHomeStarterIds(homeSelectedIds.slice(0, startersCap));
    } else {
      setAwayStarterIds(awaySelectedIds.slice(0, startersCap));
    }

    setCreateStatus('');
  };

  const handleCreateMatch = () => {
    setCreateStatus('');

    if (validationMessage) {
      setCreateStatus(validationMessage);
      return;
    }

    const matchId = createStatsMatch({
      homeTeam: {
        id: homeTeam.id,
        name: homeTeam.name,
        category: homeTeam.category,
        playerIds: homeTeam.playerIds,
        starterIds: homeTeam.starterIds,
      },
      awayTeam: {
        id: awayTeam.id,
        name: awayTeam.name,
        category: awayTeam.category,
        playerIds: awayTeam.playerIds,
        starterIds: awayTeam.starterIds,
      },
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

  const startersLabel = (ids: string[]) =>
    ids
      .map((id) => playersById.get(id))
      .filter((player): player is Player => Boolean(player))
      .map(getPlayerLabel)
      .join(' · ') || 'Sin titulares';

  const renderRosterStep = (side: StatsMatchSetupSide) => {
    const pool = side === 'home' ? homePool : awayPool;
    const poolPlayers = side === 'home' ? homePoolPlayers : awayPoolPlayers;
    const selectedIds = side === 'home' ? homeSelectedIds : awaySelectedIds;
    const starterIds = side === 'home' ? homeStarterIds : awayStarterIds;
    const category = side === 'home' ? homeCategory : awayCategory;
    const setCategory = side === 'home' ? setHomeCategory : setAwayCategory;
    const target = Math.min(startersCap, selectedIds.length);
    const onCycle = (playerId: string) =>
      side === 'home'
        ? cyclePlayerRole(playerId, homeSelectedIds, setHomeSelectedIds, homeStarterIds, setHomeStarterIds)
        : cyclePlayerRole(playerId, awaySelectedIds, setAwaySelectedIds, awayStarterIds, setAwayStarterIds);

    if (!pool) {
      return <Text style={styles.helperText}>Volvé al paso 1 y elegí el cuadro.</Text>;
    }

    return (
      <>
        <Text style={styles.wizardStepTitle}>{side === 'home' ? 'Local' : 'Visitante'}: {pool.name}</Text>
        <Text style={styles.helperText}>
          Tocá un jugador para marcarlo titular (★ en cancha) o suplente. Tocá de nuevo para cambiar el rol o sacarlo.
        </Text>
        <View style={styles.rosterCounters}>
          <Text style={[styles.countBadge, starterIds.length === target ? styles.countOk : styles.countWarn]}>
            Titulares {starterIds.length}/{startersCap}
          </Text>
          <Text style={styles.countBadge}>Convocados {selectedIds.length}</Text>
        </View>
        <View style={styles.rosterActions}>
          <Pressable onPress={() => selectAllForSide(side)} style={({ pressed }) => [styles.miniButton, pressed && styles.pressed]}>
            <Text style={styles.miniButtonText}>Convocar todos</Text>
          </Pressable>
          <Pressable onPress={() => autoStartersForSide(side)} style={({ pressed }) => [styles.miniButton, pressed && styles.pressed]}>
            <Text style={styles.miniButtonText}>Titulares: primeros {startersCap}</Text>
          </Pressable>
          <Pressable onPress={() => clearForSide(side)} style={({ pressed }) => [styles.miniButton, pressed && styles.pressed]}>
            <Text style={styles.miniButtonText}>Limpiar</Text>
          </Pressable>
        </View>
        <View style={styles.playerGrid}>
          {poolPlayers.map((player) => {
            const isSelected = selectedIds.includes(player.id);
            const isStarter = starterIds.includes(player.id);
            const tileStyle = isStarter ? styles.playerTileSelected : isSelected ? styles.playerTileBench : undefined;
            const textStyle = isSelected ? styles.playerSelectedText : undefined;

            return (
              <Pressable
                key={player.id}
                onPress={() => onCycle(player.id)}
                style={({ pressed }) => [styles.playerTile, tileStyle, pressed && styles.pressed]}
              >
                <Text style={[styles.playerNumber, textStyle]}>#{player.number}</Text>
                <Text numberOfLines={1} style={[styles.playerName, textStyle]}>{player.lastName || player.firstName}</Text>
                <Text style={[styles.playerRole, textStyle]}>{isStarter ? '★ Titular' : isSelected ? 'Suplente' : 'Afuera'}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.inputLabel}>Categoría (opcional)</Text>
        <TextInput
          onChangeText={setCategory}
          placeholder="Mayores, Sub-18..."
          placeholderTextColor="#8a98a8"
          style={styles.input}
          value={category}
        />
      </>
    );
  };

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
        ) : (
          <>
            <View style={styles.wizardProgress}>
              {['Cuadros', 'Formato', 'Local', 'Visitante', 'Confirmar'].map((label, index) => {
                const stepNumber = index + 1;
                const active = wizardStep === stepNumber;
                const done = wizardStep > stepNumber;

                return (
                  <View key={label} style={styles.wizardStepChip}>
                    <View style={[styles.wizardDot, active && styles.wizardDotActive, done && styles.wizardDotDone]}>
                      <Text style={[styles.wizardDotText, (active || done) && styles.wizardDotTextActive]}>{stepNumber}</Text>
                    </View>
                    <Text style={[styles.wizardStepLabel, active && styles.wizardStepLabelActive]}>{label}</Text>
                  </View>
                );
              })}
            </View>

            {wizardStep === 1 ? (
              <>
                <Text style={styles.wizardStepTitle}>Elegí los dos cuadros</Text>
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
                {homePoolId && awayPoolId && homePoolId === awayPoolId ? (
                  <Text style={[styles.statusText, styles.errorText]}>Elegí dos cuadros distintos.</Text>
                ) : null}
              </>
            ) : null}

            {wizardStep === 2 ? (
              <>
                <Text style={styles.wizardStepTitle}>Formato del partido</Text>
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
              </>
            ) : null}

            {wizardStep === 3 ? renderRosterStep('home') : null}
            {wizardStep === 4 ? renderRosterStep('away') : null}

            {wizardStep === 5 ? (
              <>
                <Text style={styles.wizardStepTitle}>Confirmá y creá el partido</Text>
                <View style={styles.teamPreviewGrid}>
                  <View style={styles.teamPreviewCard}>
                    <Text style={styles.teamTitle}>
                      Local: {homePool?.name ?? '—'}{homeCategory ? ` · ${homeCategory}` : ''}
                    </Text>
                    <Text style={styles.teamPlayers}>
                      {homeStarterIds.length} titulares · {Math.max(0, homeSelectedIds.length - homeStarterIds.length)} suplentes
                    </Text>
                    <Text style={styles.teamPlayers}>{startersLabel(homeStarterIds)}</Text>
                  </View>
                  <View style={styles.teamPreviewCard}>
                    <Text style={styles.teamTitle}>
                      Visitante: {awayPool?.name ?? '—'}{awayCategory ? ` · ${awayCategory}` : ''}
                    </Text>
                    <Text style={styles.teamPlayers}>
                      {awayStarterIds.length} titulares · {Math.max(0, awaySelectedIds.length - awayStarterIds.length)} suplentes
                    </Text>
                    <Text style={styles.teamPlayers}>{startersLabel(awayStarterIds)}</Text>
                  </View>
                </View>
                <Text style={styles.helperText}>
                  Formato: {settings.playersPerTeam} jugadores · {settings.periodCount} tiempos ×{' '}
                  {Math.round(settings.periodDurationSeconds / 60)} min
                </Text>
              </>
            ) : null}

            {createStatus ? (
              <Text style={[styles.statusText, createStatus.startsWith('No ') && styles.errorText]}>{createStatus}</Text>
            ) : null}
            {wizardStep === 5 && validationMessage ? (
              <Text style={[styles.statusText, styles.errorText]}>{validationMessage}</Text>
            ) : null}

            <View style={styles.wizardNav}>
              {wizardStep > 1 ? (
                <ActionButton label="Atrás" onPress={goBack} variant="secondary" />
              ) : (
                <ActionButton label="Inicio" onPress={() => navigation.navigate('Home')} variant="secondary" />
              )}
              {wizardStep < 5 ? (
                <ActionButton label="Siguiente" onPress={goNext} disabled={!canAdvance} />
              ) : (
                <ActionButton label="Crear partido" onPress={handleCreateMatch} disabled={Boolean(validationMessage)} />
              )}
            </View>
          </>
        )}
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
  countOk: {
    color: '#188038',
  },
  countWarn: {
    color: '#b42318',
  },
  wizardProgress: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  wizardStepChip: {
    flexGrow: 1,
    alignItems: 'center',
    gap: 2,
  },
  wizardDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardDotActive: {
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
  },
  wizardDotDone: {
    backgroundColor: '#188038',
    borderColor: '#188038',
  },
  wizardDotText: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  wizardDotTextActive: {
    color: '#ffffff',
  },
  wizardStepLabel: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '800',
  },
  wizardStepLabelActive: {
    color: '#0b1f33',
    fontWeight: '900',
  },
  wizardStepTitle: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  wizardNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rosterCounters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rosterActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  miniButton: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  miniButtonText: {
    color: '#0b6bcb',
    fontSize: fontSize.tiny,
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
  playerTileBench: {
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
  },
  playerRole: {
    color: '#0b1f33',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    marginTop: 2,
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
