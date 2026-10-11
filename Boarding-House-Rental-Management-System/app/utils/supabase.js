import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { auth as firebaseAuth } from './firebase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

// Firebase handles sign-in and token refresh. Supabase just receives the
// Firebase ID token on each request, so supabase.auth.* is not available.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      accessToken: async () => firebaseAuth?.currentUser?.getIdToken() ?? null,
    })
  : null;