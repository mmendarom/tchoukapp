import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it } from 'vitest';

import { STORAGE_KEYS } from '../storage/asyncStorage';
import { useSessionStore } from './useSessionStore';

const flushPersist = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('useSessionStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSessionStore.getState().logout();
    useSessionStore.getState().setHasHydrated(false);
  });

  it('inicia sin perfil', () => {
    expect(useSessionStore.getState().profile).toBeUndefined();
  });

  it('login crea perfil cortesia con nombre y email normalizados', () => {
    const result = useSessionStore.getState().login({ name: '  Mauro  ', email: ' mauro@example.com ' });

    expect(result).toEqual({ success: true });
    expect(useSessionStore.getState().profile).toMatchObject({
      name: 'Mauro',
      email: 'mauro@example.com',
      plan: 'cortesia',
    });
  });

  it('login invalido devuelve error en espanol y no crea perfil', () => {
    const result = useSessionStore.getState().login({ name: '' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.length).toBeGreaterThan(0);
    }

    expect(useSessionStore.getState().profile).toBeUndefined();
  });

  it('logout borra solo el perfil', () => {
    useSessionStore.getState().login({ name: 'Mauro' });
    useSessionStore.getState().logout();

    expect(useSessionStore.getState().profile).toBeUndefined();
  });

  it('updateProfileName renombra el perfil activo y actualiza el recordatorio', () => {
    expect(useSessionStore.getState().updateProfileName('Nuevo').success).toBe(false);

    useSessionStore.getState().login({ name: 'Mauro' });

    expect(useSessionStore.getState().updateProfileName('M').success).toBe(false);
    expect(useSessionStore.getState().updateProfileName('  Mauro M.  ')).toEqual({ success: true });
    expect(useSessionStore.getState().profile?.name).toBe('Mauro M.');
    expect(useSessionStore.getState().lastLoginName).toBe('Mauro M.');
  });

  it('recuerda el ultimo nombre y email despues del logout', () => {
    useSessionStore.getState().loginWithAccount({
      name: 'Mauro',
      email: 'mauro@example.com',
      accountId: 'account-1',
    });
    useSessionStore.getState().logout();

    expect(useSessionStore.getState().lastLoginName).toBe('Mauro');
    expect(useSessionStore.getState().lastLoginEmail).toBe('mauro@example.com');
  });

  it('persiste solo el perfil en la clave de sesion', async () => {
    useSessionStore.getState().login({ name: 'Mauro' });
    await flushPersist();

    const raw = await AsyncStorage.getItem(STORAGE_KEYS.sessionState);

    expect(raw).toBeTruthy();

    const persisted = JSON.parse(raw!);

    expect(persisted.state.profile).toMatchObject({ name: 'Mauro', plan: 'cortesia' });
    expect(persisted.state.hasHydrated).toBeUndefined();
  });

  it('loginWithAccount crea perfil vinculado a la cuenta con su licencia', () => {
    const result = useSessionStore.getState().loginWithAccount({
      name: 'Mauro',
      email: 'mauro@example.com',
      accountId: 'account-1',
      entitlement: { plan: 'cortesia', status: 'active', verifiedAt: '2026-07-01T00:00:00.000Z' },
    });

    expect(result).toEqual({ success: true });
    expect(useSessionStore.getState().profile).toMatchObject({
      id: 'account-1',
      accountId: 'account-1',
      name: 'Mauro',
      email: 'mauro@example.com',
      plan: 'cortesia',
      entitlement: { status: 'active' },
    });
  });

  it('loginWithAccount valida nombre y email', () => {
    const result = useSessionStore.getState().loginWithAccount({
      name: '',
      email: 'mauro@example.com',
      accountId: 'account-1',
    });

    expect(result.success).toBe(false);
    expect(useSessionStore.getState().profile).toBeUndefined();
  });

  it('updateEntitlement actualiza licencia y plan solo en perfiles con cuenta', () => {
    useSessionStore.getState().login({ name: 'Mauro' });

    expect(
      useSessionStore.getState().updateEntitlement({
        plan: 'suscripcion',
        status: 'active',
        verifiedAt: '2026-07-02T00:00:00.000Z',
      }),
    ).toBe(false);

    useSessionStore.getState().loginWithAccount({
      name: 'Mauro',
      email: 'mauro@example.com',
      accountId: 'account-1',
    });

    expect(
      useSessionStore.getState().updateEntitlement({
        plan: 'suscripcion',
        status: 'active',
        verifiedAt: '2026-07-02T00:00:00.000Z',
      }),
    ).toBe(true);
    expect(useSessionStore.getState().profile).toMatchObject({
      plan: 'suscripcion',
      lastLoginAt: '2026-07-02T00:00:00.000Z',
      entitlement: { plan: 'suscripcion', status: 'active' },
    });
  });
});
