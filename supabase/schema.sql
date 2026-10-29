-- Kim Solar optional shared workspace backend, PostgreSQL / Supabase.
-- Run in Supabase SQL Editor as the project administrator.
-- This file contains no user data, credentials, keys or accounts.

create table if not exists public.ks_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.ks_members (
  workspace_id uuid not null references public.ks_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'sales', 'technician', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists ks_members_user_idx on public.ks_members(user_id);

create table if not exists public.ks_workspace_state (
  workspace_id uuid primary key references public.ks_workspaces(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.ks_sync_audit (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.ks_workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  revision bigint not null,
  occurred_at timestamptz not null default now()
);

-- SECURITY DEFINER helper avoids membership-policy recursion. A caller can only
-- ask whether their own authenticated identity belongs to a workspace.
create or replace function public.ks_has_workspace_access(p_workspace uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.ks_members m
    where m.workspace_id = p_workspace and m.user_id = auth.uid()
  );
$$;

alter table public.ks_workspaces enable row level security;
alter table public.ks_members enable row level security;
alter table public.ks_workspace_state enable row level security;
alter table public.ks_sync_audit enable row level security;

drop policy if exists ks_workspaces_read on public.ks_workspaces;
create policy ks_workspaces_read on public.ks_workspaces
for select to authenticated using (public.ks_has_workspace_access(id));

drop policy if exists ks_members_read on public.ks_members;
create policy ks_members_read on public.ks_members
for select to authenticated using (user_id = auth.uid());

drop policy if exists ks_workspace_state_read on public.ks_workspace_state;
create policy ks_workspace_state_read on public.ks_workspace_state
for select to authenticated using (public.ks_has_workspace_access(workspace_id));

drop policy if exists ks_sync_audit_read on public.ks_sync_audit;
create policy ks_sync_audit_read on public.ks_sync_audit
for select to authenticated using (public.ks_has_workspace_access(workspace_id));

-- No client INSERT/UPDATE/DELETE policies or grants: mutations go through the
-- authenticated RPCs below. Membership administration stays in SQL Editor.
revoke all on public.ks_workspaces, public.ks_members, public.ks_workspace_state, public.ks_sync_audit from anon, authenticated;
grant select on public.ks_workspaces, public.ks_members, public.ks_workspace_state, public.ks_sync_audit to authenticated;

create or replace function public.ks_create_workspace(p_name text)
returns table (workspace_id uuid, revision bigint)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_workspace uuid;
begin
  if v_user is null then raise exception 'KS_FORBIDDEN'; end if;
  if p_name is null or char_length(btrim(p_name)) < 1 or char_length(btrim(p_name)) > 120 then
    raise exception 'KS_INVALID_DATA';
  end if;
  insert into public.ks_workspaces(name, owner_id)
  values (btrim(p_name), v_user) returning id into v_workspace;
  insert into public.ks_members(workspace_id, user_id, role)
  values (v_workspace, v_user, 'admin');
  insert into public.ks_workspace_state(workspace_id, updated_by)
  values (v_workspace, v_user);
  return query select v_workspace, 0::bigint;
end;
$$;

create or replace function public.ks_save_workspace(p_workspace uuid, p_expected bigint, p_data jsonb)
returns table (revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_current public.ks_workspace_state%rowtype;
  v_key text;
  v_revision bigint;
  v_updated timestamptz;
begin
  if v_user is null then raise exception 'KS_FORBIDDEN'; end if;
  select m.role into v_role from public.ks_members m
  where m.workspace_id = p_workspace and m.user_id = v_user;
  if v_role is null or v_role not in ('admin', 'sales', 'technician') then
    raise exception 'KS_FORBIDDEN';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 10485760 then
    raise exception 'KS_INVALID_DATA';
  end if;
  foreach v_key in array array['customers', 'products', 'plans', 'quotes', 'tickets', 'tasks'] loop
    if jsonb_typeof(p_data -> v_key) is distinct from 'array' then raise exception 'KS_INVALID_DATA'; end if;
  end loop;
  if jsonb_typeof(p_data -> 'settings') is distinct from 'object' then raise exception 'KS_INVALID_DATA'; end if;

  -- Lock the row, then compare the caller's observed revision. Two clients that
  -- observed the same revision cannot silently overwrite each other.
  select s.* into v_current from public.ks_workspace_state s
  where s.workspace_id = p_workspace for update;
  if not found then raise exception 'KS_FORBIDDEN'; end if;
  if p_expected is null or p_expected <> v_current.revision then
    raise exception 'KS_REVISION_CONFLICT';
  end if;

  -- A custom client cannot use the RPC to bypass catalog/settings permissions.
  if v_role <> 'admin' and (
      (p_data -> 'products') is distinct from (v_current.data -> 'products')
      or (p_data -> 'settings') is distinct from (v_current.data -> 'settings')
  ) then raise exception 'KS_FORBIDDEN'; end if;

  update public.ks_workspace_state s
  set data = p_data, revision = s.revision + 1, updated_at = now(), updated_by = v_user
  where s.workspace_id = p_workspace
  returning s.revision, s.updated_at into v_revision, v_updated;
  insert into public.ks_sync_audit(workspace_id, user_id, revision)
  values (p_workspace, v_user, v_revision);
  return query select v_revision, v_updated;
end;
$$;

-- PUBLIC has EXECUTE by default on new PostgreSQL functions; remove it explicitly.
revoke all on function public.ks_has_workspace_access(uuid) from public, anon, authenticated;
revoke all on function public.ks_create_workspace(text) from public, anon, authenticated;
revoke all on function public.ks_save_workspace(uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.ks_has_workspace_access(uuid) to authenticated;
grant execute on function public.ks_create_workspace(text) to authenticated;
grant execute on function public.ks_save_workspace(uuid, bigint, jsonb) to authenticated;

-- Recommended Supabase dashboard settings:
-- * Email Auth enabled; restrict account creation to your organization's policy.
-- * Never expose service_role / sb_secret_* credentials to the frontend.
-- * Require confirmed emails and suitable password/MFA policies for live use.
-- * Configure allowed site URLs for the deployed app in Auth URL Configuration.
