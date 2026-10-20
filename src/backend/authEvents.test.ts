import { describe, expect, it } from 'vitest';

import { toAuthStateEvent } from './authEvents';

describe('toAuthStateEvent', () => {
  // El caso que motiva el paso 3 de la spec 021: supabase-js emite SIGNED_OUT
  // tambien cuando rechaza el refresh token, no solo en un logout deliberado.
  it('traduce SIGNED_OUT, que es el evento que la app no detectaba', () => {
    expect(toAuthStateEvent('SIGNED_OUT')).toBe('signed-out');
  });

  it('trata la sesion recuperada al hidratar como sesion valida', () => {
    expect(toAuthStateEvent('SIGNED_IN')).toBe('signed-in');
    expect(toAuthStateEvent('INITIAL_SESSION')).toBe('signed-in');
  });

  it('traduce la renovacion de token', () => {
    expect(toAuthStateEvent('TOKEN_REFRESHED')).toBe('token-refreshed');
  });

  it('ignora los eventos que no cambian el estado de acceso', () => {
    expect(toAuthStateEvent('USER_UPDATED')).toBeUndefined();
    expect(toAuthStateEvent('PASSWORD_RECOVERY')).toBeUndefined();
    expect(toAuthStateEvent('MFA_CHALLENGE_VERIFIED')).toBeUndefined();
  });

  it('ignora eventos desconocidos en vez de explotar', () => {
    expect(toAuthStateEvent('')).toBeUndefined();
    expect(toAuthStateEvent('EVENTO_NUEVO_DE_LA_LIBRERIA')).toBeUndefined();
  });
});
