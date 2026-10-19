-- Run once in a new Supabase project, using the SQL editor.
create table public.workspaces (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 name text not null default 'My workspace' check(length(name) between 1 and 80),
 state jsonb not null default '{"boards":[],"tasks":[]}'::jsonb,
 revision bigint not null default 0,
 created_at timestamptz not null default now(),
 check(jsonb_typeof(state->'boards')='array' and jsonb_typeof(state->'tasks')='array'),
 check(octet_length(state::text) < 2000000)
);
create table public.workspace_members (
 workspace_id uuid references public.workspaces(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','member')),
 primary key(workspace_id,user_id)
);
create table public.workspace_invites (
 token uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 expires_at timestamptz not null default now()+interval '1 day',
 used_at timestamptz
);
create table public.ai_usage (
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null,
 requests integer not null
);
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.ai_usage enable row level security;

create function public.is_workspace_member(wid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.workspace_members where workspace_id=wid and user_id=auth.uid());
$$;
revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
create policy workspace_read on public.workspaces for select to authenticated using(public.is_workspace_member(id));
create policy workspace_write on public.workspaces for update to authenticated using(public.is_workspace_member(id)) with check(public.is_workspace_member(id));
create policy member_read on public.workspace_members for select to authenticated using(public.is_workspace_member(workspace_id));
revoke all on public.workspaces,public.workspace_members,public.workspace_invites,public.ai_usage from anon,authenticated;
grant select on public.workspaces,public.workspace_members to authenticated;
grant update(state,revision) on public.workspaces to authenticated;

create function public.ensure_workspace() returns uuid language plpgsql security definer set search_path='' as $$
declare wid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select workspace_id into wid from public.workspace_members where user_id=auth.uid() order by (role='owner') desc,workspace_id limit 1;
 if wid is null then
  insert into public.workspaces(owner_id) values(auth.uid()) returning id into wid;
  insert into public.workspace_members values(wid,auth.uid(),'owner');
 end if;
 return wid;
end $$;
create function public.list_workspace_members(wid uuid) returns table(id uuid,name text,email text,role text)
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_workspace_member(wid) then raise exception 'Access denied'; end if;
 return query select u.id,coalesce(nullif(u.raw_user_meta_data->>'name',''),split_part(u.email,'@',1)),u.email,m.role
 from public.workspace_members m join auth.users u on m.user_id=u.id where m.workspace_id=wid;
end $$;
create function public.create_workspace_invite(wid uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not exists(select 1 from public.workspaces where id=wid and owner_id=auth.uid()) then raise exception 'Only the owner can invite members'; end if;
 insert into public.workspace_invites(workspace_id) values(wid) returning token into result;
 return result;
end $$;
create function public.accept_workspace_invite(code uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.workspace_invites;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into invitation from public.workspace_invites where token=code and used_at is null and expires_at>now() for update;
 if not found then raise exception 'Invitation is invalid, expired, or already used'; end if;
 insert into public.workspace_members values(invitation.workspace_id,auth.uid(),'member') on conflict do nothing;
 update public.workspace_invites set used_at=now() where token=code;
 return invitation.workspace_id;
end $$;
create function public.consume_ai_quota() returns void language plpgsql security definer set search_path='' as $$
declare amount integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 insert into public.ai_usage values(auth.uid(),now(),1)
 on conflict(user_id) do update set
 requests=case when public.ai_usage.window_start<now()-interval '1 minute' then 1 else public.ai_usage.requests+1 end,
 window_start=case when public.ai_usage.window_start<now()-interval '1 minute' then now() else public.ai_usage.window_start end
 returning requests into amount;
 if amount>10 then raise exception 'Rate limit exceeded'; end if;
end $$;
revoke all on function public.ensure_workspace(),public.list_workspace_members(uuid),public.create_workspace_invite(uuid),public.accept_workspace_invite(uuid),public.consume_ai_quota() from public;
grant execute on function public.ensure_workspace(),public.list_workspace_members(uuid),public.create_workspace_invite(uuid),public.accept_workspace_invite(uuid),public.consume_ai_quota() to authenticated;
-- Realtime broadcasts still obey the SELECT policy.
alter publication supabase_realtime add table public.workspaces;
alter publication supabase_realtime add table public.workspace_members;
