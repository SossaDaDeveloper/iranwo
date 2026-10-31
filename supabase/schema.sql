create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles
  add column if not exists created_at timestamptz;

alter table public.user_profiles
  alter column created_at set default now();

alter table public.user_profiles enable row level security;

revoke all on public.user_profiles from anon, public;
grant select, insert, update on public.user_profiles to authenticated;

create table if not exists public.care_clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  access_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_staff (
  clinic_id uuid not null references public.care_clinics (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'staff' check (role in ('admin', 'staff', 'clinician')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

create table if not exists public.patient_clinic_access (
  patient_id uuid not null references auth.users (id) on delete cascade,
  clinic_id uuid not null references public.care_clinics (id) on delete cascade,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (patient_id, clinic_id)
);

create or replace function public.find_clinic_by_access_code(p_access_code text)
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select clinic.id, clinic.name
  from public.care_clinics as clinic
  where (select auth.uid()) is not null
    and nullif(btrim(p_access_code), '') is not null
    and clinic.access_code = btrim(p_access_code);
$$;

revoke all on function public.find_clinic_by_access_code(text) from public, anon;
grant execute on function public.find_clinic_by_access_code(text) to authenticated;

create or replace function public.get_my_clinic_grants()
returns table (
  clinic_id uuid,
  granted_at timestamptz,
  revoked_at timestamptz,
  clinic_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select access.clinic_id, access.granted_at, access.revoked_at, clinic.name
  from public.patient_clinic_access as access
  join public.care_clinics as clinic on clinic.id = access.clinic_id
  where access.patient_id = (select auth.uid());
$$;

revoke all on function public.get_my_clinic_grants() from public, anon;
grant execute on function public.get_my_clinic_grants() to authenticated;

create or replace function public.is_active_clinic_staff(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_staff staff
    where staff.clinic_id = target_clinic_id
      and staff.user_id = (select auth.uid())
      and staff.active
  );
$$;

revoke all on function public.is_active_clinic_staff(uuid) from public, anon;
grant execute on function public.is_active_clinic_staff(uuid) to authenticated;

alter table public.care_clinics enable row level security;
alter table public.clinic_staff enable row level security;
alter table public.patient_clinic_access enable row level security;

revoke all on public.care_clinics, public.clinic_staff, public.patient_clinic_access from anon, public;
revoke all on public.care_clinics, public.clinic_staff, public.patient_clinic_access from authenticated;
revoke select (id, name, access_code, created_at) on public.care_clinics from public, anon, authenticated;
grant select (id, name, created_at) on public.care_clinics to authenticated;
grant select on public.clinic_staff to authenticated;
grant select, insert, update on public.patient_clinic_access to authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'care_clinics'
  loop
    execute format('drop policy %I on public.care_clinics', existing_policy.policyname);
  end loop;
end;
$$;

create policy "Active clinic staff can read their clinic"
  on public.care_clinics for select to authenticated
  using (public.is_active_clinic_staff(id));

drop policy if exists "Staff can read their own clinic memberships" on public.clinic_staff;
create policy "Staff can read their own clinic memberships"
  on public.clinic_staff for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Patients and authorized clinic staff can read sharing grants" on public.patient_clinic_access;
create policy "Patients and authorized clinic staff can read sharing grants"
  on public.patient_clinic_access for select to authenticated
  using (
    (select auth.uid()) = patient_id
    or (
      revoked_at is null
      and public.is_active_clinic_staff(clinic_id)
    )
  );

drop policy if exists "Patients can grant clinic access to their own records" on public.patient_clinic_access;
create policy "Patients can grant clinic access to their own records"
  on public.patient_clinic_access for insert to authenticated
  with check ((select auth.uid()) = patient_id);

drop policy if exists "Patients can revoke clinic access to their own records" on public.patient_clinic_access;
create policy "Patients can revoke clinic access to their own records"
  on public.patient_clinic_access for update to authenticated
  using ((select auth.uid()) = patient_id)
  with check ((select auth.uid()) = patient_id);

drop policy if exists "Users can read their own profile" on public.user_profiles;
drop policy if exists "Authorized clinic staff can read shared patient profiles" on public.user_profiles;
drop policy if exists "Users and authorized clinic staff can read patient profiles" on public.user_profiles;
create policy "Users and authorized clinic staff can read patient profiles"
  on public.user_profiles for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.patient_clinic_access access
      where access.patient_id = user_profiles.user_id
        and access.revoked_at is null
        and public.is_active_clinic_staff(access.clinic_id)
    )
  );

drop policy if exists "Users can create their own profile" on public.user_profiles;
create policy "Users can create their own profile"
  on public.user_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile" on public.user_profiles;
create policy "Users can update their own profile"
  on public.user_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.patient_emergency_alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users (id) on delete cascade,
  clinic_id uuid not null references public.care_clinics (id) on delete cascade,
  reason text,
  status text not null default 'new' check (status in ('new', 'acknowledged', 'responding', 'resolved')),
  latitude double precision,
  longitude double precision,
  location_shared boolean not null default false,
  handled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (location_shared and latitude is not null and longitude is not null)
    or (not location_shared and latitude is null and longitude is null)
  ),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create index if not exists patient_emergency_alerts_clinic_created_idx
  on public.patient_emergency_alerts (clinic_id, created_at desc);
create index if not exists patient_emergency_alerts_patient_created_idx
  on public.patient_emergency_alerts (patient_id, created_at desc);

alter table public.patient_emergency_alerts enable row level security;
revoke all on public.patient_emergency_alerts from anon, public;
revoke all on public.patient_emergency_alerts from authenticated;
grant select, insert on public.patient_emergency_alerts to authenticated;

drop policy if exists "Patients and authorized clinics can read emergency alerts" on public.patient_emergency_alerts;
create policy "Patients and authorized clinics can read emergency alerts"
  on public.patient_emergency_alerts for select to authenticated
  using (
    (select auth.uid()) = patient_id
    or (
      public.is_active_clinic_staff(clinic_id)
      and exists (
        select 1 from public.patient_clinic_access access
        where access.patient_id = patient_emergency_alerts.patient_id
          and access.clinic_id = patient_emergency_alerts.clinic_id
          and access.revoked_at is null
      )
    )
  );

drop policy if exists "Patients can create emergency alerts for clinics they shared with" on public.patient_emergency_alerts;
create policy "Patients can create emergency alerts for clinics they shared with"
  on public.patient_emergency_alerts for insert to authenticated
  with check (
    (select auth.uid()) = patient_id
    and status = 'new'
    and handled_by is null
    and exists (
      select 1 from public.patient_clinic_access access
      where access.patient_id = patient_emergency_alerts.patient_id
        and access.clinic_id = patient_emergency_alerts.clinic_id
        and access.revoked_at is null
    )
  );

drop policy if exists "Clinic staff can update alerts for patients who shared access" on public.patient_emergency_alerts;

create table if not exists public.emergency_response_history (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.patient_emergency_alerts (id) on delete cascade,
  clinic_id uuid not null references public.care_clinics (id) on delete cascade,
  staff_user_id uuid not null references auth.users (id) on delete restrict,
  status text check (status in ('acknowledged', 'responding', 'resolved')),
  action text not null,
  created_at timestamptz not null default now()
);

alter table public.emergency_response_history
  add column if not exists status text check (status in ('acknowledged', 'responding', 'resolved'));

create index if not exists emergency_response_history_clinic_created_idx
  on public.emergency_response_history (clinic_id, created_at desc);

alter table public.emergency_response_history enable row level security;
revoke all on public.emergency_response_history from anon, public;
revoke all on public.emergency_response_history from authenticated;
grant select on public.emergency_response_history to authenticated;

drop policy if exists "Authorized users can read emergency response history" on public.emergency_response_history;
create policy "Authorized users can read emergency response history"
  on public.emergency_response_history for select to authenticated
  using (
    (
      public.is_active_clinic_staff(clinic_id)
      and exists (
        select 1
        from public.patient_emergency_alerts alert
        join public.patient_clinic_access access
          on access.patient_id = alert.patient_id
         and access.clinic_id = alert.clinic_id
         and access.revoked_at is null
        where alert.id = emergency_response_history.alert_id
          and alert.clinic_id = emergency_response_history.clinic_id
      )
    )
    or exists (
      select 1 from public.patient_emergency_alerts alert
      where alert.id = emergency_response_history.alert_id
        and alert.patient_id = (select auth.uid())
    )
  );

create or replace function public.respond_to_emergency_alert(
  p_alert_id uuid,
  p_status text,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.patient_emergency_alerts%rowtype;
begin
  if p_status not in ('acknowledged', 'responding', 'resolved') then
    raise exception 'Invalid emergency alert status';
  end if;
  if length(trim(coalesce(p_action, ''))) = 0 then
    raise exception 'A response action is required';
  end if;

  select * into target
  from public.patient_emergency_alerts alert
  where alert.id = p_alert_id
    and public.is_active_clinic_staff(alert.clinic_id)
    and exists (
      select 1 from public.patient_clinic_access access
      where access.patient_id = alert.patient_id
        and access.clinic_id = alert.clinic_id
        and access.revoked_at is null
    )
  for update;

  if not found then
    raise exception 'Alert not found or clinic access is no longer authorized';
  end if;
  if target.status = 'resolved' then
    raise exception 'Resolved alerts cannot be changed';
  end if;

  update public.patient_emergency_alerts
  set status = p_status,
      handled_by = (select auth.uid()),
      updated_at = now()
  where id = target.id;

  insert into public.emergency_response_history (alert_id, clinic_id, staff_user_id, status, action)
  values (target.id, target.clinic_id, (select auth.uid()), p_status, trim(p_action));
end;
$$;

revoke all on function public.respond_to_emergency_alert(uuid, text, text) from public;
grant execute on function public.respond_to_emergency_alert(uuid, text, text) to authenticated;
