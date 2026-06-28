import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import {
  TrainingBlockType,
  TrainingPracticeFilter,
  filterTrainingPracticeSessions,
  getTrainingPracticeSummary,
  trainingBlockTypeLabels,
  trainingPracticeStatusLabels,
  validateTrainingPracticeSessionInput,
} from '../domain/practice';
import { Player, TeamPool } from '../domain/types';
import { useMatchStore } from '../store/useMatchStore';
import { usePracticeStore } from '../store/usePracticeStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'PracticeSessions'>;

type DraftBlock = {
  title: string;
  type: TrainingBlockType;
  durationMinutes?: number;
  objective?: string;
  notes?: string;
};

const sessionFilters: { id: TrainingPracticeFilter; label: string }[] = [
  { id: 'active', label: 'Activos' },
  { id: 'finished', label: 'Finalizados' },
  { id: 'archived', label: 'Archivados' },
  { id: 'all', label: 'Todos' },
];

const blockTypeOptions = (Object.keys(trainingBlockTypeLabels) as TrainingBlockType[]).map((id) => ({
  id,
  label: trainingBlockTypeLabels[id],
}));

const blockStatusLabels = {
  planned: 'Planificado',
  live: 'En curso',
  completed: 'Completado',
  skipped: 'Salteado',
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

const parseDurationInput = (value: string) => {
  const parsed = Number(value.replace(',', '.'));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const getSessionClosed = (status: string) => status === 'finished' || status === 'cancelled';

export function PracticeSessionsScreen({ navigation }: Props) {
  const players = useMatchStore((state) => state.players);
  const teamPools = useMatchStore((state) => state.teamPools);
  const practiceSessions = usePracticeStore((state) => state.practiceSessions);
  const createPracticeSession = usePracticeStore((state) => state.createPracticeSession);
  const startPracticeSession = usePracticeStore((state) => state.startPracticeSession);
  const finishPracticeSession = usePracticeStore((state) => state.finishPracticeSession);
  const cancelPracticeSession = usePracticeStore((state) => state.cancelPracticeSession);
  const archivePracticeSession = usePracticeStore((state) => state.archivePracticeSession);
  const unarchivePracticeSession = usePracticeStore((state) => state.unarchivePracticeSession);
  const deletePracticeSession = usePracticeStore((state) => state.deletePracticeSession);
  const startPracticeBlock = usePracticeStore((state) => state.startPracticeBlock);
  const completePracticeBlock = usePracticeStore((state) => state.completePracticeBlock);
  const skipPracticeBlock = usePracticeStore((state) => state.skipPracticeBlock);
  const addPracticeNote = usePracticeStore((state) => state.addPracticeNote);
  const [selectedTeamPoolId, setSelectedTeamPoolId] = useState(teamPools[0]?.id ?? '');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [objective, setObjective] = useState('');
  const [notes, setNotes] = useState('');
  const [blockTitle, setBlockTitle] = useState('');
  const [blockType, setBlockType] = useState<TrainingBlockType>('attack');
  const [blockDurationInput, setBlockDurationInput] = useState('20');
  const [blockObjective, setBlockObjective] = useState('');
  const [blockNotes, setBlockNotes] = useState('');
  const [draftBlocks, setDraftBlocks] = useState<DraftBlock[]>([]);
  const [createStatus, setCreateStatus] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();
  const [sessionFilter, setSessionFilter] = useState<TrainingPracticeFilter>('active');
  const [detailNote, setDetailNote] = useState('');
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const selectedTeamPool = useMemo(
    () => teamPools.find((pool) => pool.id === selectedTeamPoolId) ?? teamPools[0],
    [selectedTeamPoolId, teamPools],
  );
  const poolPlayers = useMemo(
    () =>
      (selectedTeamPool?.playerIds ?? [])
        .map((playerId) => playersById.get(playerId))
        .filter((player): player is Player => Boolean(player)),
    [playersById, selectedTeamPool?.playerIds],
  );
  const visibleSessions = useMemo(
    () => filterTrainingPracticeSessions(practiceSessions, sessionFilter),
    [practiceSessions, sessionFilter],
  );
  const selectedSession = practiceSessions.find((session) => session.id === selectedSessionId);
  const selectedSummary = selectedSession ? getTrainingPracticeSummary(selectedSession) : undefined;
  const createValidation = validateTrainingPracticeSessionInput({
    teamPoolId: selectedTeamPool?.id,
    teamPoolName: selectedTeamPool?.name,
    participantPlayerIds: participantIds,
    objective,
    blocks: draftBlocks,
  });
  const canEditSelected = selectedSession && !selectedSession.archivedAt && !getSessionClosed(selectedSession.status);

  const resetCreateForm = () => {
    setParticipantIds([]);
    setObjective('');
    setNotes('');
    setBlockTitle('');
    setBlockType('attack');
    setBlockDurationInput('20');
    setBlockObjective('');
    setBlockNotes('');
    setDraftBlocks([]);
  };

  const handleSelectPool = (pool: TeamPool) => {
    setSelectedTeamPoolId(pool.id);
    setParticipantIds([]);
  };

  const toggleParticipant = (playerId: string) => {
    setParticipantIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  };

  const handleAddDraftBlock = () => {
    setCreateStatus('');

    const title = blockTitle.trim();

    if (!title) {
      setCreateStatus('El bloque necesita un titulo.');
      return;
    }

    setDraftBlocks((current) => [
      ...current,
      {
        title,
        type: blockType,
        durationMinutes: parseDurationInput(blockDurationInput),
        objective: blockObjective.trim() || undefined,
        notes: blockNotes.trim() || undefined,
      },
    ]);
    setBlockTitle('');
    setBlockDurationInput('20');
    setBlockObjective('');
    setBlockNotes('');
  };

  const handleCreateSession = () => {
    setCreateStatus('');

    if (!createValidation.valid || !selectedTeamPool) {
      setCreateStatus(createValidation.valid ? 'Selecciona un plantel.' : createValidation.message);
      return;
    }

    const sessionId = createPracticeSession({
      teamPoolId: selectedTeamPool.id,
      teamPoolName: selectedTeamPool.name,
      participantPlayerIds: participantIds,
      objective,
      blocks: draftBlocks,
      notes,
    });

    if (!sessionId) {
      setCreateStatus('No se pudo crear el entrenamiento.');
      return;
    }

    setSelectedSessionId(sessionId);
    setCreateStatus('Entrenamiento creado.');
    resetCreateForm();
  };

  const handleCancelSession = () => {
    if (!selectedSession) {
      return;
    }

    Alert.alert(
      'Cancelar entrenamiento',
      'La sesion quedara cerrada como cancelada.',
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Cancelar sesion', style: 'destructive', onPress: () => cancelPracticeSession(selectedSession.id) },
      ],
    );
  };

  const handleArchiveSession = () => {
    if (!selectedSession) {
      return;
    }

    Alert.alert(
      'Archivar entrenamiento',
      'El entrenamiento se ocultara de la lista principal.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Archivar',
          onPress: () => {
            archivePracticeSession(selectedSession.id);
            setSelectedSessionId(undefined);
          },
        },
      ],
    );
  };

  const handleDeleteSession = () => {
    if (!selectedSession) {
      return;
    }

    Alert.alert(
      'Eliminar entrenamiento',
      'Esta accion no se puede deshacer.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deletePracticeSession(selectedSession.id);
            setSelectedSessionId(undefined);
          },
        },
      ],
    );
  };

  const handleAddDetailNote = () => {
    if (!selectedSession) {
      return;
    }

    if (addPracticeNote(selectedSession.id, detailNote)) {
      setDetailNote('');
    }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Entrenamiento</Text>
          <Text style={styles.title}>Modo Entrenamiento</Text>
          <Text style={styles.copy}>Planifica sesiones, marca asistencia, organiza bloques y deja notas tecnicas.</Text>
        </View>
        <ActionButton label="Inicio" onPress={() => navigation.navigate('Home')} variant="secondary" />
      </View>

      {practiceSessions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Entrenamientos guardados</Text>
          <View style={styles.filterRow}>
            {sessionFilters.map((filter) => {
              const selected = sessionFilter === filter.id;

              return (
                <Pressable
                  key={filter.id}
                  onPress={() => {
                    setSessionFilter(filter.id);
                    setSelectedSessionId(undefined);
                  }}
                  style={({ pressed }) => [styles.filterButton, selected && styles.filterButtonSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{filter.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sessionList}>
            {visibleSessions.length === 0 ? (
              <Text style={styles.helperText}>No hay entrenamientos en este filtro.</Text>
            ) : visibleSessions.map((session) => {
              const summary = getTrainingPracticeSummary(session);

              return (
                <Pressable
                  key={session.id}
                  onPress={() => setSelectedSessionId(session.id)}
                  style={({ pressed }) => [styles.sessionCard, selectedSessionId === session.id && styles.sessionCardSelected, pressed && styles.pressed]}
                >
                  <Text style={styles.sessionTitle}>{session.objective || 'Entrenamiento sin objetivo'}</Text>
                  <Text style={styles.sessionMeta}>{session.teamPoolName ?? 'Sin plantel'} - {formatDate(session.date)}</Text>
                  <Text style={styles.sessionStatus}>
                    {trainingPracticeStatusLabels[session.status]} - {summary.attendanceCount} asistentes - {summary.totalBlocks} bloques
                  </Text>
                  {session.archivedAt ? <Text style={styles.archivedBadge}>Archivado</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {selectedSession && selectedSummary && (
        <View style={[styles.card, styles.detailCard]}>
          <View style={styles.sectionHeader}>
            <View style={styles.flexText}>
              <Text style={styles.sectionTitle}>Resumen del entrenamiento</Text>
              <Text style={styles.detailText}>{selectedSession.teamPoolName ?? 'Sin plantel'} - {formatDate(selectedSession.date)}</Text>
            </View>
            <Text style={styles.statusPill}>{trainingPracticeStatusLabels[selectedSession.status]}</Text>
          </View>
          {selectedSession.archivedAt ? (
            <Text style={styles.archivedNotice}>Entrenamiento archivado. Restauralo para volver a trabajar sobre esta sesion.</Text>
          ) : null}
          <Text style={styles.objectiveText}>{selectedSession.objective}</Text>
          <View style={styles.summaryGrid}>
            <SummaryCard label="Asistentes" value={String(selectedSummary.attendanceCount)} />
            <SummaryCard label="Bloques" value={`${selectedSummary.completedBlocks}/${selectedSummary.totalBlocks}`} />
            <SummaryCard label="Minutos" value={`${selectedSummary.completedMinutes}/${selectedSummary.plannedMinutes}`} />
            <SummaryCard label="Seguimientos" value={String(selectedSummary.followUpCount)} />
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionSubtitle}>Asistencia</Text>
            <Text style={styles.detailText}>
              {selectedSession.participantPlayerIds
                .map((playerId) => playersById.get(playerId))
                .filter((player): player is Player => Boolean(player))
                .map(getPlayerLabel)
                .join(' - ') || 'Sin asistentes registrados'}
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionSubtitle}>Bloques</Text>
            {selectedSession.blocks.map((block) => (
              <View key={block.id} style={styles.blockItem}>
                <View style={styles.blockHeader}>
                  <View style={styles.flexText}>
                    <Text style={styles.blockTitle}>{block.title}</Text>
                    <Text style={styles.blockMeta}>
                      {trainingBlockTypeLabels[block.type]} - {block.durationMinutes ? `${block.durationMinutes} min` : 'Sin duracion'} - {blockStatusLabels[block.status]}
                    </Text>
                  </View>
                  <Text style={styles.blockOrder}>{block.order + 1}</Text>
                </View>
                {block.objective ? <Text style={styles.detailText}>{block.objective}</Text> : null}
                {block.notes ? <Text style={styles.helperText}>{block.notes}</Text> : null}
                {canEditSelected ? (
                  <View style={styles.inlineActions}>
                    {block.status === 'planned' ? (
                      <SmallButton label="Iniciar" onPress={() => startPracticeBlock(selectedSession.id, block.id)} />
                    ) : null}
                    {block.status === 'live' || block.status === 'planned' ? (
                      <SmallButton label="Completar" onPress={() => completePracticeBlock(selectedSession.id, block.id)} />
                    ) : null}
                    {block.status === 'planned' || block.status === 'live' ? (
                      <SmallButton label="Saltar" onPress={() => skipPracticeBlock(selectedSession.id, block.id)} />
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionSubtitle}>Notas</Text>
            <Text style={styles.detailText}>{selectedSession.notes || 'Sin notas generales.'}</Text>
            {canEditSelected ? (
              <View style={styles.noteForm}>
                <TextInput
                  multiline
                  onChangeText={setDetailNote}
                  placeholder="Agregar nota rapida"
                  placeholderTextColor="#8a98a8"
                  style={[styles.input, styles.textArea]}
                  value={detailNote}
                />
                <ActionButton label="Agregar nota" onPress={handleAddDetailNote} disabled={!detailNote.trim()} />
              </View>
            ) : null}
          </View>

          <View style={styles.managementActions}>
            {selectedSession.status === 'draft' && !selectedSession.archivedAt ? (
              <ActionButton label="Iniciar entrenamiento" onPress={() => startPracticeSession(selectedSession.id)} />
            ) : null}
            {selectedSession.status === 'live' && !selectedSession.archivedAt ? (
              <ActionButton label="Finalizar entrenamiento" onPress={() => finishPracticeSession(selectedSession.id)} />
            ) : null}
            {!getSessionClosed(selectedSession.status) && !selectedSession.archivedAt ? (
              <ActionButton label="Cancelar sesion" onPress={handleCancelSession} variant="secondary" />
            ) : null}
            {selectedSession.archivedAt ? (
              <ActionButton label="Restaurar" onPress={() => unarchivePracticeSession(selectedSession.id)} variant="secondary" />
            ) : (
              <ActionButton label="Archivar" onPress={handleArchiveSession} variant="secondary" />
            )}
            <ActionButton label="Eliminar" onPress={handleDeleteSession} variant="danger" />
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Crear entrenamiento</Text>
        <Text style={styles.helperText}>Este modo es para planificar la practica completa. Los mini partidos siguen en Practica 3v3.</Text>

        <View style={styles.detailSection}>
          <Text style={styles.inputLabel}>Plantel</Text>
          <View style={styles.optionRow}>
            {teamPools.map((pool) => {
              const selected = selectedTeamPool?.id === pool.id;

              return (
                <Pressable
                  key={pool.id}
                  onPress={() => handleSelectPool(pool)}
                  style={({ pressed }) => [styles.choiceButton, selected && styles.choiceButtonSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{pool.name}</Text>
                  <Text style={[styles.choiceHint, selected && styles.choiceTextSelected]}>{pool.playerIds.length} jugadores</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.detailSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.inputLabel}>Asistencia</Text>
            <Text style={styles.countBadge}>{participantIds.length} presentes</Text>
          </View>
          <View style={styles.playerGrid}>
            {poolPlayers.map((player) => {
              const selected = participantIds.includes(player.id);

              return (
                <Pressable
                  key={player.id}
                  onPress={() => toggleParticipant(player.id)}
                  style={({ pressed }) => [styles.playerTile, selected && styles.playerTileSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.playerNumber, selected && styles.playerSelectedText]}>#{player.number}</Text>
                  <Text numberOfLines={1} style={[styles.playerName, selected && styles.playerSelectedText]}>{player.lastName || player.firstName}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.inputLabel}>Objetivo</Text>
          <TextInput
            multiline
            onChangeText={setObjective}
            placeholder="Ej: mejorar recepcion y transicion ataque-defensa"
            placeholderTextColor="#8a98a8"
            style={[styles.input, styles.textArea]}
            value={objective}
          />
          <Text style={styles.inputLabel}>Notas generales</Text>
          <TextInput
            multiline
            onChangeText={setNotes}
            placeholder="Opcional"
            placeholderTextColor="#8a98a8"
            style={[styles.input, styles.textArea]}
            value={notes}
          />
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.sectionSubtitle}>Bloques</Text>
          {draftBlocks.length === 0 ? (
            <Text style={styles.helperText}>Agrega al menos un bloque de trabajo.</Text>
          ) : draftBlocks.map((block, index) => (
            <View key={`${block.title}-${index}`} style={styles.blockItem}>
              <Text style={styles.blockTitle}>{index + 1}. {block.title}</Text>
              <Text style={styles.blockMeta}>
                {trainingBlockTypeLabels[block.type]} - {block.durationMinutes ? `${block.durationMinutes} min` : 'Sin duracion'}
              </Text>
              {block.objective ? <Text style={styles.detailText}>{block.objective}</Text> : null}
              <SmallButton
                label="Quitar"
                onPress={() => setDraftBlocks((current) => current.filter((_, currentIndex) => currentIndex !== index))}
              />
            </View>
          ))}

          <Text style={styles.inputLabel}>Titulo del bloque</Text>
          <TextInput
            onChangeText={setBlockTitle}
            placeholder="Ej: Ataque por zona"
            placeholderTextColor="#8a98a8"
            style={styles.input}
            value={blockTitle}
          />
          <Text style={styles.inputLabel}>Tipo</Text>
          <View style={styles.optionRow}>
            {blockTypeOptions.map((option) => {
              const selected = blockType === option.id;

              return (
                <Pressable
                  key={option.id}
                  onPress={() => setBlockType(option.id)}
                  style={({ pressed }) => [styles.typeButton, selected && styles.typeButtonSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.inputLabel}>Duracion estimada</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setBlockDurationInput}
            placeholder="20"
            placeholderTextColor="#8a98a8"
            style={styles.input}
            value={blockDurationInput}
          />
          <Text style={styles.inputLabel}>Objetivo del bloque</Text>
          <TextInput
            multiline
            onChangeText={setBlockObjective}
            placeholder="Opcional"
            placeholderTextColor="#8a98a8"
            style={[styles.input, styles.textArea]}
            value={blockObjective}
          />
          <Text style={styles.inputLabel}>Notas del bloque</Text>
          <TextInput
            multiline
            onChangeText={setBlockNotes}
            placeholder="Opcional"
            placeholderTextColor="#8a98a8"
            style={[styles.input, styles.textArea]}
            value={blockNotes}
          />
          <ActionButton label="Agregar bloque" onPress={handleAddDraftBlock} variant="secondary" />
        </View>

        {(createStatus || !createValidation.valid) ? (
          <Text style={[styles.statusText, !createValidation.valid && styles.errorText]}>
            {createStatus || (!createValidation.valid ? createValidation.message : '')}
          </Text>
        ) : null}
        <ActionButton label="Crear entrenamiento" onPress={handleCreateSession} disabled={!createValidation.valid} />
      </View>
    </Screen>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}>
      <Text style={styles.smallButtonText}>{label}</Text>
    </Pressable>
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
    borderColor: '#43b58b',
    backgroundColor: '#f4fff9',
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  sectionTitle: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
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
    lineHeight: 19,
  },
  objectiveText: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
    lineHeight: 21,
  },
  flexText: {
    flex: 1,
    minWidth: 180,
    gap: 2,
  },
  statusPill: {
    borderRadius: 8,
    backgroundColor: '#0b6bcb',
    color: '#ffffff',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 112,
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    padding: spacing.sm,
    gap: 2,
  },
  summaryValue: {
    color: '#0b6bcb',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailSection: {
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
  sessionList: {
    gap: spacing.sm,
  },
  sessionCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: 3,
  },
  sessionCardSelected: {
    borderColor: '#0b6bcb',
    backgroundColor: '#f0f7ff',
  },
  sessionTitle: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  sessionMeta: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  sessionStatus: {
    color: '#0b6bcb',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  archivedBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    color: '#374151',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  archivedNotice: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: fontSize.small,
    fontWeight: '800',
    padding: spacing.sm,
    overflow: 'hidden',
  },
  blockItem: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  blockTitle: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  blockMeta: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  blockOrder: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#188038',
    color: '#ffffff',
    fontSize: fontSize.small,
    fontWeight: '900',
    lineHeight: 30,
    textAlign: 'center',
    overflow: 'hidden',
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  smallButton: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0b6bcb',
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  smallButtonText: {
    color: '#0b6bcb',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  noteForm: {
    gap: spacing.sm,
  },
  managementActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
    paddingVertical: spacing.sm,
  },
  textArea: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  typeButton: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  typeButtonSelected: {
    borderColor: '#188038',
    backgroundColor: '#188038',
  },
  typeText: {
    color: '#36546f',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  typeTextSelected: {
    color: '#ffffff',
  },
  statusText: {
    color: '#188038',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  errorText: {
    color: '#b42318',
  },
  pressed: {
    opacity: 0.82,
  },
});
