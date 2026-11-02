create table public.user_access (
 id uuid primary key default gen_random_uuid(),
 email text not null unique check(email=lower(trim(email)) and length(email)<=254),
 display_name text not null check(length(trim(display_name)) between 2 and 100),
 role text not null check(role in ('admin','customer')),
 user_id uuid unique references public.profiles(id),
 created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 claimed_at timestamptz
);
alter table public.user_access enable row level security;
revoke all on public.user_access from anon,authenticated;
grant select on public.user_access to authenticated;
create policy user_access_admin_read on public.user_access for select to authenticated using(public.is_admin());
create trigger audit_user_access after insert or update or delete on public.user_access for each row execute function public.log_change();
-- Inventário inicial: nenhum nível ou senha existente é alterado.
insert into public.user_access(email,display_name,role,user_id,claimed_at)
select lower(trim(u.email)),case when length(trim(p.display_name))>=2 then p.display_name else 'Usuário existente' end,p.role,p.id,now()
from auth.users u join public.profiles p on p.id=u.id where u.email is not null;

create function public.save_user_access(p_email text,p_name text,p_role text) returns void
language plpgsql security definer set search_path='' as $$
declare target uuid; verified boolean;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 if p_email is null or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_email)>254
 or p_name is null or length(trim(p_name)) not between 2 and 100 or p_role is null or p_role not in ('admin','customer') then raise exception 'INVALID_ACCESS'; end if;
 lock table public.user_access in share row exclusive mode;
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 select id,email_confirmed_at is not null into target,verified from auth.users where lower(email)=lower(trim(p_email));
 if target=auth.uid() and p_role<>'admin' then raise exception 'SELF_DEMOTION'; end if;
 if p_role<>'admin' and exists(select 1 from public.profiles where id=target and role='admin')
 and (select count(*) from public.profiles where role='admin')<=1 then raise exception 'LAST_ADMIN'; end if;
 insert into public.user_access(email,display_name,role,user_id,created_by,claimed_at)
 values(lower(trim(p_email)),trim(p_name),p_role,case when verified then target end,auth.uid(),case when verified then now() end)
 on conflict(email) do update set display_name=excluded.display_name,role=excluded.role,user_id=excluded.user_id,claimed_at=excluded.claimed_at;
 if verified then update public.profiles set role=p_role,display_name=trim(p_name) where id=target; end if;
end $$;

-- Atribuição única somente após comprovar a posse do e-mail no Supabase Auth.
create function public.claim_user_access() returns void language plpgsql security definer set search_path='' as $$
declare access public.user_access; verified_email text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then return; end if;
 select * into access from public.user_access where email=verified_email and claimed_at is null for update;
 if access.id is null then return; end if;
 update public.profiles set role=access.role,display_name=access.display_name where id=auth.uid();
 update public.user_access set user_id=auth.uid(),claimed_at=now() where id=access.id;
end $$;
create function public.remove_pending_access(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 delete from public.user_access where id=p_id and claimed_at is null;
 if not found then raise exception 'ACCESS_ALREADY_ACTIVE'; end if;
end $$;
revoke all on function public.save_user_access(text,text,text),public.claim_user_access(),public.remove_pending_access(uuid) from public,anon,authenticated;
grant execute on function public.save_user_access(text,text,text),public.claim_user_access(),public.remove_pending_access(uuid) to authenticated;
