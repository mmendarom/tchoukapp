export const DEFAULT_OPPONENT_NAME = 'Rival';

export function normalizeOpponentName(opponent?: string | null): string {
  const trimmed = opponent?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_OPPONENT_NAME;
}
