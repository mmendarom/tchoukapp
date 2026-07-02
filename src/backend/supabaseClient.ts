import 'react-native-url-polyfill/auto';

import { SupabaseClient, createClient } from '@supabase/supabase-js';

import { appStorage } from '../storage/asyncStorage';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isBackendConfigured } from './config';

let client: SupabaseClient | undefined;

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
  }

  return client;
};
