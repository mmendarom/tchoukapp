import { describe, expect, it } from 'vitest';

import { classifyAccountError } from './accountErrors';

describe('classifyAccountError', () => {
  // El caso que motivo la spec 021: el proyecto de Supabase pausado.
  describe('unreachable (habilita el fail-open acotado)', () => {
    it('clasifica el fallo de fetch de React Native', () => {
      expect(classifyAccountError(new TypeError('Network request failed'))).toBe('unreachable');
    });

    it('clasifica variantes de fetch caido', () => {
      expect(classifyAccountError(new TypeError('Failed to fetch'))).toBe('unreachable');
      expect(classifyAccountError({ message: 'fetch failed' })).toBe('unreachable');
      expect(classifyAccountError({ message: 'getaddrinfo ENOTFOUND abc.supabase.co' })).toBe('unreachable');
      expect(classifyAccountError({ message: 'request timed out' })).toBe('unreachable');
    });

    it('trata 5xx y 408 como inalcanzable: el usuario no lo puede arreglar', () => {
      expect(classifyAccountError({ status: 500, message: 'Internal Server Error' })).toBe('unreachable');
      expect(classifyAccountError({ status: 503, message: 'Service Unavailable' })).toBe('unreachable');
      expect(classifyAccountError({ status: 540, message: 'project paused' })).toBe('unreachable');
      expect(classifyAccountError({ status: 408, message: 'Request Timeout' })).toBe('unreachable');
    });

    it('trata status 0 como sin respuesta', () => {
      expect(classifyAccountError({ status: 0, message: 'algo' })).toBe('unreachable');
    });

    it('usa el fallback cuando no hay forma de clasificar', () => {
      expect(classifyAccountError(undefined, 'unreachable')).toBe('unreachable');
      expect(classifyAccountError({}, 'unreachable')).toBe('unreachable');
    });
  });

  // Estos NO deben habilitar fail-open: el servidor contesto.
  describe('auth (el servidor respondio y rechazo la credencial)', () => {
    it('clasifica 401 y 403', () => {
      expect(classifyAccountError({ status: 401, message: 'Invalid JWT' })).toBe('auth');
      expect(classifyAccountError({ status: 403, message: 'Forbidden' })).toBe('auth');
    });

    it('clasifica codigos de JWT y refresh token', () => {
      expect(classifyAccountError({ code: 'PGRST301', message: 'JWT expired' })).toBe('auth');
      expect(classifyAccountError({ code: 'refresh_token_already_used' })).toBe('auth');
      expect(classifyAccountError({ code: 'session_not_found' })).toBe('auth');
    });
  });

  describe('invalid-code', () => {
    it('clasifica el OTP vencido o incorrecto', () => {
      expect(classifyAccountError({ status: 400, message: 'Token has expired or is invalid' })).toBe('invalid-code');
      expect(classifyAccountError({ status: 400, message: 'otp_expired' })).toBe('invalid-code');
    });
  });

  describe('server', () => {
    it('clasifica otros 4xx como error del servidor', () => {
      expect(classifyAccountError({ status: 404, message: 'Not Found' })).toBe('server');
      expect(classifyAccountError({ status: 400, message: 'violates row-level security policy' })).toBe('server');
      expect(classifyAccountError({ status: 429, message: 'Too Many Requests' })).toBe('server');
    });

    it('usa server como fallback por defecto', () => {
      expect(classifyAccountError({ message: 'not authorized' })).toBe('server');
    });
  });

  it('no explota con entradas raras', () => {
    expect(classifyAccountError(null)).toBe('server');
    expect(classifyAccountError('Network request failed')).toBe('unreachable');
    expect(classifyAccountError(42)).toBe('server');
  });
});
