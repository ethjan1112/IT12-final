const { applicationDefault, deleteApp, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp({
  credential: applicationDefault(),
  projectId: 'boardinghouse-rental-mgt',
});

const db = getFirestore(app);
const applyChanges = process.argv.includes('--apply');

async function commitInChunks(updates) {
  for (let offset = 0; offset < updates.length; offset += 450) {
    const batch = db.batch();
    updates.slice(offset, offset + 450).forEach(({ ref, data }) => batch.update(ref, data));
    await batch.commit();
  }
}

async function main() {
  const [leaseSnapshot, invoiceSnapshot, paymentSnapshot, roomSnapshot, notificationSnapshot] = await Promise.all([
    db.collection('leases').get(),
    db.collection('invoices').get(),
    db.collection('payments').get(),
    db.collection('rooms').get(),
    db.collection('tenant_notifications').get(),
  ]);
  const paidByInvoice = new Map();
  paymentSnapshot.forEach((document) => {
    const payment = document.data();
    paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) || 0) + Number(payment.amount_paid || 0));
  });

  const invoiceUpdates = [];
  const initialInvoices = new Map();
  invoiceSnapshot.forEach((document) => {
    const invoice = document.data();
    if (invoice.invoice_type !== 'initial') return;

    initialInvoices.set(document.id, { ...invoice, security_deposit: 0 });
    if (Number(invoice.security_deposit || 0) <= 0) return;

    const deposit = Number(invoice.security_deposit || 0);
    const total = Math.max(0, Number(invoice.total_amount || 0) - deposit);
    const paid = paidByInvoice.get(document.id) || 0;
    const notes = String(invoice.notes || '').replace(/\s*\+\s*security deposit/gi, '');
    const status = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    invoiceUpdates.push({
      ref: document.ref,
      data: { security_deposit: 0, total_amount: total, notes, status },
    });
    initialInvoices.set(document.id, { ...invoice, security_deposit: 0, total_amount: total });
  });

  const leaseUpdates = [];
  leaseSnapshot.forEach((document) => {
    const lease = document.data();
    if (Number(lease.security_deposit_amount || 0) !== 0 || lease.security_deposit_paid) {
      leaseUpdates.push({
        ref: document.ref,
        data: { security_deposit_amount: 0, security_deposit_paid: false },
      });
    }
  });

  const leaseById = new Map(leaseSnapshot.docs.map((document) => [document.id, document.data()]));
  const roomById = new Map(roomSnapshot.docs.map((document) => [document.id, document.data()]));
  const notificationUpdates = [];
  notificationSnapshot.forEach((document) => {
    const notification = document.data();
    const invoice = initialInvoices.get(notification.related_invoice_id);
    if (notification.type !== 'approval' || !invoice) return;
    const lease = leaseById.get(invoice.lease_id);
    const room = lease && roomById.get(lease.room_id);
    if (!lease || !room) return;
    notificationUpdates.push({
      ref: document.ref,
      data: {
        message: `Your account has been approved. You've been assigned to Room ${room.room_number}. Your initial payment of ₱${Number(invoice.rent_charge || 0).toLocaleString()} (1 month advance) is due on ${invoice.due_date}.`,
      },
    });
  });

  const updates = [...leaseUpdates, ...invoiceUpdates, ...notificationUpdates];
  console.log(`Prepared ${leaseUpdates.length} lease, ${invoiceUpdates.length} initial invoice, and ${notificationUpdates.length} notification updates.`);
  if (!applyChanges) {
    console.log('Preview only. Re-run with --apply to write these changes to Firestore.');
    return;
  }

  await commitInChunks(updates);
  console.log('Firestore migration complete.');
  console.log('Recorded payment transactions were left unchanged. Review any historical overpayments for refund or credit handling.');
}

main()
  .catch((error) => {
    console.error('Initial advance migration failed:', error);
    process.exitCode = 1;
  })
  .finally(() => deleteApp(app));
