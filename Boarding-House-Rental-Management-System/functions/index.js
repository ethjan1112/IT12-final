const admin = require('firebase-admin');
const functions = require('firebase-functions/v1');
const { onDocumentDeleted } = require('firebase-functions/v2/firestore');

admin.initializeApp();

const db = admin.firestore();

async function deleteTenantRecordsForUser(uid) {
  const tenantProfiles = await db.collection('tenants').where('user_id', '==', uid).get();
  const tenantDocs = new Map(tenantProfiles.docs.map((snapshot) => [snapshot.id, snapshot]));
  const conventionalTenantId = `tenant-${uid}`;
  if (!tenantDocs.has(conventionalTenantId)) {
    const conventionalProfile = await db.collection('tenants').doc(conventionalTenantId).get();
    if (conventionalProfile.exists) tenantDocs.set(conventionalTenantId, conventionalProfile);
  }

  const tenantIds = [...tenantDocs.keys()];
  const leasesById = new Map();
  for (const tenantId of tenantIds) {
    const leases = await db.collection('leases').where('tenant_id', '==', tenantId).get();
    leases.docs.forEach((snapshot) => leasesById.set(snapshot.id, snapshot));
  }
  const leaseIds = [...leasesById.keys()];

  const invoicesById = new Map();
  for (const leaseId of leaseIds) {
    const invoices = await db.collection('invoices').where('lease_id', '==', leaseId).get();
    invoices.docs.forEach((snapshot) => invoicesById.set(snapshot.id, snapshot));
  }
  const invoiceIds = [...invoicesById.keys()];

  const documentsToDelete = new Map();
  const collectQueryDocs = async (collectionName, field, value) => {
    if (!value) return;
    const snapshot = await db.collection(collectionName).where(field, '==', value).get();
    snapshot.docs.forEach((document) => documentsToDelete.set(document.ref.path, document.ref));
  };

  for (const invoiceId of invoiceIds) await collectQueryDocs('payments', 'invoice_id', invoiceId);
  for (const tenantId of tenantIds) {
    for (const collectionName of [
      'complaints',
      'payment_proofs',
      'room_change_requests',
      'due_date_extension_requests',
      'tenant_notifications',
    ]) {
      await collectQueryDocs(collectionName, 'tenant_id', tenantId);
    }
  }

  const deletedLeaseIds = new Set(leaseIds);
  const affectedRoomIds = new Set([...leasesById.values()].map((lease) => lease.data().room_id).filter(Boolean));
  const roomsToRelease = [];
  for (const roomId of affectedRoomIds) {
    const roomLeases = await db.collection('leases').where('room_id', '==', roomId).get();
    const hasOtherActiveLease = roomLeases.docs.some((lease) =>
      !deletedLeaseIds.has(lease.id) && lease.data().status === 'active'
    );
    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnapshot = await roomRef.get();
    if (!hasOtherActiveLease && roomSnapshot.exists && roomSnapshot.data().status === 'occupied') {
      roomsToRelease.push(roomRef);
    }
  }

  for (const invoice of invoicesById.values()) documentsToDelete.set(invoice.ref.path, invoice.ref);
  for (const lease of leasesById.values()) documentsToDelete.set(lease.ref.path, lease.ref);
  for (const tenant of tenantDocs.values()) documentsToDelete.set(tenant.ref.path, tenant.ref);
  documentsToDelete.set(db.collection('users').doc(uid).path, db.collection('users').doc(uid));

  const writer = db.bulkWriter();
  const writePromises = [...documentsToDelete.values()].map((reference) => writer.delete(reference));
  for (const roomRef of roomsToRelease) writePromises.push(writer.update(roomRef, { status: 'vacant' }));
  await Promise.all(writePromises);
  await writer.close();
}

// Firestore does not cascade deletes. Removing a user profile document removes
// its linked tenant, lease, invoice, payment, and tenant-specific request data.
exports.cleanupTenantDataWhenUserProfileDeleted = onDocumentDeleted(
  { document: 'users/{uid}', region: 'asia-southeast1' },
  async (event) => {
    const uid = event.params.uid;
    const deletedProfile = event.data?.data();
    if (!uid || !['tenant'].includes(deletedProfile?.role)) return;
    await deleteTenantRecordsForUser(uid);
  }
);

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
