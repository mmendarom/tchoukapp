import 'react-native-url-polyfill/auto';

import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { AppState, AppStateStatus } from 'react-native';

import { appStorage } from '../storage/asyncStorage';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isBackendConfigured } from './config';

let client: SupabaseClient | undefined;
let appStateSubscription: { remove: () => void } | undefined;

// `autoRefreshToken: true` no alcanza en React Native: el refresh corre sobre
// un timer que el sistema suspende con la app en background. Al volver, el
// access token puede estar vencido y el refresh token puede quedar rechazado
// ("already used"), con lo que supabase-js desloguea del lado del cliente.
//
// La guia de supabase-js para React Native pide enganchar el ticker a
// `AppState`: se para al irse a background y se arranca al volver. Es el
// arreglo del paso 3 de la spec 021.
const bindAutoRefreshToAppState = (supabase: SupabaseClient) => {
  // Idempotente: el cliente es un singleton, pero si alguna vez se recreara no
  // queremos acumular listeners.
  if (appStateSubscription) {
    return;
  }

  // Si la app ya esta en foreground cuando se crea el cliente (el caso normal
  // al arrancar), hay que arrancar el ticker a mano: `AppState` no emite un
  // evento inicial.
  if (AppState.currentState === 'active') {
    void supabase.auth.startAutoRefresh();
  }

  appStateSubscription = AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'active') {
      void supabase.auth.startAutoRefresh();
      return;
    }

    void supabase.auth.stopAutoRefresh();
  });
};

export const getSupabaseClient = (): SupabaseClient | undefined => {
  if (!isBackendConfigured()) {
    return undefined;
  }

  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: appStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    bindAutoRefreshToAppState(client);
  }

  return client;
};
