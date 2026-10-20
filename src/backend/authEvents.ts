import { AuthStateEvent } from '../domain/session';

// Traduccion de los eventos de auth de Supabase a terminos de dominio
// (spec 021, paso 3).
//
// Vive en su propio modulo y sin importar `@supabase/supabase-js` por la misma
// razon que `accountErrors.ts`: asi la parte con reglas se puede testear sin
// red ni polyfills de React Native, y la libreria queda aislada en
// `supabaseClient.ts` / `accountService.ts` como pide la constitution.
//
// Los eventos que no interesan devuelven undefined y el suscriptor los ignora:
// es preferible a reenviarlos y obligar a cada consumidor a filtrar.

/**
 * @param supabaseEvent nombre del evento tal como lo emite `onAuthStateChange`.
 * @returns el evento de dominio equivalente, o undefined si no aporta nada.
 */
export const toAuthStateEvent = (supabaseEvent: string): AuthStateEvent | undefined => {
  switch (supabaseEvent) {
    case 'SIGNED_IN':
    // Ocurre al hidratar una sesion guardada; para la app equivale a
    // "hay sesion valida".
    case 'INITIAL_SESSION':
      return 'signed-in';

    // El unico que importa de verdad: supabase-js emite SIGNED_OUT tambien
    // cuando el refresh token es rechazado, no solo en un logout deliberado.
    // Ese es el caso que hoy la app no detecta.
    case 'SIGNED_OUT':
      return 'signed-out';

    case 'TOKEN_REFRESHED':
      return 'token-refreshed';

    // USER_UPDATED, PASSWORD_RECOVERY, MFA_CHALLENGE_VERIFIED y cualquier
    // evento nuevo de la libreria: no cambian el estado de acceso.
    default:
      return undefined;
  }
};
