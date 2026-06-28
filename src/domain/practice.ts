export const PRACTICE_STORE_DATA_VERSION = 1;

export type TrainingPracticeStatus = 'draft' | 'live' | 'finished' | 'cancelled';

export type TrainingPracticeFilter = 'active' | 'finished' | 'archived' | 'all';

export type TrainingBlockType =
  | 'attack'
  | 'defense'
  | 'mixed'
  | 'physical'
  | 'tactical'
  | 'scrimmage'
  | 'free';

export type TrainingBlockStatus = 'planned' | 'live' | 'completed' | 'skipped';

export type TrainingPracticeEventType =
  | 'note'
  | 'player_highlight'
  | 'player_follow_up'
  | 'metric';

export type TrainingPracticeMetricUnit =
  | 'reps'
  | 'minutes'
  | 'shots'
  | 'successes'
  | 'errors'
  | 'custom';

export type TrainingPracticeMetric = {
  id: string;
  playerId?: string;
  label: string;
  value: number;
  unit?: TrainingPracticeMetricUnit;
};

export type TrainingPracticeEvent = {
  id: string;
  blockId: string;
  createdAt: string;
  type: TrainingPracticeEventType;
  playerId?: string;
  label?: string;
  value?: number;
  note?: string;
};

export type TrainingBlock = {
  id: string;
  sessionId: string;
  title: string;
  type: TrainingBlockType;
  durationMinutes?: number;
  objective?: string;
  participantPlayerIds?: string[];
  events: TrainingPracticeEvent[];
  metrics: TrainingPracticeMetric[];
  notes?: string;
  order: number;
  status: TrainingBlockStatus;
  startedAt?: string;
  endedAt?: string;
  linkedTrainingSessionId?: string;
};

export type TrainingPracticeSession = {
  id: string;
  date: string;
  teamPoolId?: string;
  teamPoolName?: string;
  participantPlayerIds: string[];
  objective: string;
  blocks: TrainingBlock[];
  notes?: string;
  status: TrainingPracticeStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  archivedAt?: string;
};

export type TrainingPracticeSummary = {
  attendanceCount: number;
  totalBlocks: number;
  plannedBlocks: number;
  liveBlocks: number;
  completedBlocks: number;
  skippedBlocks: number;
  plannedMinutes: number;
  completedMinutes: number;
  highlightCount: number;
  followUpCount: number;
};

export type TrainingPracticeValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason: 'team_pool_required' | 'participants_required' | 'objective_required' | 'blocks_required' | 'block_title_required';
      message: string;
    };

export type BuildTrainingBlockInput = {
  id?: string;
  sessionId: string;
  title: string;
  type?: TrainingBlockType;
  durationMinutes?: number;
  objective?: string;
  participantPlayerIds?: string[];
  events?: TrainingPracticeEvent[];
  metrics?: TrainingPracticeMetric[];
  notes?: string;
  order?: number;
  status?: TrainingBlockStatus;
  startedAt?: string;
  endedAt?: string;
  linkedTrainingSessionId?: string;
};

const fallbackDate = '1970-01-01T00:00:00.000Z';

const trainingPracticeStatuses = new Set<TrainingPracticeStatus>(['draft', 'live', 'finished', 'cancelled']);
const trainingBlockTypes = new Set<TrainingBlockType>([
  'attack',
  'defense',
  'mixed',
  'physical',
  'tactical',
  'scrimmage',
  'free',
]);
const trainingBlockStatuses = new Set<TrainingBlockStatus>(['planned', 'live', 'completed', 'skipped']);
const trainingPracticeEventTypes = new Set<TrainingPracticeEventType>([
  'note',
  'player_highlight',
  'player_follow_up',
  'metric',
]);
const trainingPracticeMetricUnits = new Set<TrainingPracticeMetricUnit>([
  'reps',
  'minutes',
  'shots',
  'successes',
  'errors',
  'custom',
]);

export const trainingBlockTypeLabels: Record<TrainingBlockType, string> = {
  attack: 'Ataque',
  defense: 'Defensa',
  mixed: 'Mixto',
  physical: 'Fisico',
  tactical: 'Tactico',
  scrimmage: 'Juego aplicado',
  free: 'Libre',
};

export const trainingPracticeStatusLabels: Record<TrainingPracticeStatus, string> = {
  draft: 'Borrador',
  live: 'En vivo',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeOptionalText = (value: unknown) => {
  const text = normalizeText(value);

  return text || undefined;
};

const normalizeDateString = (value: unknown, fallback = fallbackDate) =>
  normalizeText(value) || fallback;

const normalizeOrder = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;

export const uniquePracticeIds = (ids: unknown[] | undefined) => {
  const seen = new Set<string>();
  const result: string[] = [];

  (ids ?? []).forEach((id) => {
    const normalizedId = normalizeText(id);

    if (!normalizedId || seen.has(normalizedId)) {
      return;
    }

    seen.add(normalizedId);
    result.push(normalizedId);
  });

  return result;
};

export const normalizePracticeDurationMinutes = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return Math.min(Math.max(Math.round(value), 1), 240);
};

export const isTrainingBlockType = (value: unknown): value is TrainingBlockType =>
  typeof value === 'string' && trainingBlockTypes.has(value as TrainingBlockType);

export const isTrainingBlockStatus = (value: unknown): value is TrainingBlockStatus =>
  typeof value === 'string' && trainingBlockStatuses.has(value as TrainingBlockStatus);

export const isTrainingPracticeStatus = (value: unknown): value is TrainingPracticeStatus =>
  typeof value === 'string' && trainingPracticeStatuses.has(value as TrainingPracticeStatus);

export const isTrainingPracticeEventType = (value: unknown): value is TrainingPracticeEventType =>
  typeof value === 'string' && trainingPracticeEventTypes.has(value as TrainingPracticeEventType);

export const isTrainingPracticeMetricUnit = (value: unknown): value is TrainingPracticeMetricUnit =>
  typeof value === 'string' && trainingPracticeMetricUnits.has(value as TrainingPracticeMetricUnit);

const normalizePracticeMetric = (metric: Partial<TrainingPracticeMetric>, index: number): TrainingPracticeMetric => ({
  id: normalizeText(metric.id) || `practice-metric-${index}`,
  playerId: normalizeOptionalText(metric.playerId),
  label: normalizeText(metric.label) || 'Metrica',
  value: typeof metric.value === 'number' && Number.isFinite(metric.value) ? metric.value : 0,
  unit: isTrainingPracticeMetricUnit(metric.unit) ? metric.unit : undefined,
});

const normalizePracticeEvent = (
  event: Partial<TrainingPracticeEvent>,
  blockId: string,
  index: number,
): TrainingPracticeEvent => ({
  id: normalizeText(event.id) || `practice-event-${blockId}-${index}`,
  blockId,
  createdAt: normalizeDateString(event.createdAt),
  type: isTrainingPracticeEventType(event.type) ? event.type : 'note',
  playerId: normalizeOptionalText(event.playerId),
  label: normalizeOptionalText(event.label),
  value: typeof event.value === 'number' && Number.isFinite(event.value) ? event.value : undefined,
  note: normalizeOptionalText(event.note),
});

export function buildTrainingBlock(input: BuildTrainingBlockInput): TrainingBlock | undefined {
  const title = normalizeText(input.title);

  if (!title) {
    return undefined;
  }

  const block: TrainingBlock = {
    id: normalizeText(input.id) || `practice-block-${input.sessionId}-${input.order ?? 0}`,
    sessionId: normalizeText(input.sessionId),
    title,
    type: isTrainingBlockType(input.type) ? input.type : 'free',
    durationMinutes: normalizePracticeDurationMinutes(input.durationMinutes),
    objective: normalizeOptionalText(input.objective),
    participantPlayerIds: uniquePracticeIds(input.participantPlayerIds),
    events: (input.events ?? []).map((event, index) => normalizePracticeEvent(event, input.id ?? '', index)),
    metrics: (input.metrics ?? []).map(normalizePracticeMetric),
    notes: normalizeOptionalText(input.notes),
    order: normalizeOrder(input.order),
    status: isTrainingBlockStatus(input.status) ? input.status : 'planned',
    startedAt: normalizeOptionalText(input.startedAt),
    endedAt: normalizeOptionalText(input.endedAt),
    linkedTrainingSessionId: normalizeOptionalText(input.linkedTrainingSessionId),
  };

  return normalizeTrainingBlock(block, input.sessionId);
}

export function normalizeTrainingBlock(
  block: Partial<TrainingBlock>,
  sessionId: string,
  fallbackOrder = 0,
): TrainingBlock {
  const blockId = normalizeText(block.id) || `practice-block-${sessionId}-${fallbackOrder}`;

  return {
    id: blockId,
    sessionId: normalizeText(block.sessionId) || sessionId,
    title: normalizeText(block.title) || `Bloque ${fallbackOrder + 1}`,
    type: isTrainingBlockType(block.type) ? block.type : 'free',
    durationMinutes: normalizePracticeDurationMinutes(block.durationMinutes),
    objective: normalizeOptionalText(block.objective),
    participantPlayerIds: uniquePracticeIds(block.participantPlayerIds),
    events: (block.events ?? []).map((event, index) => normalizePracticeEvent(event, blockId, index)),
    metrics: (block.metrics ?? []).map(normalizePracticeMetric),
    notes: normalizeOptionalText(block.notes),
    order: normalizeOrder(block.order, fallbackOrder),
    status: isTrainingBlockStatus(block.status) ? block.status : 'planned',
    startedAt: normalizeOptionalText(block.startedAt),
    endedAt: normalizeOptionalText(block.endedAt),
    linkedTrainingSessionId: normalizeOptionalText(block.linkedTrainingSessionId),
  };
}

export function normalizeTrainingPracticeSession(session: Partial<TrainingPracticeSession>): TrainingPracticeSession {
  const id = normalizeText(session.id) || 'practice-session';
  const createdAt = normalizeDateString(session.createdAt, normalizeDateString(session.date));
  const blocks = (session.blocks ?? [])
    .map((block, index) => normalizeTrainingBlock(block, id, index))
    .sort((a, b) => a.order - b.order)
    .map((block, index) => ({ ...block, order: index }));

  return {
    id,
    date: normalizeDateString(session.date, createdAt),
    teamPoolId: normalizeOptionalText(session.teamPoolId),
    teamPoolName: normalizeOptionalText(session.teamPoolName),
    participantPlayerIds: uniquePracticeIds(session.participantPlayerIds),
    objective: normalizeText(session.objective),
    blocks,
    notes: normalizeOptionalText(session.notes),
    status: isTrainingPracticeStatus(session.status) ? session.status : 'draft',
    createdAt,
    updatedAt: normalizeDateString(session.updatedAt, createdAt),
    startedAt: normalizeOptionalText(session.startedAt),
    finishedAt: normalizeOptionalText(session.finishedAt),
    archivedAt: normalizeOptionalText(session.archivedAt),
  };
}

export function validateTrainingPracticeSessionInput(input: {
  teamPoolId?: string;
  teamPoolName?: string;
  participantPlayerIds?: string[];
  objective?: string;
  blocks?: Pick<BuildTrainingBlockInput, 'title'>[];
}): TrainingPracticeValidationResult {
  if (!normalizeText(input.teamPoolId) && !normalizeText(input.teamPoolName)) {
    return { valid: false, reason: 'team_pool_required', message: 'Selecciona un plantel.' };
  }

  if (uniquePracticeIds(input.participantPlayerIds).length === 0) {
    return { valid: false, reason: 'participants_required', message: 'Marca al menos un asistente.' };
  }

  if (!normalizeText(input.objective)) {
    return { valid: false, reason: 'objective_required', message: 'Escribe un objetivo para el entrenamiento.' };
  }

  if (!input.blocks?.length) {
    return { valid: false, reason: 'blocks_required', message: 'Agrega al menos un bloque.' };
  }

  if (input.blocks.some((block) => !normalizeText(block.title))) {
    return { valid: false, reason: 'block_title_required', message: 'Cada bloque necesita un titulo.' };
  }

  return { valid: true };
}

export function filterTrainingPracticeSessions(
  sessions: TrainingPracticeSession[],
  filter: TrainingPracticeFilter,
) {
  switch (filter) {
    case 'active':
      return sessions.filter((session) => !session.archivedAt && (session.status === 'draft' || session.status === 'live'));
    case 'finished':
      return sessions.filter((session) => !session.archivedAt && (session.status === 'finished' || session.status === 'cancelled'));
    case 'archived':
      return sessions.filter((session) => Boolean(session.archivedAt));
    case 'all':
      return sessions;
  }
}

export function hasLivePracticeBlock(session: Pick<TrainingPracticeSession, 'blocks'>) {
  return session.blocks.some((block) => block.status === 'live');
}

export function getTrainingPracticeSummary(session: Pick<TrainingPracticeSession, 'participantPlayerIds' | 'blocks'>): TrainingPracticeSummary {
  const blocks = session.blocks ?? [];
  const allEvents = blocks.flatMap((block) => block.events ?? []);

  return {
    attendanceCount: uniquePracticeIds(session.participantPlayerIds).length,
    totalBlocks: blocks.length,
    plannedBlocks: blocks.filter((block) => block.status === 'planned').length,
    liveBlocks: blocks.filter((block) => block.status === 'live').length,
    completedBlocks: blocks.filter((block) => block.status === 'completed').length,
    skippedBlocks: blocks.filter((block) => block.status === 'skipped').length,
    plannedMinutes: blocks.reduce((total, block) => total + (block.durationMinutes ?? 0), 0),
    completedMinutes: blocks
      .filter((block) => block.status === 'completed')
      .reduce((total, block) => total + (block.durationMinutes ?? 0), 0),
    highlightCount: allEvents.filter((event) => event.type === 'player_highlight').length,
    followUpCount: allEvents.filter((event) => event.type === 'player_follow_up').length,
  };
}
