import {
  AccountEntitlement,
  AccountFailureKind,
  AdminEntitlementRow,
  AuthStateEvent,
  EntitlementStatus,
  UserPlan,
} from '../domain/session';
import { classifyAccountError } from './accountErrors';
import { toAuthStateEvent } from './authEvents';
import { getSupabaseClient } from './supabaseClient';

const BACKEND_UNAVAILABLE_ERROR = 'El servidor no está configurado en esta versión de la app.';
// No culpa a la conexión del usuario: con el proyecto pausado el usuario tiene
// internet y el mensaje viejo ("Revisá tu conexión") lo mandaba a buscar el
// problema donde no estaba (spec 021).
const UNREACHABLE_ERROR =
  'No se pudo contactar el servidor de licencias. Revisá tu conexión; si tenés internet, el servidor puede estar caído.';
const SEND_CODE_ERROR = 'No se pudo enviar el código.';
const INVALID_CODE_ERROR = 'El código no es válido o expiró. Pedí uno nuevo.';
const NO_SESSION_ERROR = 'No hay una sesión activa en el servidor.';
const SESSION_EXPIRED_ERROR = 'Tu sesión en el servidor venció. Volvé a iniciar sesión con tu email.';
const ADMIN_ERROR = 'No se pudo completar la acción de administración.';

// El detalle técnico de Supabase (en inglés) se anexa para poder diagnosticar
// fallas de configuración (key inválida, signups deshabilitados, rate limit).
const withDetail = (message: string, detail?: string) =>
  detail ? `${message} Detalle: ${detail}` : message;

export type AccountResult<T> =
  | ({ success: true } & T)
  | { success: false; error: string; kind: AccountFailureKind };

// Arma el caso de error con el motivo ya clasificado. El mensaje visible se
// elige por motivo para que nunca diga algo falso sobre la causa.
const failure = (
  error: unknown,
  fallbackMessage: string,
  fallbackKind: AccountFailureKind = 'server',
): { success: false; error: string; kind: AccountFailureKind } => {
  const kind = classifyAccountError(error, fallbackKind);
  const detail = typeof (error as { message?: string } | undefined)?.message === 'string'
    ? (error as { message: string }).message
    : undefined;

  if (kind === 'unreachable') {
    return { success: false, error: withDetail(UNREACHABLE_ERROR, detail), kind };
  }

  if (kind === 'auth') {
    return { success: false, error: withDetail(SESSION_EXPIRED_ERROR, detail), kind };
  }

  return { success: false, error: withDetail(fallbackMessage, detail), kind };
};

const backendUnavailable = () =>
  ({ success: false, error: BACKEND_UNAVAILABLE_ERROR, kind: 'backend-unavailable' }) as const;

const isPlan = (value: unknown): value is UserPlan => value === 'cortesia' || value === 'suscripcion';

const isStatus = (value: unknown): value is EntitlementStatus =>
  value === 'pending' || value === 'active' || value === 'revoked';

export const requestEmailOtp = async (email: string): Promise<AccountResult<object>> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return backendUnavailable();
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    if (error) {
      return failure(error, SEND_CODE_ERROR);
    }

    return { success: true };
  } catch (thrown) {
    // Si fetch tiró, lo normal es que no se haya llegado al servidor.
    return failure(thrown, SEND_CODE_ERROR, 'unreachable');
  }
};

export const verifyEmailOtp = async (
  email: string,
  code: string,
): Promise<AccountResult<{ accountId: string }>> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return backendUnavailable();
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });

    if (error || !data.user) {
      // Un 400 con mensaje de OTP se clasifica 'invalid-code'; un servidor
      // caído durante la verificación no debe reportarse como código inválido.
      return failure(error, INVALID_CODE_ERROR, 'invalid-code');
    }

    return { success: true, accountId: data.user.id };
  } catch (thrown) {
    return failure(thrown, INVALID_CODE_ERROR, 'unreachable');
  }
};

export const fetchEntitlement = async (): Promise<AccountResult<{ entitlement: AccountEntitlement }>> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return backendUnavailable();
  }

  try {
    // getSession() lee la sesión guardada en el dispositivo (sin red). Antes
    // se usaba getUser(), que SÍ hace red: con el proyecto pausado devolvía
    // "no hay sesión activa", un diagnóstico equivocado que mandaba al usuario
    // a reloguear cuando el problema era del servidor (spec 021).
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      return failure(sessionError, NO_SESSION_ERROR, 'unreachable');
    }

    const session = sessionData.session;

    if (!session) {
      return { success: false, error: NO_SESSION_ERROR, kind: 'no-session' };
    }

    const { data, error } = await supabase
      .from('entitlements')
      .select('plan, status, expires_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      return failure(error, UNREACHABLE_ERROR, 'unreachable');
    }

    // Fila ausente (registro anterior al trigger): tratar como pendiente.
    const plan = isPlan(data?.plan) ? data.plan : 'cortesia';
    const status = isStatus(data?.status) ? data.status : 'pending';
    const expiresAt = typeof data?.expires_at === 'string' ? data.expires_at : undefined;

    return {
      success: true,
      entitlement: { plan, status, verifiedAt: new Date().toISOString(), expiresAt },
    };
  } catch (thrown) {
    return failure(thrown, UNREACHABLE_ERROR, 'unreachable');
  }
};

// Administracion de licencias (spec 016): RPCs security definer que solo
// aceptan al email admin; ver supabase/migrations/0003_admin_entitlements.sql.
export const adminListEntitlements = async (): Promise<AccountResult<{ entitlements: AdminEntitlementRow[] }>> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return backendUnavailable();
  }

  try {
    const { data, error } = await supabase.rpc('admin_list_entitlements');

    if (error) {
      return failure(error, ADMIN_ERROR);
    }

    const entitlements: AdminEntitlementRow[] = (data ?? []).map((row: Record<string, unknown>) => ({
      email: String(row.email),
      plan: isPlan(row.plan) ? row.plan : 'cortesia',
      status: isStatus(row.status) ? row.status : 'pending',
      grantedBy: typeof row.granted_by === 'string' ? row.granted_by : undefined,
      expiresAt: typeof row.expires_at === 'string' ? row.expires_at : undefined,
      updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
    }));

    return { success: true, entitlements };
  } catch (thrown) {
    return failure(thrown, ADMIN_ERROR, 'unreachable');
  }
};

export const adminSetEntitlementStatus = async (
  email: string,
  status: EntitlementStatus,
): Promise<AccountResult<object>> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return backendUnavailable();
  }

  try {
    const { error } = await supabase.rpc('admin_set_entitlement_status', {
      target_email: email.trim(),
      new_status: status,
    });

    if (error) {
      return failure(error, ADMIN_ERROR);
    }

    return { success: true };
  } catch (thrown) {
    return failure(thrown, ADMIN_ERROR, 'unreachable');
  }
};

/**
 * Avisa cuando el backend cambia el estado de la sesión (spec 021, paso 3).
 *
 * Existe porque supabase-js puede invalidar la sesión por su cuenta —si el
 * refresh token es rechazado emite `SIGNED_OUT`— y hasta ahora nadie escuchaba
 * ese evento: el perfil local seguía diciendo que la cuenta estaba activa y la
 * app solo se enteraba en el siguiente arranque.
 *
 * Emite eventos de dominio y no tipos de `@supabase/supabase-js`, para no
 * filtrar la librería fuera de `src/backend` (constitution).
 *
 * @returns función para desuscribirse. En modo local (sin backend) es un no-op,
 *   así el consumidor no necesita preguntar si hay backend configurado.
 */
export const subscribeToAuthState = (
  listener: (event: AuthStateEvent) => void,
): (() => void) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((supabaseEvent) => {
    const event = toAuthStateEvent(supabaseEvent);

    // Los eventos que no cambian el estado de acceso se descartan acá.
    if (event) {
      listener(event);
    }
  });

  return () => data.subscription.unsubscribe();
};

export const signOutAccount = async (): Promise<void> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  try {
    await supabase.auth.signOut();
  } catch {
    // El logout local no depende del remoto: se ignora el error.
  }
};
