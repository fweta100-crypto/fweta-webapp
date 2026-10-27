-- The app's source of truth is the JSON row in fweta_app_store.
-- fweta_load_store must return that blob. Building the store from
-- fweta_* tables drops fields the blob has, and a non-empty
-- fweta_profiles row would make older servers ignore the blob.
-- fweta_profiles is a mirror so accounts show up in the table editor.

create or replace function public.fweta_load_store()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select data from public.fweta_app_store where id = 'default'),
    '{}'::jsonb
  );
$$;

create or replace function public.fweta_sync_profiles_from_store()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from 'default' then
    return new;
  end if;

  delete from public.fweta_profiles;
  insert into public.fweta_profiles (
    id, email, password_hash, display_name, bio, avatar_url, roles, primary_role,
    notify_email, notify_withdrawals, notify_bookings, suspended, created_at, updated_at
  )
  select
    (p->>'id')::uuid,
    lower(p->>'email'),
    p->>'passwordHash',
    coalesce(nullif(p->>'displayName', ''), split_part(p->>'email', '@', 1)),
    coalesce(p->>'bio', ''),
    nullif(p->>'avatarUrl', ''),
    coalesce(
      (
        select array_agg(r)::user_role[]
        from jsonb_array_elements_text(coalesce(p->'roles', '[]'::jsonb)) r
      ),
      '{}'::user_role[]
    ),
    (p->>'primaryRole')::user_role,
    coalesce((p->>'notifyEmail')::boolean, true),
    coalesce((p->>'notifyWithdrawals')::boolean, true),
    coalesce((p->>'notifyBookings')::boolean, true),
    coalesce((p->>'suspended')::boolean, false),
    coalesce(nullif(p->>'createdAt', '')::timestamptz, now()),
    coalesce(nullif(p->>'updatedAt', '')::timestamptz, now())
  from jsonb_array_elements(coalesce(new.data->'profiles', '[]'::jsonb)) p
  where p->>'id' is not null
    and p->>'email' is not null
    and p->>'passwordHash' is not null
    and p->>'primaryRole' is not null;

  return new;
exception
  when others then
    raise warning 'fweta profile sync skipped: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists fweta_sync_profiles_from_store on public.fweta_app_store;
create trigger fweta_sync_profiles_from_store
after insert or update of data on public.fweta_app_store
for each row
execute function public.fweta_sync_profiles_from_store();

revoke all on function public.fweta_sync_profiles_from_store() from public, anon, authenticated;

-- Readable account list without password hashes.
create or replace view public.fweta_users
with (security_invoker = true) as
select
  id,
  email,
  display_name,
  roles,
  primary_role,
  suspended,
  created_at,
  updated_at
from public.fweta_profiles;

grant select on public.fweta_users to service_role;

-- Backfill from the blob already stored.
update public.fweta_app_store
set data = data
where id = 'default';
