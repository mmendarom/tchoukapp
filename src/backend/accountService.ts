import { AccountEntitlement, EntitlementStatus, UserPlan } from '../domain/session';
import { getSupabaseClient } from './supabaseClient';

const BACKEND_UNAVAILABLE_ERROR = 'El servidor no está configurado en esta versión de la app.';
const NETWORK_ERROR = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.';
const SEND_CODE_ERROR = 'No se pudo enviar el código.';
const INVALID_CODE_ERROR = 'El código no es válido o expiró. Pedí uno nuevo.';
const NO_SESSION_ERROR = 'No hay una sesión activa en el servidor.';

// El detalle técnico de Supabase (en inglés) se anexa para poder diagnosticar
// fallas de configuración (key inválida, signups deshabilitados, rate limit).
const withDetail = (message: string, detail?: string) =>
  detail ? `${message} Detalle: ${detail}` : message;

export type AccountResult<T> =
  | ({ success: true } & T)
  | { success: false; error: string };

const isPlan = (value: unknown): value is UserPlan => value === 'cortesia' || value === 'suscripcion';

const isStatus = (value: unknown): value is EntitlementStatus =>
  value === 'pending' || value === 'active' || value === 'revoked';

export const requestEmailOtp = async (email: string): Promise<AccountResult<object>> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { success: false, error: BACKEND_UNAVAILABLE_ERROR };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    if (error) {
      return { success: false, error: withDetail(SEND_CODE_ERROR, error.message) };
    }

    return { success: true };
  } catch {
    return { success: false, error: NETWORK_ERROR };
  }
};

export const verifyEmailOtp = async (
  email: string,
  code: string,
): Promise<AccountResult<{ accountId: string }>> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { success: false, error: BACKEND_UNAVAILABLE_ERROR };
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });

    if (error || !data.user) {
      return { success: false, error: withDetail(INVALID_CODE_ERROR, error?.message) };
    }

    return { success: true, accountId: data.user.id };
  } catch {
    return { success: false, error: NETWORK_ERROR };
  }
};

export const fetchEntitlement = async (): Promise<AccountResult<{ entitlement: AccountEntitlement }>> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { success: false, error: BACKEND_UNAVAILABLE_ERROR };
  }

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: NO_SESSION_ERROR };
    }

    const { data, error } = await supabase
      .from('entitlements')
      .select('plan, status')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (error) {
      return { success: false, error: withDetail(NETWORK_ERROR, error.message) };
    }

    // Fila ausente (registro anterior al trigger): tratar como pendiente.
    const plan = isPlan(data?.plan) ? data.plan : 'cortesia';
    const status = isStatus(data?.status) ? data.status : 'pending';

    return {
      success: true,
      entitlement: { plan, status, verifiedAt: new Date().toISOString() },
    };
  } catch {
    return { success: false, error: NETWORK_ERROR };
  }
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
