// Configuración del backend de licencias (spec 015, decision 007).
// Sin estas variables la app funciona en modo local (spec 014), sin red.

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isBackendConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
