import { LineupSnapshot, Player } from './types';

export const LINEUP_SLOT_COUNT = 7;

export type LineupSlotId =
  | 'slot_1'
  | 'slot_2'
  | 'slot_3'
  | 'slot_4'
  | 'slot_5'
  | 'slot_6'
  | 'slot_7';

export type LineupSlot = {
  id: LineupSlotId;
  index: number;
  playerId?: string;
  player?: Player;
};

export const neutralLineupSlotIds: LineupSlotId[] = [
  'slot_1',
  'slot_2',
  'slot_3',
  'slot_4',
  'slot_5',
  'slot_6',
  'slot_7',
];

export function createLineupSlots(lineup: Pick<LineupSnapshot, 'playerIds'> | undefined, players: Player[]): LineupSlot[] {
  const playersById = new Map(players.map((player) => [player.id, player]));

  return neutralLineupSlotIds.map((id, index) => {
    const playerId = lineup?.playerIds[index] || undefined;

    return {
      id,
      index,
      playerId,
      player: playerId ? playersById.get(playerId) : undefined,
    };
  });
}

export function replaceLineupSlotPlayer(playerIds: string[], slotIndex: number, playerInId: string) {
  if (slotIndex < 0 || slotIndex >= LINEUP_SLOT_COUNT) {
    return playerIds;
  }

  const nextPlayerIds = playerIds.slice(0, LINEUP_SLOT_COUNT);

  while (nextPlayerIds.length < LINEUP_SLOT_COUNT) {
    nextPlayerIds.push('');
  }

  nextPlayerIds[slotIndex] = playerInId;

  return nextPlayerIds;
}

export function swapLineupSlotPlayers(playerIds: string[], fromSlotIndex: number, toSlotIndex: number) {
  if (
    fromSlotIndex < 0 ||
    toSlotIndex < 0 ||
    fromSlotIndex >= LINEUP_SLOT_COUNT ||
    toSlotIndex >= LINEUP_SLOT_COUNT ||
    fromSlotIndex === toSlotIndex
  ) {
    return playerIds;
  }

  const nextPlayerIds = playerIds.slice(0, LINEUP_SLOT_COUNT);

  while (nextPlayerIds.length < LINEUP_SLOT_COUNT) {
    nextPlayerIds.push('');
  }

  const fromPlayerId = nextPlayerIds[fromSlotIndex];
  nextPlayerIds[fromSlotIndex] = nextPlayerIds[toSlotIndex];
  nextPlayerIds[toSlotIndex] = fromPlayerId;

  return nextPlayerIds;
}

export function getBenchPlayers(players: Player[], lineup: Pick<LineupSnapshot, 'playerIds'> | undefined) {
  const onCourtIds = new Set((lineup?.playerIds ?? []).filter(Boolean));
  return players.filter((player) => !onCourtIds.has(player.id));
}

export function getNeutralSlotVisualGroup(slotIndex: number): 'left' | 'center' | 'right' | 'unknown' {
  if (slotIndex >= 0 && slotIndex <= 2) {
    return 'left';
  }

  if (slotIndex === 3) {
    return 'center';
  }

  if (slotIndex >= 4 && slotIndex <= 6) {
    return 'right';
  }

  return 'unknown';
}

export function getPlayerInitials(player: Player) {
  const firstInitial = player.firstName.trim().charAt(0);
  const lastInitial = player.lastName.trim().charAt(0);
  const initials = `${firstInitial}${lastInitial || player.firstName.trim().charAt(1)}`.toUpperCase();

  return initials || '?';
}
