import { Player, PlayerPosition, PlayerUsualZone } from './types';

type DominantHand = Player['dominantHand'];

export type CreatePlayerInput = {
  firstName?: string;
  lastName?: string;
  number?: number;
  position?: PlayerPosition;
  usualPlayingZone?: PlayerUsualZone;
  dominantHand?: DominantHand;
  caps?: number;
  goals?: number;
  blocks?: number;
};

export type UpdatePlayerInput = Partial<Omit<Player, 'id'>>;

const validPositions: PlayerPosition[] = ['Wing', 'Center', 'Shooter', 'Defender', 'Pivot'];
const validUsualZones: PlayerUsualZone[] = ['izquierda', 'central', 'derecha'];
const validDominantHands: DominantHand[] = ['Right', 'Left'];

const normalizeNamePart = (value?: string) => value?.trim() ?? '';

const normalizeNumber = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) && value && value > 0 ? Math.floor(value) : fallback;

const slugify = (value: string) => {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'jugador';
};

export function createUniquePlayerId(input: Pick<Player, 'firstName' | 'lastName'>, players: Player[]) {
  const baseId = slugify(`${input.firstName} ${input.lastName}`.trim());
  const existingIds = new Set(players.map((player) => player.id));

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  let nextId = `${baseId}-${suffix}`;

  while (existingIds.has(nextId)) {
    suffix += 1;
    nextId = `${baseId}-${suffix}`;
  }

  return nextId;
}

export function buildPlayer(input: CreatePlayerInput, players: Player[]): Player | undefined {
  const firstName = normalizeNamePart(input.firstName);
  const lastName = normalizeNamePart(input.lastName);

  if (
    !firstName ||
    !input.position ||
    !validPositions.includes(input.position) ||
    !input.usualPlayingZone ||
    !validUsualZones.includes(input.usualPlayingZone) ||
    !input.dominantHand ||
    !validDominantHands.includes(input.dominantHand)
  ) {
    return undefined;
  }

  const nextNumber = players.reduce((max, player) => Math.max(max, player.number), 0) + 1;

  return {
    id: createUniquePlayerId({ firstName, lastName }, players),
    firstName,
    lastName,
    number: normalizeNumber(input.number, nextNumber),
    position: input.position,
    usualPlayingZone: input.usualPlayingZone,
    dominantHand: input.dominantHand,
    caps: input.caps ?? 0,
    goals: input.goals ?? 0,
    blocks: input.blocks ?? 0,
  };
}

export function applyPlayerUpdates(player: Player, updates: UpdatePlayerInput): Player | undefined {
  const firstName = updates.firstName === undefined ? player.firstName : normalizeNamePart(updates.firstName);
  const lastName = updates.lastName === undefined ? player.lastName : normalizeNamePart(updates.lastName);
  const position = updates.position ?? player.position;
  const usualPlayingZone = updates.usualPlayingZone ?? player.usualPlayingZone;
  const dominantHand = updates.dominantHand ?? player.dominantHand;

  if (
    !firstName ||
    !validPositions.includes(position) ||
    !validUsualZones.includes(usualPlayingZone) ||
    !validDominantHands.includes(dominantHand)
  ) {
    return undefined;
  }

  return {
    ...player,
    ...updates,
    id: player.id,
    firstName,
    lastName,
    number: normalizeNumber(updates.number, player.number),
    position,
    usualPlayingZone,
    dominantHand,
    caps: updates.caps ?? player.caps,
    goals: updates.goals ?? player.goals,
    blocks: updates.blocks ?? player.blocks,
  };
}
