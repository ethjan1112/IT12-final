import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { auth as firebaseAuth } from './firebase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

async function getFirebaseAccessToken() {
  const user = firebaseAuth?.currentUser;
  if (!user) return null;

  const tokenResult = await user.getIdTokenResult();
  if (tokenResult.claims.role !== 'authenticated') {
    throw new Error('Supabase access is not provisioned for this account. Ask the administrator to run `node scripts/configure-firebase-supabase-claims.mjs <service-account.json>`, then sign out and back in.');
  }
  return tokenResult.token;
}

// Firebase handles sign-in and token refresh. Supabase just receives the
// Firebase ID token on each request, so supabase.auth.* is not available.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      accessToken: getFirebaseAccessToken,
    })
  : null;
