/**
 * Normalization Audit:
 * 
 * - Why separate ROOM_TYPES from ROOMS?
 *   If base_rent or capacity were stored directly in ROOMS, changing the base rent for Single rooms
 *   would require updating 12 rows. That is an UPDATE ANOMALY caused by a transitive dependency:
 *   room_number -> type -> base_rent. In 3NF, base_rent depends strictly on type_id.
 * 
 * - Why separate LEASES from TENANTS and ROOMS?
 *   If tenant_id was in ROOMS, or room_id was in TENANTS, a tenant moving to another room or
 *   moving out would overwrite or delete the historical records (DELETION / INSERTION ANOMALIES).
 *   A LEASE explicitly models the time-bounded relationship between a tenant and a room.
 * 
 * - Why separate INVOICES and PAYMENTS?
 *   Tenants can make partial payments (e.g. paying ₱2,340 now and ₱500 later). Storing payment
 *   directly in INVOICES violates 1NF (repeating groups) or creates update anomalies.
 */
