export type PlayerPosition = 'Wing' | 'Center' | 'Shooter' | 'Defender' | 'Pivot';

export type PlayerUsualZone = 'izquierda' | 'central' | 'derecha';

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  position: PlayerPosition;
  usualPlayingZone: PlayerUsualZone;
  dominantHand: 'Right' | 'Left';
  caps: number;
  goals: number;
  blocks: number;
};

export type MatchStatus = 'draft' | 'live' | 'period_break' | 'finished' | 'cancelled';

export type PeriodStatus = 'not_started' | 'live' | 'finished';

export type TeamSide = 'uruguay' | 'opponent';

export type MatchPeriod = 1 | 2 | 3;

export type MatchClock = {
  period: MatchPeriod;
  secondsElapsed: number;
};

export type CourtZone =
  | 'left-wing'
  | 'left-center'
  | 'center'
  | 'right-center'
  | 'right-wing'
  | 'backcourt';

export type FrameSide = 'left-frame' | 'right-frame';

export type PointFrame = 'left' | 'right';

export type CourtLocation = {
  x: number;
  y: number;
};

export type Score = {
  uruguay: number;
  opponent: number;
};

export type MatchPeriodState = {
  number: MatchPeriod;
  status: PeriodStatus;
  durationSeconds: number;
  remainingSeconds: number;
  timerRunning: boolean;
  timerStatus?: 'running' | 'paused' | 'stopped';
  periodStartedAt?: string;
  pausedAt?: string;
  totalPausedMs?: number;
  startedAt?: string;
  finishedAt?: string;
};

export type BaseMatchEvent = {
  id: string;
  matchId: string;
  periodNumber: MatchPeriod;
  timestamp: string;
  clock: MatchClock;
  lineupSnapshotId?: string;
};

export type PointEvent = BaseMatchEvent & {
  kind: 'point';
  scoringTeam: TeamSide;
  playerId?: string;
  assistPlayerId?: string;
  landingLocation?: CourtLocation;
  shootingSide?: 'left' | 'center' | 'right';
  shootingContext?: string;
  opponentAttackSide?: 'left' | 'center' | 'right';
  defensiveErrorPlayerId?: string;
  zone: CourtZone;
  frame: FrameSide | PointFrame;
  pointSource: 'attack' | 'opponent-error' | 'technical';
};

export type ErrorType =
  | 'missed-frame'
  | 'forbidden-zone'
  | 'bad-rebound'
  | 'dropped-ball'
  | 'third-pass'
  | 'turnover'
  | 'defensive-block'
  | 'other';

export type ErrorEvent = BaseMatchEvent & {
  kind: 'error';
  team: TeamSide;
  playerId?: string;
  errorType: ErrorType;
  zone?: CourtZone;
  frame?: FrameSide;
  pointAwardedTo?: TeamSide;
};

export type SubstitutionEvent = BaseMatchEvent & {
  kind: 'substitution';
  team: TeamSide;
  playerOutId: string;
  playerInId: string;
  lineupSnapshotId: string;
};

export type MatchEvent = PointEvent | ErrorEvent | SubstitutionEvent;

export type LineupSnapshot = {
  id: string;
  matchId: string;
  team: TeamSide;
  playerIds: string[];
  capturedAt: string;
  clock: MatchClock;
};

export type Match = {
  id: string;
  opponent: string;
  venue: string;
  startsAt: string;
  status: MatchStatus;
  currentPeriod: MatchPeriod;
  periods: MatchPeriodState[];
  clock: MatchClock;
  lineupSnapshots: LineupSnapshot[];
  events: MatchEvent[];
  notes?: string;
};

export type Fixture = {
  id: string;
  opponent: string;
  competition: string;
  venue: string;
  startsAt: string;
};
