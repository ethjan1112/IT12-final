# Initial room and payment setup

The tenant's initial room choice and proof of one month advance are stored in Supabase. Firebase remains the sign-in provider
and continues to hold the room catalog and the rest of the app's records.

## One-time Supabase setup

1. In the Supabase Dashboard, open **Authentication → Sign In / Providers → Third-Party Auth** and connect Firebase project `boardinghouse-rental-mgt`.
2. Make sure the base schema in `migrations/20261009161120_initial_schema.sql` and initial room setup in `migrations/20261010120000_supabase_initial_room_setup.sql` have been applied. Apply any unapplied migrations in timestamp order, including `migrations/20261012120000_initial_advance_only.sql`, `migrations/20261012160000_secure_security_definer_helpers.sql`, and `migrations/20261012170000_profiles_staff_write_policies.sql`. The advance-only migration clears existing deposit amounts and halves old two-month room setup amounts; the security migration moves RLS helpers out of the exposed API schema and revokes public execution of the maintenance RPC; the profile policy migration separates staff writes from profile reads. Make sure `private` is not listed under **Exposed schemas** in Supabase API settings.
3. From the project root, run `node scripts/configure-firebase-supabase-claims.mjs <path-to-firebase-service-account.json>`. Use a Firebase Admin service account for the same Firebase project. The script assigns `role: authenticated` and adds `app_role` for existing owner, landlord, and caretaker accounts. Have existing users sign out and back in to refresh their tokens. This step repairs existing accounts without Cloud Functions.
4. Automatic claim assignment for new accounts requires deploying the Firebase claim functions with `firebase deploy --only functions`. Firebase Functions deployment requires the project to be on the Blaze (pay-as-you-go) plan. The signup trigger handles new Firebase accounts after deployment. On the current Spark plan, rerun the Admin claims script whenever a new account needs Supabase access. The app checks for the claim before making Supabase requests and gives the administrator setup instruction if it is missing.
5. Confirm `.env` has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then restart Expo so it picks up the values.
6. For existing Firestore records, set `GOOGLE_APPLICATION_CREDENTIALS` to a Firebase Admin service-account JSON path, preview with `node scripts/migrate-initial-advance-only.cjs`, then apply with `node scripts/migrate-initial-advance-only.cjs --apply`. This clears lease and initial-invoice deposit fields. It preserves recorded payments; review old overpayments for refund or credit handling.

Keep the service-account JSON private and do not add it to source control. Never
put the Supabase service-role key in the app; the app uses the publishable key
and the row/object policies in the migration.
