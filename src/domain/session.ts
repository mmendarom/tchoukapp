export const SESSION_STORE_DATA_VERSION = 2;

// Gracia offline (spec 015): días que la app funciona sin reverificar la
// licencia online. Al vencer bloquea en el arranque, salvo partido en vivo.
export const ACCESS_GRACE_DAYS = 14;

// Techo del fail-open acotado (spec 021, decisión 010): días que la app sigue
// funcionando con la gracia ya vencida cuando el servidor de licencias es
// inalcanzable. Se cuenta desde el PRIMER fallo observado, no desde la última
// verificación: si nadie abrió la app en meses, la gracia venció hace mucho y
// un techo medido desde `verifiedAt` bloquearía justo el primer día del torneo.
export const UNREACHABLE_CEILING_DAYS = 21;

// Unica cuenta admin (spec 016): gestiona licencias desde el perfil sin SQL.
export const ADMIN_EMAIL = 'mauromendaro@gmail.com';

export const isAdminProfile = (profile?: UserProfile): boolean =>
  (profile?.email ?? '').trim().toLowerCase() === ADMIN_EMAIL;

export type UserPlan = 'cortesia' | 'suscripcion';

export type EntitlementStatus = 'pending' | 'active' | 'revoked';

// Motivo por el que falló una operación contra el backend de licencias
// (spec 021). El dominio necesita distinguirlos porque solo 'unreachable'
// habilita el fail-open: los demás significan que el servidor contestó, así
// que el arreglo está en manos del usuario (reloguear) o es autoritativo.
export type AccountFailureKind =
  | 'backend-unavailable' // sin variables de entorno: modo local, no es un fallo
  | 'unreachable' // red, DNS, timeout, proyecto pausado, 5xx
  | 'no-session' // no hay sesión guardada en el dispositivo
  | 'auth' // refresh rechazado o JWT inválido: hay que reloguear
  | 'server' // el servidor respondió con error (RLS, SQL, 4xx)
  | 'invalid-code'; // código OTP incorrecto o vencido

export type AccountEntitlement = {
  plan: UserPlan;
  status: EntitlementStatus;
  verifiedAt: string;
  // Vencimiento de la licencia (ISO). undefined = sin vencimiento.
  expiresAt?: string;
  // Primer fallo 'unreachable' desde la última verificación exitosa (ISO).
  // Se setea solo si está ausente y se limpia en cada verificación exitosa:
  // si los fallos siguientes lo pisaran, el techo nunca vencería.
  // undefined = nunca falló por inalcanzable.
  unreachableSince?: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email?: string;
  plan: UserPlan;
  createdAt: string;
  lastLoginAt: string;
  // Presentes solo cuando el perfil está vinculado a una cuenta del backend
  // (spec 015). Sin accountId el perfil es de modo local (spec 014).
  accountId?: string;
  entitlement?: AccountEntitlement;
};

// Fila de licencia de otro usuario, vista por el admin (spec 016).
export type AdminEntitlementRow = {
  email: string;
  plan: UserPlan;
  status: EntitlementStatus;
  grantedBy?: string;
  expiresAt?: string;
  updatedAt: string;
};

export type SessionProfileInput = {
  name: string;
  email?: string;
};

export type SessionValidationResult =
  | { valid: true }
  | { valid: false; error: string };

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 40;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateProfileInput = (input: SessionProfileInput): SessionValidationResult => {
  const name = input.name?.trim() ?? '';

  if (name.length < NAME_MIN_LENGTH) {
    return { valid: false, error: 'Ingresá tu nombre (mínimo 2 caracteres).' };
  }

  if (name.length > NAME_MAX_LENGTH) {
    return { valid: false, error: 'El nombre es demasiado largo (máximo 40 caracteres).' };
  }

  const email = input.email?.trim();

  if (email && !EMAIL_PATTERN.test(email)) {
    return { valid: false, error: 'El email no tiene un formato válido.' };
  }

  return { valid: true };
};

export type BuildUserProfileOptions = {
  id?: string;
  plan?: UserPlan;
  now?: string;
};

export const buildUserProfile = (
  input: SessionProfileInput,
  options: BuildUserProfileOptions = {},
): UserProfile | undefined => {
  if (!validateProfileInput(input).valid) {
    return undefined;
  }

  const now = options.now ?? new Date().toISOString();
  const email = input.email?.trim();

  return {
    id: options.id ?? `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    email: email || undefined,
    plan: options.plan ?? 'cortesia',
    createdAt: now,
    lastLoginAt: now,
  };
};

export type AccessEvaluation =
  | 'none' // sin perfil
  | 'local' // perfil de modo local (sin backend): acceso completo
  | 'active' // licencia activa verificada dentro de la gracia
  | 'unreachable' // licencia activa, gracia vencida, servidor sin responder: acceso con aviso
  | 'pending' // licencia aún no activada por el administrador
  | 'revoked' // licencia revocada
  | 'lapsed' // licencia con fecha de vencimiento cumplida (expiresAt)
  | 'expired'; // licencia activa pero sin verificar hace más de la gracia

const DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_MS = ACCESS_GRACE_DAYS * DAY_MS;
const UNREACHABLE_CEILING_MS = UNREACHABLE_CEILING_DAYS * DAY_MS;

// Con esta cantidad de días de gracia restantes (o menos) la app muestra el
// aviso de reconexión en Inicio.
export const GRACE_WARNING_DAYS = 4;

// Días enteros de uso offline que quedan antes de que venza la verificación.
// undefined si no aplica (perfil local, sin licencia o licencia no activa).
export const getGraceDaysLeft = (
  profile: UserProfile | undefined,
  nowIso: string = new Date().toISOString(),
): number | undefined => {
  if (!profile?.accountId || profile.entitlement?.status !== 'active') {
    return undefined;
  }

  const verifiedAt = Date.parse(profile.entitlement.verifiedAt);
  const now = Date.parse(nowIso);

  if (!Number.isFinite(verifiedAt) || !Number.isFinite(now)) {
    return 0;
  }

  return Math.max(0, Math.floor((GRACE_MS - (now - verifiedAt)) / DAY_MS));
};

// Días enteros que quedan de fail-open antes de que el techo venza y la app
// bloquee. undefined si no hay un fallo de inalcanzable en curso.
export const getUnreachableDaysLeft = (
  profile: UserProfile | undefined,
  nowIso: string = new Date().toISOString(),
): number | undefined => {
  const since = profile?.entitlement?.unreachableSince;

  if (!since) {
    return undefined;
  }

  const sinceMs = Date.parse(since);
  const now = Date.parse(nowIso);

  if (!Number.isFinite(sinceMs) || !Number.isFinite(now)) {
    return undefined;
  }

  return Math.max(0, Math.floor((UNREACHABLE_CEILING_MS - (now - sinceMs)) / DAY_MS));
};

export const evaluateAccess = (
  profile: UserProfile | undefined,
  nowIso: string = new Date().toISOString(),
): AccessEvaluation => {
  if (!profile) {
    return 'none';
  }

  if (!profile.accountId) {
    return 'local';
  }

  const entitlement = profile.entitlement;

  // Los tres casos autoritativos van ANTES del fail-open a propósito
  // (decisión 010, punto 2): es lo que garantiza que un servidor caído no
  // abra ninguna puerta nueva. Quien fue revocado, nunca aprobado o cuya
  // licencia venció sigue bloqueado, inalcanzable o no.
  if (entitlement?.status === 'revoked') {
    return 'revoked';
  }

  if (entitlement?.expiresAt) {
    const expiresAt = Date.parse(entitlement.expiresAt);
    const nowMs = Date.parse(nowIso);

    if (Number.isFinite(expiresAt) && Number.isFinite(nowMs) && nowMs >= expiresAt) {
      return 'lapsed';
    }
  }

  if (!entitlement || entitlement.status === 'pending') {
    return 'pending';
  }

  const verifiedAt = Date.parse(entitlement.verifiedAt);
  const now = Date.parse(nowIso);

  // Datos corruptos no habilitan fail-open: sin una fecha de verificación
  // confiable no se puede afirmar que esta licencia estuvo activa.
  if (!Number.isFinite(verifiedAt) || !Number.isFinite(now)) {
    return 'expired';
  }

  if (now - verifiedAt <= GRACE_MS) {
    return 'active';
  }

  // Gracia vencida. Si el servidor viene sin responder, se concede acceso
  // hasta el techo contado desde el primer fallo (fail-open acotado).
  const unreachableDaysLeft = getUnreachableDaysLeft(profile, nowIso);

  if (unreachableDaysLeft !== undefined && unreachableDaysLeft > 0) {
    return 'unreachable';
  }

  return 'expired';
};

// Único punto de corte del acceso (decisions 006/007). Cuando existan pagos,
// solo cambia cómo un usuario llega a plan 'suscripcion'; esta evaluación no.
export const hasActiveAccess = (
  profile: UserProfile | undefined,
  nowIso?: string,
): boolean => {
  const access = evaluateAccess(profile, nowIso);

  return access === 'local' || access === 'active' || access === 'unreachable';
};

// Aviso a mostrar en Inicio y Perfil. Vive acá y no en los componentes para
// que la regla sea pura y testeable (constitution).
export type AccessNoticeLevel =
  | 'none' // sin aviso visible
  | 'warning' // la gracia normal se está agotando
  | 'critical'; // el servidor no responde y hay un techo corriendo

export type AccessNotice = {
  level: AccessNoticeLevel;
  // Días enteros restantes antes del bloqueo. undefined cuando level es 'none'.
  daysLeft?: number;
};

export const getAccessNotice = (
  profile: UserProfile | undefined,
  nowIso: string = new Date().toISOString(),
): AccessNotice => {
  const access = evaluateAccess(profile, nowIso);

  if (access === 'unreachable') {
    return { level: 'critical', daysLeft: getUnreachableDaysLeft(profile, nowIso) ?? 0 };
  }

  if (access !== 'active') {
    return { level: 'none' };
  }

  const graceDaysLeft = getGraceDaysLeft(profile, nowIso);

  if (graceDaysLeft !== undefined && graceDaysLeft <= GRACE_WARNING_DAYS) {
    return { level: 'warning', daysLeft: graceDaysLeft };
  }

  return { level: 'none' };
};
