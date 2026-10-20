import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  AccountEntitlement,
  AccountFailureKind,
  SESSION_STORE_DATA_VERSION,
  SessionProfileInput,
  UserProfile,
  buildUserProfile,
  validateProfileInput,
} from '../domain/session';
import { appStorage, STORAGE_KEYS } from '../storage/asyncStorage';

type LoginResult =
  | { success: true }
  | { success: false; error: string };

type AccountLoginInput = {
  name: string;
  email: string;
  accountId: string;
  entitlement?: AccountEntitlement;
};

// Último intento fallido de verificar la licencia (spec 021). No se persiste:
// al arrancar, `App.tsx` reintenta enseguida y lo vuelve a poblar. Sirve para
// que la UI pueda decir la verdad sobre la causa del problema.
export type VerificationFailure = {
  kind: AccountFailureKind;
  at: string;
};

type SessionState = {
  hasHydrated: boolean;
  profile?: UserProfile;
  // Último nombre/email con los que se entró: sobreviven al logout para
  // prellenar la portada en el próximo login.
  lastLoginName?: string;
  lastLoginEmail?: string;
  lastVerificationFailure?: VerificationFailure;
  setHasHydrated: (hasHydrated: boolean) => void;
  login: (input: SessionProfileInput) => LoginResult;
  loginWithAccount: (input: AccountLoginInput) => LoginResult;
  updateEntitlement: (entitlement: AccountEntitlement) => boolean;
  recordVerificationFailure: (kind: AccountFailureKind, atIso?: string) => void;
  markSessionInvalid: (atIso?: string) => void;
  updateProfileName: (name: string) => LoginResult;
  logout: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      profile: undefined,
      lastLoginName: undefined,
      lastLoginEmail: undefined,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      login: (input) => {
        const validation = validateProfileInput(input);

        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const profile = buildUserProfile(input);

        if (!profile) {
          return { success: false, error: 'No se pudo crear el perfil.' };
        }

        set({
          profile,
          lastLoginName: profile.name,
          lastLoginEmail: profile.email,
          // Entrar de nuevo deja atrás el motivo del fallo anterior.
          lastVerificationFailure: undefined,
        });

        return { success: true };
      },
      loginWithAccount: (input) => {
        const validation = validateProfileInput({ name: input.name, email: input.email });

        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const base = buildUserProfile(
          { name: input.name, email: input.email },
          { id: input.accountId, plan: input.entitlement?.plan ?? 'cortesia' },
        );

        if (!base) {
          return { success: false, error: 'No se pudo crear el perfil.' };
        }

        set({
          profile: {
            ...base,
            accountId: input.accountId,
            entitlement: input.entitlement,
          },
          lastLoginName: base.name,
          lastLoginEmail: base.email,
          lastVerificationFailure: undefined,
        });

        return { success: true };
      },
      updateProfileName: (name) => {
        const profile = get().profile;

        if (!profile) {
          return { success: false, error: 'No hay una sesión activa.' };
        }

        const validation = validateProfileInput({ name });

        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const trimmed = name.trim();

        set({
          profile: { ...profile, name: trimmed },
          lastLoginName: trimmed,
        });

        return { success: true };
      },
      updateEntitlement: (entitlement) => {
        const profile = get().profile;

        if (!profile?.accountId) {
          return false;
        }

        set({
          profile: {
            ...profile,
            plan: entitlement.plan,
            entitlement: {
              // Una verificación exitosa borra el rastro del fallo anterior:
              // el techo del fail-open se cuenta desde el primer fallo NUEVO.
              ...entitlement,
              unreachableSince: undefined,
            },
            lastLoginAt: entitlement.verifiedAt,
          },
          lastVerificationFailure: undefined,
        });

        return true;
      },
      recordVerificationFailure: (kind, atIso) => {
        const at = atIso ?? new Date().toISOString();
        const profile = get().profile;

        set({ lastVerificationFailure: { kind, at } });

        // Solo 'unreachable' arranca el techo del fail-open (decisión 010).
        if (kind !== 'unreachable' || !profile?.accountId || !profile.entitlement) {
          return;
        }

        // Clave: si ya hay un primer fallo registrado NO se pisa. Pisarlo en
        // cada intento reiniciaría el techo y nunca vencería.
        if (profile.entitlement.unreachableSince) {
          return;
        }

        set({
          profile: {
            ...profile,
            entitlement: { ...profile.entitlement, unreachableSince: at },
          },
        });
      },
      // El backend invalidó la sesión por su cuenta (refresh token rechazado):
      // hay que reloguear. No borra el perfil ni los datos deportivos, solo
      // deja el motivo para que la UI lo explique y ofrezca el relogueo.
      markSessionInvalid: (atIso) => {
        const profile = get().profile;

        // Tras un logout deliberado el perfil ya se limpió. Marcar igual
        // dejaría un "sesión vencida" fantasma para el próximo login.
        if (!profile?.accountId) {
          return;
        }

        get().recordVerificationFailure('auth', atIso);
      },
      logout: () => set({ profile: undefined, lastVerificationFailure: undefined }),
    }),
    {
      name: STORAGE_KEYS.sessionState,
      version: SESSION_STORE_DATA_VERSION,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // v1 -> v2: los perfiles locales (spec 014) siguen válidos tal cual;
      // accountId y entitlement son opcionales.
      migrate: (persistedState) => persistedState as Partial<SessionState>,
      partialize: (state) => ({
        profile: state.profile,
        lastLoginName: state.lastLoginName,
        lastLoginEmail: state.lastLoginEmail,
      }),
      storage: createJSONStorage(() => appStorage),
    },
  ),
);
