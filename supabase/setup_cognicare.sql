-- CogniCare: one-time setup for a new Supabase project.
-- Supports a clean project or a project with ONLY 20261021000100 already applied.
-- This script is not a migration for an established installation. It refuses
-- to proceed if later CogniCare tables exist or legacy reminder data is present.
-- Run in the Supabase SQL Editor as the project administrator. A failure rolls
-- back the whole script. Do not also run the historical migrations afterward.
-- Future features require their own reviewed migrations and access policies.

begin;

do $guard$
declare
  relation_name text;
  baseline_present boolean := to_regclass('public.profiles') is not null;
begin
  if to_regclass('public.care_profiles') is not null
     or to_regclass('public.memory_items') is not null
     or to_regclass('public.reminder_events') is not null
     or to_regclass('public.profile_difficulty') is not null
     or to_regclass('public.account_settings') is not null then
    raise exception 'CogniCare setup has already progressed beyond the first migration. Stop: do not run this setup on an existing installation.';
  end if;

  if exists (select 1 from storage.buckets where id = 'life-story') then
    raise exception 'A life-story storage bucket already exists. Stop and inspect the existing setup.';
  end if;

  foreach relation_name in array array[
    'caregiver_links', 'games', 'sessions', 'results', 'difficulty_state',
    'reminders', 'reminder_completions'
  ] loop
    if baseline_present and to_regclass('public.' || relation_name) is null then
      raise exception 'Incomplete first migration: public.% is missing. Stop and inspect the database.', relation_name;
    elsif not baseline_present and to_regclass('public.' || relation_name) is not null then
      raise exception 'Existing table public.% found without the CogniCare baseline. Stop and inspect the database.', relation_name;
    end if;
  end loop;

  if baseline_present and (
    not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'reminders' and column_name = 'patient_id'
    )
    or not exists (
      select 1 from pg_catalog.pg_trigger
      where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created_profile' and not tgisinternal
    )
  ) then
    raise exception 'The existing database does not match the first CogniCare migration. Stop and inspect it.';
  end if;
end
$guard$;

-- The original baseline is skipped when the first migration is already present.
do $setup$
begin
  if to_regclass('public.profiles') is null then
    execute $baseline$
create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('patient', 'caregiver')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.caregiver_links (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  created_at timestamptz not null default now(),
  unique (caregiver_id, patient_id),
  check (caregiver_id <> patient_id)
);

create table public.games (
  id text primary key,
  name text not null,
  active boolean not null default true
);
insert into public.games (id, name) values
  ('memory-match', 'Memory Match'),
  ('sequence-recall', 'Sequence Recall'),
  ('pattern-practice', 'Pattern Practice'),
  ('daily-routine', 'Daily Routine')
on conflict (id) do nothing;

create table public.sessions (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id),
  completed_at timestamptz not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  accuracy numeric(5,2) not null check (accuracy between 0 and 100),
  attempts integer not null check (attempts >= 0),
  mistakes integer not null check (mistakes >= 0),
  duration_seconds integer not null check (duration_seconds >= 0),
  response_time_seconds numeric(8,2),
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index sessions_user_completed_idx on public.sessions (user_id, completed_at desc);
create index sessions_user_game_completed_idx on public.sessions (user_id, game_id, completed_at desc);

create table public.results (
  session_id text primary key references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score >= 0),
  completed boolean not null default true,
  recorded_at timestamptz not null default now()
);
create index results_user_recorded_idx on public.results (user_id, recorded_at desc);

create table public.difficulty_state (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id),
  level smallint not null check (level between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  category text not null check (category in ('medicine', 'hydration', 'daily-task', 'appointment', 'other')),
  due_at timestamptz not null,
  recurrence text not null default 'once' check (recurrence in ('once', 'daily', 'weekly')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index reminders_patient_due_idx on public.reminders (patient_id, due_at) where active;

create table public.reminder_completions (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  status text not null default 'completed' check (status in ('completed', 'skipped')),
  unique (reminder_id, patient_id, completed_at)
);
create index reminder_completions_patient_date_idx on public.reminder_completions (patient_id, completed_at desc);

create or replace function private.has_role(target_user uuid, expected_role text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = target_user and p.role = expected_role)
$$;

create or replace function private.is_linked_caregiver(target_patient uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.caregiver_links l
    where l.caregiver_id = (select auth.uid()) and l.patient_id = target_patient and l.status = 'approved'
  )
$$;

create or replace function private.is_pending_caregiver(target_caregiver uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.caregiver_links l
    where l.caregiver_id = target_caregiver and l.patient_id = (select auth.uid()) and l.status = 'pending'
  )
$$;

create or replace function private.can_view_patient(target_patient uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) = target_patient or private.is_linked_caregiver(target_patient)
$$;

revoke all on function private.has_role(uuid, text) from public;
revoke all on function private.is_linked_caregiver(uuid) from public;
revoke all on function private.is_pending_caregiver(uuid) from public;
revoke all on function private.can_view_patient(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.has_role(uuid, text) to authenticated;
grant execute on function private.is_linked_caregiver(uuid) to authenticated;
grant execute on function private.is_pending_caregiver(uuid) to authenticated;
grant execute on function private.can_view_patient(uuid) to authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'patient');
  if requested_role not in ('patient', 'caregiver') then requested_role := 'patient'; end if;
  insert into public.profiles (id, role, display_name)
  values (new.id, requested_role, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.caregiver_links enable row level security;
alter table public.games enable row level security;
alter table public.sessions enable row level security;
alter table public.results enable row level security;
alter table public.difficulty_state enable row level security;
alter table public.reminders enable row level security;
alter table public.reminder_completions enable row level security;

revoke all on public.profiles, public.caregiver_links, public.games, public.sessions, public.results, public.difficulty_state, public.reminders, public.reminder_completions from anon, authenticated;
grant select, update (display_name) on public.profiles to authenticated;
grant select, insert, update on public.caregiver_links to authenticated;
grant select on public.games to authenticated;
grant select, insert, update on public.sessions to authenticated;
grant select, insert, update on public.results to authenticated;
grant select, insert, update on public.difficulty_state to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
grant select, insert on public.reminder_completions to authenticated;

create policy profiles_read_self_or_linked on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.is_linked_caregiver(id) or private.is_pending_caregiver(id));
create policy profiles_update_self_name on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy links_read_participant on public.caregiver_links for select to authenticated
using (caregiver_id = (select auth.uid()) or patient_id = (select auth.uid()));
create policy links_caregiver_request on public.caregiver_links for insert to authenticated
with check (caregiver_id = (select auth.uid()) and private.has_role((select auth.uid()), 'caregiver') and status = 'pending' and private.has_role(patient_id, 'patient'));
create policy links_patient_approve on public.caregiver_links for update to authenticated
using (patient_id = (select auth.uid()) and status = 'pending')
with check (patient_id = (select auth.uid()) and status in ('approved', 'revoked'));

create policy games_read_authenticated on public.games for select to authenticated using (active);

create policy sessions_read_owner_or_caregiver on public.sessions for select to authenticated
using (private.can_view_patient(user_id));
create policy sessions_insert_owner on public.sessions for insert to authenticated
with check (user_id = (select auth.uid()));
create policy sessions_update_owner on public.sessions for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy results_read_owner_or_caregiver on public.results for select to authenticated
using (private.can_view_patient(user_id));
create policy results_insert_owner_session on public.results for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.sessions s where s.id = session_id and s.user_id = (select auth.uid())));
create policy results_update_owner_session on public.results for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and exists (select 1 from public.sessions s where s.id = session_id and s.user_id = (select auth.uid())));

create policy difficulty_read_owner on public.difficulty_state for select to authenticated using (user_id = (select auth.uid()));
create policy difficulty_insert_owner on public.difficulty_state for insert to authenticated with check (user_id = (select auth.uid()));
create policy difficulty_update_owner on public.difficulty_state for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy reminders_read_participant on public.reminders for select to authenticated
using (caregiver_id = (select auth.uid()) or patient_id = (select auth.uid()) or private.is_linked_caregiver(patient_id));
create policy reminders_insert_caregiver on public.reminders for insert to authenticated
with check (caregiver_id = (select auth.uid()) and private.has_role((select auth.uid()), 'caregiver') and private.is_linked_caregiver(patient_id));
create policy reminders_update_caregiver on public.reminders for update to authenticated
using (caregiver_id = (select auth.uid())) with check (caregiver_id = (select auth.uid()));
create policy reminders_delete_caregiver on public.reminders for delete to authenticated using (caregiver_id = (select auth.uid()));

create policy reminder_completions_read_participant on public.reminder_completions for select to authenticated
using (patient_id = (select auth.uid()) or private.is_linked_caregiver(patient_id));
create policy reminder_completions_insert_patient on public.reminder_completions for insert to authenticated
with check (patient_id = (select auth.uid()) and exists (select 1 from public.reminders r where r.id = reminder_id and r.patient_id = (select auth.uid()) and r.active));
$baseline$;
  end if;
end
$setup$;

-- The historical cleanup removes legacy reminder tables. Never discard
-- reminders or completion records from an existing database.
do $guard$
begin
  if exists (select 1 from public.reminders)
     or exists (select 1 from public.reminder_completions) then
    raise exception 'Legacy reminder data exists. Stop and migrate or back it up before continuing.';
  end if;
end
$guard$;


-- ===== 20261110000100_care_profiles.sql =====

-- MindPlay Part R1: care profiles
--
-- A signed-in family member (or the person themselves) now manages one or
-- more "care profiles". The person who plays taps their profile on a tablet,
-- with no password of their own. Game results belong to a profile.
--
-- Safe to run more than once.

-- 1. Care profiles --------------------------------------------------------
create table if not exists public.care_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  -- 1 = standard, 2 = simpler, 3 = simplest (used from Part R2). These are
  -- interface settings, not a medical stage.
  support_level smallint not null default 1 check (support_level between 1 and 3),
  session_minutes smallint not null default 10 check (session_minutes between 3 and 30),
  language text not null default 'en' check (language in ('en', 'hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists care_profiles_owner_idx on public.care_profiles (owner_id, created_at);

alter table public.care_profiles enable row level security;
revoke all on public.care_profiles from anon, authenticated;
grant select, insert, delete on public.care_profiles to authenticated;
grant update (display_name, support_level, session_minutes, language, updated_at) on public.care_profiles to authenticated;

drop policy if exists care_profiles_owner_select on public.care_profiles;
drop policy if exists care_profiles_owner_insert on public.care_profiles;
drop policy if exists care_profiles_owner_update on public.care_profiles;
drop policy if exists care_profiles_owner_delete on public.care_profiles;
create policy care_profiles_owner_select on public.care_profiles for select to authenticated
  using (owner_id = (select auth.uid()));
create policy care_profiles_owner_insert on public.care_profiles for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy care_profiles_owner_update on public.care_profiles for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy care_profiles_owner_delete on public.care_profiles for delete to authenticated
  using (owner_id = (select auth.uid()));

-- 2. The exit PIN (a convenience lock, not strong security) -----------------
create table if not exists public.account_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pin_salt text,
  pin_hash text,
  updated_at timestamptz not null default now()
);

alter table public.account_settings enable row level security;
revoke all on public.account_settings from anon, authenticated;
grant select, insert, update, delete on public.account_settings to authenticated;

drop policy if exists account_settings_owner_select on public.account_settings;
drop policy if exists account_settings_owner_insert on public.account_settings;
drop policy if exists account_settings_owner_update on public.account_settings;
drop policy if exists account_settings_owner_delete on public.account_settings;
create policy account_settings_owner_select on public.account_settings for select to authenticated
  using (user_id = (select auth.uid()));
create policy account_settings_owner_insert on public.account_settings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy account_settings_owner_update on public.account_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy account_settings_owner_delete on public.account_settings for delete to authenticated
  using (user_id = (select auth.uid()));

-- 3. Game results belong to a care profile ---------------------------------
alter table public.sessions
  add column if not exists profile_id uuid references public.care_profiles(id) on delete cascade;
create index if not exists sessions_profile_completed_idx on public.sessions (profile_id, completed_at desc);

-- A session may only be saved by the account that owns the profile.
drop policy if exists sessions_insert_owner on public.sessions;
drop policy if exists sessions_update_owner on public.sessions;
create policy sessions_insert_owner on public.sessions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (profile_id is null or exists (
      select 1 from public.care_profiles c where c.id = profile_id and c.owner_id = (select auth.uid())
    ))
  );
create policy sessions_update_owner on public.sessions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (profile_id is null or exists (
      select 1 from public.care_profiles c where c.id = profile_id and c.owner_id = (select auth.uid())
    ))
  );

-- 4. The level each profile will start the next game at --------------------
create table if not exists public.profile_difficulty (
  profile_id uuid not null references public.care_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id),
  level smallint not null check (level between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (profile_id, game_id)
);

alter table public.profile_difficulty enable row level security;
revoke all on public.profile_difficulty from anon, authenticated;
grant select, insert, update on public.profile_difficulty to authenticated;

drop policy if exists profile_difficulty_owner_select on public.profile_difficulty;
drop policy if exists profile_difficulty_owner_insert on public.profile_difficulty;
drop policy if exists profile_difficulty_owner_update on public.profile_difficulty;
create policy profile_difficulty_owner_select on public.profile_difficulty for select to authenticated
  using (owner_id = (select auth.uid()));
create policy profile_difficulty_owner_insert on public.profile_difficulty for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.care_profiles c where c.id = profile_id and c.owner_id = (select auth.uid())));
create policy profile_difficulty_owner_update on public.profile_difficulty for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- 5. Move existing test data into a profile --------------------------------
-- Every account that chose "patient" or that already played gets one profile
-- named after them, and its earlier games are attached to it.
insert into public.care_profiles (owner_id, display_name)
select p.id, coalesce(nullif(btrim(p.display_name), ''), 'Me')
from public.profiles p
where (p.role = 'patient' or exists (select 1 from public.sessions s where s.user_id = p.id))
  and not exists (select 1 from public.care_profiles c where c.owner_id = p.id);

update public.sessions s
set profile_id = (
  select c.id from public.care_profiles c where c.owner_id = s.user_id order by c.created_at limit 1
)
where s.profile_id is null;

-- ===== 20261112000100_life_story.sql =====

-- MindPlay Parts R2-R4: Life Story (photos and names) and the "Who is this?" game
--
-- Safe to run more than once. Run it AFTER 20261110000100_care_profiles.sql.

-- 1. The new game must exist in the games table (results point to it) --------
insert into public.games (id, name) values ('who-is-this', 'Who is this?')
on conflict (id) do nothing;

-- 2. Photos and names ---------------------------------------------------------
create table if not exists public.memory_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.care_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'person' check (kind in ('person', 'place', 'thing')),
  label text not null check (char_length(btrim(label)) between 1 and 40),
  note text check (note is null or char_length(note) <= 80),
  photo_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists memory_items_profile_idx on public.memory_items (profile_id, created_at);

alter table public.memory_items enable row level security;
revoke all on public.memory_items from anon, authenticated;
grant select, insert, delete on public.memory_items to authenticated;
grant update (kind, label, note) on public.memory_items to authenticated;

drop policy if exists memory_items_owner_select on public.memory_items;
drop policy if exists memory_items_owner_insert on public.memory_items;
drop policy if exists memory_items_owner_update on public.memory_items;
drop policy if exists memory_items_owner_delete on public.memory_items;
create policy memory_items_owner_select on public.memory_items for select to authenticated
  using (owner_id = (select auth.uid()));
-- A photo may only be added to a person the account owns.
create policy memory_items_owner_insert on public.memory_items for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.care_profiles c where c.id = profile_id and c.owner_id = (select auth.uid()))
  );
create policy memory_items_owner_update on public.memory_items for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy memory_items_owner_delete on public.memory_items for delete to authenticated
  using (owner_id = (select auth.uid()));

-- 3. A PRIVATE storage bucket for the photos ------------------------------------
-- Nobody can open a photo without being signed in as its owner. Files are small
-- JPEGs (the app shrinks every photo before uploading), so the limit is 1 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('life-story', 'life-story', false, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];

-- Each account may only touch files inside its own folder: <account id>/<person id>/<photo id>.jpg
drop policy if exists life_story_owner_select on storage.objects;
drop policy if exists life_story_owner_insert on storage.objects;
drop policy if exists life_story_owner_update on storage.objects;
drop policy if exists life_story_owner_delete on storage.objects;
create policy life_story_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'life-story' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy life_story_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'life-story' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy life_story_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'life-story' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy life_story_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'life-story' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ===== 20261113000100_phase0_cleanup.sql =====

-- MindPlay Phase 0: clean-up and two new profile settings
--
-- 1. Drop the old, unused reminder tables. They were keyed to the old
--    patient-account model and nothing in the app uses them. Phase 1 adds
--    new reminder tables keyed by care profile.
-- 2. care_profiles.timezone: the person's time zone, so reminders fire at
--    their local time (Phase 1). Defaults to India.
-- 3. care_profiles.show_general_games: the four general games are hidden on
--    the tablet unless a carer switches them on.
--
-- Run after 20261112000100_life_story.sql. Safe to run more than once.

-- 1. Old reminder tables ------------------------------------------------------
-- No CASCADE: if anything unexpected still depends on these tables, this
-- stops with an error instead of silently dropping it. Their policies,
-- grants and indexes are removed together with the tables.
drop table if exists public.reminder_completions;
drop table if exists public.reminders;

-- 2. and 3. New profile settings ----------------------------------------------
alter table public.care_profiles
  add column if not exists timezone text not null default 'Asia/Kolkata'
    check (char_length(timezone) between 1 and 64);

alter table public.care_profiles
  add column if not exists show_general_games boolean not null default false;

-- Signed-in owners may change these two columns as well. RLS policies on
-- care_profiles are unchanged: owners still see and edit only their own rows.
grant update (display_name, support_level, session_minutes, language, timezone, show_general_games, updated_at)
  on public.care_profiles to authenticated;

-- ===== 20261114000100_reminders.sql =====

-- MindPlay Phase 1: the person's schedule (reminders) and what happened each time
--
-- 1. reminders: what the carer sets up (title, type, repeat rule, local times,
--    optional Life Story photo, what the tablet should say, waiting time).
--    Times are the person's LOCAL clock ("08:00"); the profile's time zone
--    (care_profiles.timezone) turns them into real moments.
-- 2. reminder_events: one row per reminder per due moment (done, later or
--    missed). unique(reminder_id, due_at) means a reminder can never be
--    recorded twice for the same moment, however often a device retries.
--
-- Owner-only, like memory_items. Run after 20261113000100_phase0_cleanup.sql.
-- Safe to run more than once.

-- 1. Reminders ----------------------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.care_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  kind text not null default 'other'
    check (kind in ('medicine', 'meal', 'water', 'activity', 'visit', 'appointment', 'other')),
  -- {"type":"daily"} | {"type":"weekdays","days":[1,3]} | {"type":"once","date":"2026-11-20"}
  repeat jsonb not null default '{"type":"daily"}'::jsonb
    check (jsonb_typeof(repeat) = 'object' and repeat ->> 'type' in ('daily', 'weekdays', 'once')),
  -- One to six local times, "HH:MM".
  times text[] not null
    check (
      cardinality(times) between 1 and 6
      and array_to_string(times, ',') ~ '^([01][0-9]|2[0-3]):[0-5][0-9](,([01][0-9]|2[0-3]):[0-5][0-9])*$'
    ),
  photo_item_id uuid references public.memory_items(id) on delete set null,
  speak_text text check (speak_text is null or char_length(speak_text) <= 200),
  grace_minutes smallint not null default 30 check (grace_minutes between 5 and 180),
  needs_confirmation boolean not null default false,
  -- Stopping a reminder keeps its history; it simply never appears again.
  active boolean not null default true,
  -- Times before this moment are never shown (edits apply from now on).
  active_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reminders_profile_idx on public.reminders (profile_id, created_at);

alter table public.reminders enable row level security;
revoke all on public.reminders from anon, authenticated;
grant select, insert, delete on public.reminders to authenticated;
grant update (title, kind, repeat, times, photo_item_id, speak_text, grace_minutes, needs_confirmation, active,
  active_from, updated_at) on public.reminders to authenticated;

drop policy if exists reminders_owner_select on public.reminders;
drop policy if exists reminders_owner_insert on public.reminders;
drop policy if exists reminders_owner_update on public.reminders;
drop policy if exists reminders_owner_delete on public.reminders;
create policy reminders_owner_select on public.reminders for select to authenticated
  using (owner_id = (select auth.uid()));
-- A reminder may only be added to a person the account owns, with one of that person's own photos.
create policy reminders_owner_insert on public.reminders for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.care_profiles c where c.id = profile_id and c.owner_id = (select auth.uid()))
    and (
      photo_item_id is null
      or exists (
        select 1 from public.memory_items m
        where m.id = photo_item_id and m.profile_id = reminders.profile_id and m.owner_id = (select auth.uid())
      )
    )
  );
create policy reminders_owner_update on public.reminders for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (
      photo_item_id is null
      or exists (
        select 1 from public.memory_items m
        where m.id = photo_item_id and m.profile_id = reminders.profile_id and m.owner_id = (select auth.uid())
      )
    )
  );
create policy reminders_owner_delete on public.reminders for delete to authenticated
  using (owner_id = (select auth.uid()));

-- 2. What happened each time --------------------------------------------------
create table if not exists public.reminder_events (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  profile_id uuid not null references public.care_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  due_at timestamptz not null,
  status text not null check (status in ('done', 'later', 'missed')),
  acted_by text check (acted_by is null or acted_by in ('patient', 'carer')),
  acted_at timestamptz not null default now(),
  snooze_until timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reminder_id, due_at)
);
create index if not exists reminder_events_profile_due_idx on public.reminder_events (profile_id, due_at);

alter table public.reminder_events enable row level security;
revoke all on public.reminder_events from anon, authenticated;
grant select, insert on public.reminder_events to authenticated;
-- Only the outcome can change; which reminder, person and moment it belongs to cannot.
grant update (status, acted_by, acted_at, snooze_until, confirmed_at) on public.reminder_events to authenticated;

drop policy if exists reminder_events_owner_select on public.reminder_events;
drop policy if exists reminder_events_owner_insert on public.reminder_events;
drop policy if exists reminder_events_owner_update on public.reminder_events;
create policy reminder_events_owner_select on public.reminder_events for select to authenticated
  using (owner_id = (select auth.uid()));
-- An event must belong to one of the account's own reminders, for that reminder's person.
create policy reminder_events_owner_insert on public.reminder_events for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.reminders r
      where r.id = reminder_id and r.profile_id = reminder_events.profile_id and r.owner_id = (select auth.uid())
    )
  );
create policy reminder_events_owner_update on public.reminder_events for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

commit;

