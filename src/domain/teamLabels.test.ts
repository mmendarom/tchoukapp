import { describe, expect, it } from 'vitest';

import { getMatchupDisplayName, getOwnTeamDisplayName } from './teamLabels';

describe('teamLabels', () => {
  it('uses the team pool snapshot as the own-team display name', () => {
    expect(getOwnTeamDisplayName({ teamPoolName: ' Mayores ' })).toBe('Mayores');
    expect(getMatchupDisplayName({ teamPoolName: '+40', opponent: 'Etsy' })).toBe('+40 vs Etsy');
  });

  it('uses safe fallbacks for legacy matches', () => {
    expect(getOwnTeamDisplayName({ teamPoolName: undefined })).toBe('Equipo');
    expect(getMatchupDisplayName({ teamPoolName: undefined, opponent: '' })).toBe('Equipo vs Rival');
  });
});
