export const SESSION_STORE_DATA_VERSION = 2;

// Gracia offline (spec 015): días que la app funciona sin reverificar la
// licencia online. Al vencer bloquea en el arranque, salvo partido en vivo.
export const ACCESS_GRACE_DAYS = 14;

export type UserPlan = 'cortesia' | 'suscripcion';

export type EntitlementStatus = 'pending' | 'active' | 'revoked';

export type AccountEntitlement = {
  plan: UserPlan;
  status: EntitlementStatus;
  verifiedAt: string;
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
  | 'pending' // licencia aún no activada por el administrador
  | 'revoked' // licencia revocada
  | 'expired'; // licencia activa pero sin verificar hace más de la gracia

const DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_MS = ACCESS_GRACE_DAYS * DAY_MS;

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

  if (!entitlement || entitlement.status === 'pending') {
    return 'pending';
  }

  if (entitlement.status === 'revoked') {
    return 'revoked';
  }

  const verifiedAt = Date.parse(entitlement.verifiedAt);
  const now = Date.parse(nowIso);

  if (!Number.isFinite(verifiedAt) || !Number.isFinite(now) || now - verifiedAt > GRACE_MS) {
    return 'expired';
  }

  return 'active';
};

// Único punto de corte del acceso (decisions 006/007). Cuando existan pagos,
// solo cambia cómo un usuario llega a plan 'suscripcion'; esta evaluación no.
export const hasActiveAccess = (
  profile: UserProfile | undefined,
  nowIso?: string,
): boolean => {
  const access = evaluateAccess(profile, nowIso);

  return access === 'local' || access === 'active';
};
