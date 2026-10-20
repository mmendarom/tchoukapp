import { AccountFailureKind } from '../domain/session';

// Clasificacion de errores del backend de licencias (spec 021).
//
// Vive en su propio modulo, sin importar `@supabase/supabase-js`, por dos
// razones: se puede testear sin red ni polyfills de React Native, y mantiene
// el cliente de Supabase aislado como pide la constitution.
//
// Lo que decide esta funcion es si el fallo habilita el fail-open acotado:
// solo 'unreachable' lo hace. Los demas significan que el servidor contesto,
// asi que el acceso no se extiende (decision 010, punto 3).

// Forma estructural de los errores que devuelve Supabase (AuthError trae
// `status`; los de PostgREST traen `code`). No se importa el tipo real para
// no acoplar este modulo a la libreria.
type ErrorLike = {
  status?: number;
  code?: string;
  message?: string;
  name?: string;
};

// Mensajes tipicos de un fetch que no llego a destino. En React Native el
// fallo de red llega como TypeError 'Network request failed'.
const NETWORK_MESSAGE_PATTERN =
  /network request failed|failed to fetch|fetch failed|network error|timeout|timed out|econnrefused|enotfound|getaddrinfo|socket hang up|und_err/i;

// Codigos de PostgREST / GoTrue que significan credencial vencida o invalida.
const AUTH_CODE_PATTERN = /^(PGRST301|PGRST302|refresh_token_not_found|refresh_token_already_used|session_not_found|bad_jwt)$/i;

const OTP_MESSAGE_PATTERN = /otp|token has expired|invalid token|token is invalid|expired or invalid/i;

const asErrorLike = (error: unknown): ErrorLike => {
  if (!error || typeof error !== 'object') {
    return { message: typeof error === 'string' ? error : undefined };
  }

  const candidate = error as Record<string, unknown>;

  return {
    status: typeof candidate.status === 'number' ? candidate.status : undefined,
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    message: typeof candidate.message === 'string' ? candidate.message : undefined,
    name: typeof candidate.name === 'string' ? candidate.name : undefined,
  };
};

/**
 * Traduce un error de Supabase (o una excepcion de red) a un motivo que el
 * dominio pueda interpretar.
 *
 * @param fallback motivo a usar cuando no se puede clasificar. Las llamadas
 *   que atrapan una excepcion deben pasar 'unreachable' (si `fetch` tiro, lo
 *   normal es que no se haya llegado al servidor); las que reciben un error
 *   estructurado del servidor dejan el default 'server'.
 */
export const classifyAccountError = (
  error: unknown,
  fallback: AccountFailureKind = 'server',
): AccountFailureKind => {
  const { status, code, message, name } = asErrorLike(error);
  const text = `${name ?? ''} ${message ?? ''}`.trim();

  // El servidor nunca contesto: proyecto pausado, sin red, DNS, timeout.
  if (NETWORK_MESSAGE_PATTERN.test(text)) {
    return 'unreachable';
  }

  // status 0 lo usan algunos runtimes para "no hubo respuesta".
  if (status === 0) {
    return 'unreachable';
  }

  // 5xx y 408: el servidor existe pero no esta sirviendo. Se trata como
  // inalcanzable porque el usuario no lo puede arreglar y no es una respuesta
  // autoritativa sobre su licencia.
  if (typeof status === 'number' && (status >= 500 || status === 408)) {
    return 'unreachable';
  }

  if (code && AUTH_CODE_PATTERN.test(code)) {
    return 'auth';
  }

  // 401/403: el servidor respondio y rechazo la credencial. Hay que reloguear,
  // y el arreglo esta en manos del usuario.
  if (status === 401 || status === 403) {
    return 'auth';
  }

  if (status === 400 && OTP_MESSAGE_PATTERN.test(text)) {
    return 'invalid-code';
  }

  if (typeof status === 'number' && status >= 400) {
    return 'server';
  }

  return fallback;
};
