import { describe, expect, it } from 'vitest';

import {
  AccountEntitlement,
  UserProfile,
  buildUserProfile,
  evaluateAccess,
  getGraceDaysLeft,
  hasActiveAccess,
  validateProfileInput,
} from './session';

describe('validateProfileInput', () => {
  it('acepta nombre valido sin email', () => {
    expect(validateProfileInput({ name: 'Mauro' })).toEqual({ valid: true });
  });

  it('acepta nombre con email valido', () => {
    expect(validateProfileInput({ name: 'Mauro', email: 'mauro@example.com' })).toEqual({ valid: true });
  });

  it('rechaza nombre vacio o demasiado corto', () => {
    expect(validateProfileInput({ name: '' }).valid).toBe(false);
    expect(validateProfileInput({ name: '   ' }).valid).toBe(false);
    expect(validateProfileInput({ name: 'M' }).valid).toBe(false);
  });

  it('rechaza nombre demasiado largo', () => {
    expect(validateProfileInput({ name: 'a'.repeat(41) }).valid).toBe(false);
  });

  it('rechaza email con formato invalido', () => {
    expect(validateProfileInput({ name: 'Mauro', email: 'no-es-email' }).valid).toBe(false);
    expect(validateProfileInput({ name: 'Mauro', email: 'a@b' }).valid).toBe(false);
  });

  it('ignora email vacio', () => {
    expect(validateProfileInput({ name: 'Mauro', email: '   ' })).toEqual({ valid: true });
  });
});

describe('buildUserProfile', () => {
  it('crea perfil con plan cortesia por defecto y campos normalizados', () => {
    const profile = buildUserProfile(
      { name: '  Mauro  ', email: ' mauro@example.com ' },
      { id: 'user-1', now: '2026-07-01T00:00:00.000Z' },
    );

    expect(profile).toEqual({
      id: 'user-1',
      name: 'Mauro',
      email: 'mauro@example.com',
      plan: 'cortesia',
      createdAt: '2026-07-01T00:00:00.000Z',
      lastLoginAt: '2026-07-01T00:00:00.000Z',
    });
  });

  it('omite email vacio', () => {
    const profile = buildUserProfile({ name: 'Mauro', email: '  ' }, { id: 'user-1' });

    expect(profile?.email).toBeUndefined();
  });

  it('devuelve undefined con input invalido', () => {
    expect(buildUserProfile({ name: '' })).toBeUndefined();
    expect(buildUserProfile({ name: 'Mauro', email: 'invalido' })).toBeUndefined();
  });

  it('genera id propio cuando no se pasa', () => {
    const profile = buildUserProfile({ name: 'Mauro' });

    expect(profile?.id).toMatch(/^user-/);
  });
});

describe('evaluateAccess y hasActiveAccess', () => {
  const localProfile = buildUserProfile({ name: 'Mauro' }, { id: 'user-1' })!;
  const now = '2026-07-01T12:00:00.000Z';

  const accountProfile = (entitlement?: AccountEntitlement): UserProfile => ({
    ...localProfile,
    email: 'mauro@example.com',
    accountId: 'account-1',
    entitlement,
  });

  const activeEntitlement = (verifiedAt: string): AccountEntitlement => ({
    plan: 'cortesia',
    status: 'active',
    verifiedAt,
  });

  it('devuelve none sin perfil', () => {
    expect(evaluateAccess(undefined, now)).toBe('none');
    expect(hasActiveAccess(undefined, now)).toBe(false);
  });

  it('perfil de modo local (sin cuenta) tiene acceso completo', () => {
    expect(evaluateAccess(localProfile, now)).toBe('local');
    expect(hasActiveAccess(localProfile, now)).toBe(true);
    expect(hasActiveAccess({ ...localProfile, plan: 'suscripcion' }, now)).toBe(true);
  });

  it('cuenta sin licencia o con licencia pendiente queda pendiente', () => {
    expect(evaluateAccess(accountProfile(undefined), now)).toBe('pending');
    expect(evaluateAccess(accountProfile({ plan: 'cortesia', status: 'pending', verifiedAt: now }), now)).toBe('pending');
    expect(hasActiveAccess(accountProfile(undefined), now)).toBe(false);
  });

  it('licencia revocada bloquea', () => {
    const profile = accountProfile({ plan: 'cortesia', status: 'revoked', verifiedAt: now });

    expect(evaluateAccess(profile, now)).toBe('revoked');
    expect(hasActiveAccess(profile, now)).toBe(false);
  });

  it('licencia activa verificada dentro de la gracia habilita acceso', () => {
    const thirteenDaysAgo = '2026-06-18T12:00:00.000Z';
    const profile = accountProfile(activeEntitlement(thirteenDaysAgo));

    expect(evaluateAccess(profile, now)).toBe('active');
    expect(hasActiveAccess(profile, now)).toBe(true);
  });

  it('licencia activa sin verificar hace mas de 14 dias vence', () => {
    const fifteenDaysAgo = '2026-06-16T11:59:59.000Z';
    const profile = accountProfile(activeEntitlement(fifteenDaysAgo));

    expect(evaluateAccess(profile, now)).toBe('expired');
    expect(hasActiveAccess(profile, now)).toBe(false);
  });

  it('fecha de verificacion invalida se trata como vencida', () => {
    const profile = accountProfile(activeEntitlement('no-es-fecha'));

    expect(evaluateAccess(profile, now)).toBe('expired');
  });

  describe('getGraceDaysLeft', () => {
    it('no aplica para perfiles locales ni licencias no activas', () => {
      expect(getGraceDaysLeft(undefined, now)).toBeUndefined();
      expect(getGraceDaysLeft(localProfile, now)).toBeUndefined();
      expect(getGraceDaysLeft(accountProfile(undefined), now)).toBeUndefined();
      expect(getGraceDaysLeft(accountProfile({ plan: 'cortesia', status: 'revoked', verifiedAt: now }), now)).toBeUndefined();
    });

    it('devuelve 14 recien verificada y va bajando', () => {
      expect(getGraceDaysLeft(accountProfile(activeEntitlement(now)), now)).toBe(14);
      expect(getGraceDaysLeft(accountProfile(activeEntitlement('2026-06-21T12:00:00.000Z')), now)).toBe(4);
      expect(getGraceDaysLeft(accountProfile(activeEntitlement('2026-06-18T11:00:00.000Z')), now)).toBe(0);
    });

    it('devuelve 0 con la gracia vencida o fecha invalida', () => {
      expect(getGraceDaysLeft(accountProfile(activeEntitlement('2026-06-01T12:00:00.000Z')), now)).toBe(0);
      expect(getGraceDaysLeft(accountProfile(activeEntitlement('no-es-fecha')), now)).toBe(0);
    });
  });
});
