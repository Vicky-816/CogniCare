-- RLS check for reminders and reminder_events. DEVELOPMENT PROJECT ONLY.
--
-- Paste into Supabase > SQL Editor > New query > Run. It creates two made-up
-- accounts (A and B) inside a transaction, checks that B cannot see or change
-- A's reminders, and then ROLLS BACK, so nothing is saved.
--   Passed: "Success. No rows returned".
--   Failed: an error starting with "FAIL:".

begin;

-- Two made-up accounts (the signup trigger also creates their public.profiles rows).
insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-8000-0000000000a1', 'rls-a@example.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000b1', 'rls-b@example.invalid', 'authenticated', 'authenticated');
insert into public.profiles (id, role)
values
  ('00000000-0000-4000-8000-0000000000a1', 'caregiver'),
  ('00000000-0000-4000-8000-0000000000b1', 'caregiver')
on conflict (id) do nothing;

insert into public.care_profiles (id, owner_id, display_name)
values
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000a1', 'Person of A'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b1', 'Person of B');

-- ---------------------------------------------------------------- as A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

do $$
begin
  insert into public.reminders (id, profile_id, owner_id, title, kind, times)
  values ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000a2',
          '00000000-0000-4000-8000-0000000000a1', 'Morning tablets', 'medicine', array['08:00']);
  insert into public.reminder_events (reminder_id, profile_id, owner_id, due_at, status, acted_by)
  values ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000a2',
          '00000000-0000-4000-8000-0000000000a1', '2026-11-14T02:30:00Z', 'done', 'patient');
  if (select count(*) from public.reminders) <> 1 then raise exception 'FAIL: A cannot see its own reminder'; end if;

  -- A cannot add a reminder to B's person.
  begin
    insert into public.reminders (profile_id, owner_id, title, times)
    values ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000a1', 'x', array['08:00']);
    raise exception 'FAIL: A added a reminder to B''s person';
  exception when insufficient_privilege then null;
  end;

  -- The same moment cannot be recorded twice.
  begin
    insert into public.reminder_events (reminder_id, profile_id, owner_id, due_at, status)
    values ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000a2',
            '00000000-0000-4000-8000-0000000000a1', '2026-11-14T02:30:00Z', 'missed');
    raise exception 'FAIL: the same moment was recorded twice';
  exception when unique_violation then null;
  end;
end $$;

-- ---------------------------------------------------------------- as B
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);

do $$
declare changed integer;
begin
  if (select count(*) from public.reminders) <> 0 then raise exception 'FAIL: B can see A''s reminders'; end if;
  if (select count(*) from public.reminder_events) <> 0 then raise exception 'FAIL: B can see A''s events'; end if;

  update public.reminders set title = 'changed by B' where id = '00000000-0000-4000-8000-0000000000a3';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL: B changed A''s reminder'; end if;

  update public.reminder_events set status = 'missed' where reminder_id = '00000000-0000-4000-8000-0000000000a3';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL: B changed A''s event'; end if;

  delete from public.reminders where id = '00000000-0000-4000-8000-0000000000a3';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL: B deleted A''s reminder'; end if;

  -- B cannot attach an event to A's reminder, even under B's own name.
  begin
    insert into public.reminder_events (reminder_id, profile_id, owner_id, due_at, status)
    values ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000b2',
            '00000000-0000-4000-8000-0000000000b1', '2026-11-15T02:30:00Z', 'done');
    raise exception 'FAIL: B added an event to A''s reminder';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------- signed out
reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.reminders;
    raise exception 'FAIL: signed-out visitors can read reminders';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
