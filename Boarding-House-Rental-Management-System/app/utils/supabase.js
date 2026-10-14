import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { auth as firebaseAuth } from './firebase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

async function getFirebaseAccessToken() {
  // Supabase assigns Firebase JWTs without a `role` custom claim to the anon
  // Postgres role. The Firebase-specific RLS policies permit only verified
  // tokens from our configured Firebase project, so tenant signup needs no
  // privileged Firebase Admin claim write or paid Cloud Function.
  return (await firebaseAuth?.currentUser?.getIdToken()) || null;
}

// Firebase handles sign-in and token refresh. Supabase just receives the
// Firebase ID token on each request, so supabase.auth.* is not available.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      accessToken: getFirebaseAccessToken,
    })
  : null;
