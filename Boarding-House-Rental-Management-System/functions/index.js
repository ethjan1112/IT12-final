const admin = require('firebase-admin');
const functions = require('firebase-functions/v1');

admin.initializeApp();

// Supabase needs role=authenticated on every Firebase ID token. This runs for
// accounts created after the one-time admin claim migration has been run.
exports.setSupabaseRoleForNewUsers = functions.auth.user().onCreate(async (user) => {
  const customClaims = user.customClaims || {};
  if (customClaims.role === 'authenticated') return;

  await admin.auth().setCustomUserClaims(user.uid, {
    ...customClaims,
    role: 'authenticated',
  });
});

// Repair claims for accounts created before the signup trigger was deployed.
// The caller cannot choose its role: the trusted Firestore user profile does.
exports.ensureSupabaseRoleClaim = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in before requesting Supabase access.');
  }

  let stage = 'profile-read';
  try {
    const uid = context.auth.uid;
    const profile = await admin.firestore().collection('users').doc(uid).get();
    const appRole = profile.exists ? profile.data().role : null;
    const allowedRoles = new Set(['tenant', 'owner', 'landlord', 'caretaker']);
    if (!allowedRoles.has(appRole)) {
      throw new functions.https.HttpsError('permission-denied', 'This account does not have a valid application role.');
    }

    stage = 'auth-user-read';
    const user = await admin.auth().getUser(uid);
    const customClaims = { ...(user.customClaims || {}), role: 'authenticated' };
    if (['owner', 'landlord', 'caretaker'].includes(appRole)) {
      customClaims.app_role = appRole;
    } else {
      delete customClaims.app_role;
    }
    stage = 'claim-write';
    await admin.auth().setCustomUserClaims(uid, customClaims);
    return { configured: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    const errorCode = error?.code || 'unknown';
    console.error('Failed to repair Supabase role claim:', {
      uid: context.auth.uid,
      stage,
      code: errorCode,
      message: error?.message || String(error),
    });
    throw new functions.https.HttpsError('internal', `Claim repair failed at ${stage} (${errorCode}). Check Firebase Functions logs.`);
  }
});
