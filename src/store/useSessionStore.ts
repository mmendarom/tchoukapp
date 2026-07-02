import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  AccountEntitlement,
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

type SessionState = {
  hasHydrated: boolean;
  profile?: UserProfile;
  // Último nombre/email con los que se entró: sobreviven al logout para
  // prellenar la portada en el próximo login.
  lastLoginName?: string;
  lastLoginEmail?: string;
  setHasHydrated: (hasHydrated: boolean) => void;
  login: (input: SessionProfileInput) => LoginResult;
  loginWithAccount: (input: AccountLoginInput) => LoginResult;
  updateEntitlement: (entitlement: AccountEntitlement) => boolean;
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

        set({ profile, lastLoginName: profile.name, lastLoginEmail: profile.email });

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
            entitlement,
            lastLoginAt: entitlement.verifiedAt,
          },
        });

        return true;
      },
      logout: () => set({ profile: undefined }),
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
