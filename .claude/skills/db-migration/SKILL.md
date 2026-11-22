---
name: db-migration
description: Use when creating or changing any Supabase table, policy, function or storage bucket. Gives the migration file rules and the RLS checklist for this project.
---

# Database migration rules

1. File: `supabase/migrations/<YYYYMMDDHHMMSS>_<topic>.sql`. Never edit an old migration; add a new one.
2. Idempotent: `create table if not exists`, `add column if not exists`, `drop policy if exists` before `create policy`.
3. Every table: `enable row level security`, `revoke all ... from anon, authenticated`, then explicit `grant`s of only the
   columns/operations needed. Use `(select auth.uid())` in policies.
4. Ownership: a row carries `owner_id` (and `profile_id` when it belongs to a person). From Phase 5 use the membership helper
   `private.can_access_profile(profile_id, min_role)` instead of `owner_id = auth.uid()`.
5. Foreign keys to `care_profiles` use `on delete cascade`. Storage objects do not cascade: delete files in app code first.
6. Storage: private buckets, policies on `storage.objects` scoped by the first path folder (`<account id>/<profile id>/<file>`).
7. Add an RLS test (a second account must NOT read or write the first account's rows). Run only against the dev project.
8. After writing: tell the owner exactly how to run it (Supabase > SQL Editor > New query > paste > Run) and what "Success" looks like.
9. Update `docs/CURRENT_STATE.md` table list and the README migration order.
