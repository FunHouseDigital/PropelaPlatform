-- =============================================================================
-- promote_superadmins.sql — grant the two Propela Ops accounts full access
-- =============================================================================
-- Run this in the Supabase SQL Editor AFTER:
--   1. The full schema has been applied (paste supabase/bundled_migration.sql).
--   2. The two users have been created in Supabase Auth (Auth -> Users -> Add user):
--        Vuyo@propela.co
--        Aya@propela.co
--
-- The handle_new_user() trigger (see migration 0003) already inserts a
-- least-privilege 'Read-only' profile for each new auth user. This snippet
-- promotes those two accounts to 'Superadmin', which the RLS policies treat as
-- full access on every table (same as Admin).
--
-- NOTE ON EMAILS: the match is CASE-INSENSITIVE (lower(email)), but the email
-- addresses below MUST correspond exactly to the accounts you created in
-- Supabase Auth. Update the list if the go-live addresses differ.
--
-- Re-runnable: the ON CONFLICT clause promotes existing profile rows in place
-- and never creates duplicates.
-- =============================================================================

insert into profiles (user_id, role)
select id, 'Superadmin'
from auth.users
where lower(email) in ('vuyo@propela.co', 'aya@propela.co')
on conflict (user_id) do update set role = 'Superadmin';

-- Verify the promotion (optional):
--   select u.email, p.role
--   from auth.users u
--   join profiles p on p.user_id = u.id
--   where lower(u.email) in ('vuyo@propela.co', 'aya@propela.co');
