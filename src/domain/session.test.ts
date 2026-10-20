import { describe, expect, it } from 'vitest';

import {
  AccountEntitlement,
  UserProfile,
  buildUserProfile,
  evaluateAccess,
  getAccessNotice,
  getGraceDaysLeft,
  getUnreachableDaysLeft,
  hasActiveAccess,
  isAdminProfile,
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

  it('licencia con vencimiento cumplido queda vencida (lapsed) aunque este activa', () => {
    const lapsed = accountProfile({ ...activeEntitlement(now), expiresAt: '2026-06-30T00:00:00.000Z' });
    const pendingLapsed = accountProfile({ plan: 'cortesia', status: 'pending', verifiedAt: now, expiresAt: '2026-06-30T00:00:00.000Z' });

    expect(evaluateAccess(lapsed, now)).toBe('lapsed');
    expect(evaluateAccess(pendingLapsed, now)).toBe('lapsed');
    expect(hasActiveAccess(lapsed, now)).toBe(false);
  });

  it('licencia con vencimiento futuro o sin vencimiento sigue activa', () => {
    const future = accountProfile({ ...activeEntitlement(now), expiresAt: '2027-01-01T00:00:00.000Z' });

    expect(evaluateAccess(future, now)).toBe('active');
    expect(evaluateAccess(accountProfile(activeEntitlement(now)), now)).toBe('active');
  });

  it('la revocacion pesa mas que el vencimiento', () => {
    const revoked = accountProfile({ plan: 'cortesia', status: 'revoked', verifiedAt: now, expiresAt: '2026-06-30T00:00:00.000Z' });

    expect(evaluateAccess(revoked, now)).toBe('revoked');
  });

  describe('isAdminProfile', () => {
    it('reconoce el email admin sin importar mayusculas o espacios', () => {
      expect(isAdminProfile(accountProfile(undefined))).toBe(false);
      expect(isAdminProfile({ ...localProfile, email: '  Mauromendaro@Gmail.com  ' })).toBe(true);
      expect(isAdminProfile({ ...localProfile, email: 'mauromendaro@gmail.com' })).toBe(true);
    });

    it('devuelve false sin perfil o sin email', () => {
      expect(isAdminProfile(undefined)).toBe(false);
      expect(isAdminProfile(localProfile)).toBe(false);
    });
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

  // Fail-open acotado (spec 021, decision 010). `now` es 2026-07-01T12:00Z.
  describe('fail-open acotado cuando el servidor es inalcanzable', () => {
    const graceExpired = '2026-06-01T12:00:00.000Z'; // 30 dias antes: gracia vencida
    const failedYesterday = '2026-06-30T12:00:00.000Z'; // techo con 20 dias por delante
    const failedLongAgo = '2026-06-01T12:00:00.000Z'; // techo de 21 dias ya cumplido

    it('licencia activa con gracia vencida y servidor sin responder concede acceso', () => {
      const profile = accountProfile({ ...activeEntitlement(graceExpired), unreachableSince: failedYesterday });

      expect(evaluateAccess(profile, now)).toBe('unreachable');
      expect(hasActiveAccess(profile, now)).toBe(true);
    });

    it('con el techo de 21 dias cumplido vuelve a bloquear', () => {
      const profile = accountProfile({ ...activeEntitlement(graceExpired), unreachableSince: failedLongAgo });

      expect(evaluateAccess(profile, now)).toBe('expired');
      expect(hasActiveAccess(profile, now)).toBe(false);
    });

    it('sin unreachableSince la gracia vencida bloquea como antes', () => {
      const profile = accountProfile(activeEntitlement(graceExpired));

      expect(evaluateAccess(profile, now)).toBe('expired');
      expect(hasActiveAccess(profile, now)).toBe(false);
    });

    it('dentro de la gracia normal el fallo de red es irrelevante', () => {
      const profile = accountProfile({ ...activeEntitlement(now), unreachableSince: failedYesterday });

      expect(evaluateAccess(profile, now)).toBe('active');
    });

    // El nucleo de la decision 010: el fail-open NO abre puertas nuevas.
    it('pendiente sigue bloqueada aunque el servidor no responda', () => {
      const profile = accountProfile({
        plan: 'cortesia',
        status: 'pending',
        verifiedAt: graceExpired,
        unreachableSince: failedYesterday,
      });

      expect(evaluateAccess(profile, now)).toBe('pending');
      expect(hasActiveAccess(profile, now)).toBe(false);
    });

    it('revocada sigue bloqueada aunque el servidor no responda', () => {
      const profile = accountProfile({
        plan: 'cortesia',
        status: 'revoked',
        verifiedAt: graceExpired,
        unreachableSince: failedYesterday,
      });

      expect(evaluateAccess(profile, now)).toBe('revoked');
      expect(hasActiveAccess(profile, now)).toBe(false);
    });

    it('vencida por expiresAt sigue bloqueada aunque el servidor no responda', () => {
      const profile = accountProfile({
        ...activeEntitlement(graceExpired),
        expiresAt: '2026-06-30T00:00:00.000Z',
        unreachableSince: failedYesterday,
      });

      expect(evaluateAccess(profile, now)).toBe('lapsed');
      expect(hasActiveAccess(profile, now)).toBe(false);
    });

    it('datos corruptos no habilitan fail-open', () => {
      const badVerifiedAt = accountProfile({ ...activeEntitlement('no-es-fecha'), unreachableSince: failedYesterday });
      const badSince = accountProfile({ ...activeEntitlement(graceExpired), unreachableSince: 'no-es-fecha' });

      expect(evaluateAccess(badVerifiedAt, now)).toBe('expired');
      expect(evaluateAccess(badSince, now)).toBe('expired');
    });

    it('getUnreachableDaysLeft cuenta desde el primer fallo y llega a 0', () => {
      expect(getUnreachableDaysLeft(accountProfile(activeEntitlement(now)), now)).toBeUndefined();
      expect(getUnreachableDaysLeft(accountProfile({ ...activeEntitlement(now), unreachableSince: now }), now)).toBe(21);
      expect(
        getUnreachableDaysLeft(accountProfile({ ...activeEntitlement(now), unreachableSince: failedYesterday }), now),
      ).toBe(20);
      expect(
        getUnreachableDaysLeft(accountProfile({ ...activeEntitlement(now), unreachableSince: failedLongAgo }), now),
      ).toBe(0);
    });
  });

  describe('getAccessNotice', () => {
    it('no avisa nada con la gracia holgada, sin perfil o en modo local', () => {
      expect(getAccessNotice(undefined, now)).toEqual({ level: 'none' });
      expect(getAccessNotice(localProfile, now)).toEqual({ level: 'none' });
      expect(getAccessNotice(accountProfile(activeEntitlement(now)), now)).toEqual({ level: 'none' });
    });

    it('avisa warning cuando la gracia baja del umbral', () => {
      const almost = accountProfile(activeEntitlement('2026-06-21T12:00:00.000Z')); // quedan 4

      expect(getAccessNotice(almost, now)).toEqual({ level: 'warning', daysLeft: 4 });
    });

    it('avisa critical con los dias de techo restantes cuando el servidor no responde', () => {
      const profile = accountProfile({
        ...activeEntitlement('2026-06-01T12:00:00.000Z'),
        unreachableSince: '2026-06-30T12:00:00.000Z',
      });

      expect(getAccessNotice(profile, now)).toEqual({ level: 'critical', daysLeft: 20 });
    });

    it('no avisa nada cuando ya esta bloqueado: de eso se encarga la pantalla de bloqueo', () => {
      const blocked = accountProfile(activeEntitlement('2026-06-01T12:00:00.000Z'));
      const pending = accountProfile({ plan: 'cortesia', status: 'pending', verifiedAt: now });

      expect(getAccessNotice(blocked, now)).toEqual({ level: 'none' });
      expect(getAccessNotice(pending, now)).toEqual({ level: 'none' });
    });

    // Sesion vencida (spec 021, P3): con la sesion muerta la licencia no se
    // puede reverificar y la gracia corre hacia el bloqueo sin vuelta.
    describe('relogin', () => {
      it('avisa apenas se sabe, con la gracia todavia holgada', () => {
        const fresh = accountProfile(activeEntitlement(now)); // quedan 14

        expect(getAccessNotice(fresh, now, 'auth')).toEqual({ level: 'relogin', daysLeft: 14 });
        expect(getAccessNotice(fresh, now, 'no-session')).toEqual({ level: 'relogin', daysLeft: 14 });
      });

      // El bug que motivo este nivel: con la sesion vencida y pocos dias de
      // gracia, el aviso decia "conectate a internet", que no arregla nada.
      it('desplaza al warning, que le diria al usuario algo falso', () => {
        const almost = accountProfile(activeEntitlement('2026-06-21T12:00:00.000Z')); // quedan 4

        expect(getAccessNotice(almost, now)).toEqual({ level: 'warning', daysLeft: 4 });
        expect(getAccessNotice(almost, now, 'auth')).toEqual({ level: 'relogin', daysLeft: 4 });
      });

      it('desplaza al critical: si el servidor respondio auth, esta vivo', () => {
        const failOpen = accountProfile({
          ...activeEntitlement('2026-06-01T12:00:00.000Z'),
          unreachableSince: '2026-06-30T12:00:00.000Z',
        });

        expect(getAccessNotice(failOpen, now, 'auth')).toEqual({ level: 'relogin', daysLeft: 20 });
      });

      it('no aparece si ya esta bloqueado ni en modo local', () => {
        const blocked = accountProfile(activeEntitlement('2026-06-01T12:00:00.000Z'));

        expect(getAccessNotice(blocked, now, 'auth')).toEqual({ level: 'none' });
        expect(getAccessNotice(localProfile, now, 'auth')).toEqual({ level: 'none' });
      });

      it('los demas motivos de fallo no lo disparan', () => {
        const fresh = accountProfile(activeEntitlement(now));

        expect(getAccessNotice(fresh, now, 'unreachable')).toEqual({ level: 'none' });
        expect(getAccessNotice(fresh, now, 'server')).toEqual({ level: 'none' });
        expect(getAccessNotice(fresh, now, 'backend-unavailable')).toEqual({ level: 'none' });
      });
    });
  });
});
