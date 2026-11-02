-- AUTO-ESTILO: implantação inicial pelo SQL Editor do Supabase.
-- Projeto de destino: dymlojijgvgvwcpxfqai.
-- Execute somente no projeto correto, ainda sem as tabelas da aplicação.
-- Transação única: qualquer erro reverte esta implantação.
begin;
do $$ begin
    if to_regclass('public.profiles') is not null
       or to_regclass('public.services') is not null
       or to_regclass('public.appointments') is not null then
      raise exception 'Implantação inicial interrompida: já existem tabelas da aplicação. Use migrations incrementais.';
    end if;
  end $$;

-- Migration: 202610250001_schema.sql

create extension if not exists btree_gist;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (length(display_name) <= 100),
 role text not null default 'customer' check (role in ('customer','admin')),
 created_at timestamptz not null default now()
);
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin')
 and (not exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified') or auth.jwt()->>'aal'='aal2');
$$;
create table public.customers (
 id uuid primary key default gen_random_uuid(), profile_id uuid unique references public.profiles(id) on delete set null,
 name text not null check (length(name) between 1 and 100), phone text check (phone ~ '^[0-9+ ()-]{8,20}$'),
 privacy_accepted_at timestamptz, created_at timestamptz not null default now()
);
create table public.professionals (id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 100), active boolean not null default true, created_at timestamptz not null default now());
create table public.services (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120), description text not null default '' check(length(description)<=2000),
 price_cents integer check(price_cents between 0 and 10000000), duration_minutes integer check(duration_minutes between 5 and 720),
 status text not null default 'coming_soon' check(status in ('active','coming_soon','hidden')),
 image_path text, category text not null default 'Estilo & cuidado', sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table public.professional_services (professional_id uuid references public.professionals on delete cascade, service_id uuid references public.services on delete cascade, primary key(professional_id,service_id));
create table public.business_settings (
 id boolean primary key default true check(id), booking_enabled boolean not null default false,
 min_notice_minutes integer check(min_notice_minutes between 0 and 43200), max_booking_days integer check(max_booking_days between 1 and 365), cancellation_notice_minutes integer check(cancellation_notice_minutes between 0 and 43200),
 retention_days integer check(retention_days between 1 and 36500),
 address text not null default 'Rua Santa Rita, nº 307, Centro, Muriaé – MG', whatsapp text not null default '553298553119' check(whatsapp ~ '^[0-9]{10,15}$'),
 story text not null default '', photo_path text,
 check(not booking_enabled or (min_notice_minutes is not null and max_booking_days is not null and cancellation_notice_minutes is not null))
);
create table public.business_hours (
 id uuid primary key default gen_random_uuid(), professional_id uuid not null references public.professionals on delete cascade,
 weekday integer not null check(weekday between 0 and 6), opens_at time not null, closes_at time not null, check(opens_at<closes_at),
 unique(professional_id,weekday,opens_at)
);
create table public.schedule_exceptions (
 id uuid primary key default gen_random_uuid(), professional_id uuid not null references public.professionals on delete cascade,
 day date not null, closed boolean not null default true, opens_at time, closes_at time,
 check((closed and opens_at is null and closes_at is null) or (not closed and opens_at is not null and closes_at is not null and opens_at<closes_at))
);
create index exceptions_day on public.schedule_exceptions(professional_id,day);
create table public.appointments (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers, professional_id uuid not null references public.professionals,
 service_id uuid not null references public.services, starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'scheduled' check(status in ('scheduled','completed','cancelled','no_show')),
 price_cents integer not null check(price_cents>=0), created_by uuid references public.profiles on delete set null,
 created_at timestamptz not null default now(), check(starts_at<ends_at)
);
create index appointments_customer on public.appointments(customer_id,starts_at);
create index appointments_professional on public.appointments(professional_id,starts_at);
create table public.schedule_blocks (
 id uuid primary key default gen_random_uuid(), professional_id uuid not null references public.professionals,
 starts_at timestamptz not null, ends_at timestamptz not null, reason text check(length(reason)<=500), recurrence_group uuid,
 created_by uuid references public.profiles on delete set null, created_at timestamptz not null default now(), check(starts_at<ends_at)
);
-- Uma única exclusão protege reservas E bloqueios, inclusive entre tabelas diferentes.
create table public.schedule_occupancy (
 id uuid primary key, professional_id uuid not null references public.professionals,
 period tstzrange not null, kind text not null check(kind in ('appointment','block')),
 exclude using gist (professional_id with =, period with &&)
);
create table public.appointment_events (
 id uuid primary key default gen_random_uuid(), appointment_id uuid not null references public.appointments,
 actor_id uuid references public.profiles on delete set null, old_start timestamptz, new_start timestamptz,
 old_status text, new_status text not null, reason text, created_at timestamptz not null default now()
);
create table public.loyalty_rules (
 id uuid primary key default gen_random_uuid(), service_id uuid unique references public.services,
 points integer not null check(points>0), active boolean not null default false, expires_after_days integer check(expires_after_days>0)
);
create table public.loyalty_rewards (id uuid primary key default gen_random_uuid(), name text not null, cost integer not null check(cost>0), active boolean not null default false);
create table public.reward_redemptions (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers, reward_id uuid not null references public.loyalty_rewards,
 operation_id uuid not null unique, created_by uuid references public.profiles on delete set null, created_at timestamptz not null default now()
);
create table public.loyalty_transactions (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers,
 appointment_id uuid references public.appointments, redemption_id uuid references public.reward_redemptions,
 points integer not null check(points<>0), expires_at timestamptz, actor_id uuid references public.profiles on delete set null,
 operation_id uuid not null unique, reason text not null, created_at timestamptz not null default now(),
 unique(appointment_id), check((points>0 and appointment_id is not null and redemption_id is null) or (points<0 and redemption_id is not null and appointment_id is null))
);
create index loyalty_customer on public.loyalty_transactions(customer_id);
create table public.service_interest (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles on delete cascade,
 service_id uuid not null references public.services, consent_at timestamptz not null default now(), unique(profile_id,service_id)
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles on delete cascade,
 appointment_id uuid references public.appointments, kind text not null,
 status text not null default 'pending_provider' check(status in ('pending_provider','sent','failed')),
 created_at timestamptz not null default now()
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles on delete set null,
 entity text not null, entity_id uuid, action text not null, created_at timestamptz not null default now()
);
create table public.rate_limits (actor_id uuid primary key references public.profiles on delete cascade, window_start timestamptz not null, hits integer not null);
create table public.privacy_requests (id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles on delete cascade, kind text not null check(kind in ('access','deletion')), status text not null default 'pending' check(status in ('pending','processed')), created_at timestamptz not null default now());

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'name',''),100));
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.sync_occupancy() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then delete from public.schedule_occupancy where id=old.id; return old; end if;
 if tg_table_name='appointments' then
   if new.status='cancelled' then delete from public.schedule_occupancy where id=new.id; return new; end if;
 end if;
 insert into public.schedule_occupancy(id,professional_id,period,kind)
 values(new.id,new.professional_id,tstzrange(new.starts_at,new.ends_at,'[)'),case when tg_table_name='appointments' then 'appointment' else 'block' end)
 on conflict(id) do update set professional_id=excluded.professional_id,period=excluded.period;
 return new;
end $$;
create trigger appointments_occupancy after insert or update or delete on public.appointments for each row execute function public.sync_occupancy();
create trigger blocks_occupancy after insert or update or delete on public.schedule_blocks for each row execute function public.sync_occupancy();

create function public.log_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_logs(actor_id,entity,entity_id,action) values(auth.uid(),tg_table_name,case when tg_table_name='business_settings' then null else (coalesce(to_jsonb(new),to_jsonb(old))->>'id')::uuid end,tg_op);
 return coalesce(new,old);
end $$;
do $$ declare t text; begin
 foreach t in array array['services','professionals','business_hours','schedule_exceptions','schedule_blocks','business_settings','loyalty_rules','loyalty_rewards','loyalty_transactions','reward_redemptions','customers','appointments','profiles'] loop
 execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.log_change()',t);
 end loop;
end $$;

-- Nenhuma escrita direta em reservas, pontos ou perfis: somente RPCs validadas.
do $$ declare t text; begin
 foreach t in array array['profiles','customers','professionals','services','professional_services','business_settings','business_hours','schedule_exceptions','appointments','schedule_blocks','schedule_occupancy','appointment_events','loyalty_rules','loyalty_rewards','reward_redemptions','loyalty_transactions','service_interest','notifications','audit_logs','rate_limits','privacy_requests'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
grant select on public.services,public.professionals,public.professional_services,public.business_settings,public.business_hours to anon,authenticated;
create policy catalog_read on public.services for select using(status<>'hidden' or public.is_admin());
create policy professional_read on public.professionals for select using(active or public.is_admin());
create policy links_read on public.professional_services for select using(true);
create policy settings_read on public.business_settings for select using(true);
create policy hours_read on public.business_hours for select using(true);
grant select on public.profiles,public.customers,public.appointments,public.appointment_events,public.loyalty_transactions,public.loyalty_rewards,public.loyalty_rules,public.reward_redemptions,public.service_interest,public.notifications,public.privacy_requests to authenticated;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy customer_read on public.customers for select to authenticated using(profile_id=auth.uid() or public.is_admin());
create policy appointment_read on public.appointments for select to authenticated using(public.is_admin() or customer_id in(select id from public.customers where profile_id=auth.uid()));
create policy event_read on public.appointment_events for select to authenticated using(public.is_admin() or appointment_id in(select id from public.appointments));
create policy points_read on public.loyalty_transactions for select to authenticated using(public.is_admin() or customer_id in(select id from public.customers where profile_id=auth.uid()));
create policy redemption_read on public.reward_redemptions for select to authenticated using(public.is_admin() or customer_id in(select id from public.customers where profile_id=auth.uid()));
create policy reward_read on public.loyalty_rewards for select to authenticated using(active or public.is_admin());
create policy rule_read on public.loyalty_rules for select to authenticated using(public.is_admin());
create policy interest_read on public.service_interest for select to authenticated using(profile_id=auth.uid() or public.is_admin());
create policy notification_read on public.notifications for select to authenticated using(profile_id=auth.uid() or public.is_admin());
create policy privacy_read on public.privacy_requests for select to authenticated using(profile_id=auth.uid() or public.is_admin());
grant insert on public.service_interest,public.privacy_requests to authenticated;
create policy interest_insert on public.service_interest for insert to authenticated with check(profile_id=auth.uid() and exists(select 1 from public.services where id=service_id and status='coming_soon'));
create policy privacy_insert on public.privacy_requests for insert to authenticated with check(profile_id=auth.uid() and status='pending');
do $$ declare t text; begin
 foreach t in array array['services','professionals','professional_services','business_hours','schedule_exceptions','business_settings','loyalty_rules','loyalty_rewards'] loop
 execute format('grant insert,update,delete on public.%I to authenticated',t);
 execute format('create policy admin_write on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
 end loop;
 foreach t in array array['schedule_blocks','audit_logs'] loop
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy admin_read on public.%I for select to authenticated using(public.is_admin())',t);
 end loop;
end $$;


-- Migration: 202610250002_scheduling.sql

create function public.consume_rate_limit() returns void language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.rate_limits(actor_id,window_start,hits) values(auth.uid(),now(),1)
 on conflict(actor_id) do update set hits=case when public.rate_limits.window_start<now()-interval '1 minute' then 1 else public.rate_limits.hits+1 end,
 window_start=case when public.rate_limits.window_start<now()-interval '1 minute' then now() else public.rate_limits.window_start end returning hits into n;
 if n>20 then raise exception 'RATE_LIMIT'; end if;
end $$;

create function public.save_customer(p_name text,p_phone text,p_consent boolean,p_customer uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform public.consume_rate_limit();
 if length(trim(p_name)) not between 1 and 100 or not p_consent then raise exception 'INVALID_PROFILE'; end if;
 if p_customer is not null then
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.customers set name=trim(p_name),phone=nullif(p_phone,'') where id=p_customer returning id into result;
 else
  insert into public.customers(profile_id,name,phone,privacy_accepted_at) values(auth.uid(),trim(p_name),nullif(p_phone,''),now())
  on conflict(profile_id) do update set name=excluded.name,phone=excluded.phone,privacy_accepted_at=coalesce(public.customers.privacy_accepted_at,now()) returning id into result;
  update public.profiles set display_name=trim(p_name) where id=auth.uid();
 end if;
 return result;
end $$;
create function public.admin_create_customer(p_name text,p_phone text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 insert into public.customers(name,phone) values(trim(p_name),nullif(p_phone,'')) returning id into result;
 return result;
end $$;

create function public.available_slots(p_service uuid,p_professional uuid,p_day date,p_exclude uuid default null)
returns table(starts_at timestamptz) language plpgsql stable security definer set search_path='' as $$
declare svc public.services; cfg public.business_settings;
begin
 select * into svc from public.services where id=p_service and status='active';
 select * into cfg from public.business_settings;
 if svc.duration_minutes is null or svc.price_cents is null or not coalesce(cfg.booking_enabled,false) then return; end if;
 if p_day<(now() at time zone 'America/Sao_Paulo')::date or p_day>(now() at time zone 'America/Sao_Paulo')::date+cfg.max_booking_days then return; end if;
 if not exists(select 1 from public.professionals p join public.professional_services ps on ps.professional_id=p.id where p.id=p_professional and p.active and ps.service_id=p_service) then return; end if;
 if p_exclude is not null and not exists(select 1 from public.appointments a join public.customers c on c.id=a.customer_id where a.id=p_exclude and (c.profile_id=auth.uid() or public.is_admin())) then raise exception 'FORBIDDEN'; end if;
 return query
 with windows as (
  select e.opens_at,e.closes_at from public.schedule_exceptions e where e.professional_id=p_professional and e.day=p_day and not e.closed
  union all
  select h.opens_at,h.closes_at from public.business_hours h where h.professional_id=p_professional and h.weekday=extract(dow from p_day)::integer
  and not exists(select 1 from public.schedule_exceptions e where e.professional_id=p_professional and e.day=p_day)
 ), candidates as (
  select generate_series((p_day+w.opens_at) at time zone 'America/Sao_Paulo', (p_day+w.closes_at) at time zone 'America/Sao_Paulo'-make_interval(mins=>svc.duration_minutes),interval '5 minutes') as slot from windows w
 ) select distinct slot from candidates where slot>=now()+make_interval(mins=>cfg.min_notice_minutes)
 and not exists(select 1 from public.schedule_occupancy o where o.professional_id=p_professional and (p_exclude is null or o.id<>p_exclude) and o.period && tstzrange(slot,slot+make_interval(mins=>svc.duration_minutes),'[)')) order by slot;
end $$;

create function public.book_appointment(p_service uuid,p_professional uuid,p_start timestamptz,p_customer uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid; svc public.services; result uuid;
begin
 perform public.consume_rate_limit();
 if p_customer is not null then
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if; c:=p_customer;
 else select id into c from public.customers where profile_id=auth.uid() and privacy_accepted_at is not null; end if;
 if c is null then raise exception 'PROFILE_REQUIRED'; end if;
 -- Serializa alterações de agenda do mesmo profissional; exclusão GiST é a última defesa.
 perform 1 from public.professionals where id=p_professional for update;
 if not exists(select 1 from public.available_slots(p_service,p_professional,(p_start at time zone 'America/Sao_Paulo')::date) s where s.starts_at=p_start) then raise exception 'SLOT_UNAVAILABLE'; end if;
 if not public.is_admin() and (select count(*) from public.appointments where customer_id=c and status='scheduled' and starts_at>now())>=5 then raise exception 'BOOKING_LIMIT'; end if;
 select * into svc from public.services where id=p_service;
 insert into public.appointments(customer_id,professional_id,service_id,starts_at,ends_at,price_cents,created_by)
 values(c,p_professional,p_service,p_start,p_start+make_interval(mins=>svc.duration_minutes),svc.price_cents,auth.uid()) returning id into result;
 insert into public.appointment_events(appointment_id,actor_id,new_start,new_status) values(result,auth.uid(),p_start,'scheduled');
 insert into public.notifications(profile_id,appointment_id,kind) select profile_id,result,'confirmation' from public.customers where id=c;
 return result;
end $$;

create function public.change_appointment(p_id uuid,p_action text,p_start timestamptz default null,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare a public.appointments; cfg public.business_settings; next_status text;
begin
 perform public.consume_rate_limit();
 select * into a from public.appointments where id=p_id for update;
 if a.id is null or not (public.is_admin() or exists(select 1 from public.customers where id=a.customer_id and profile_id=auth.uid())) then raise exception 'FORBIDDEN'; end if;
 if a.status<>'scheduled' then raise exception 'INVALID_STATUS'; end if;
 select * into cfg from public.business_settings;
 if not public.is_admin() and (cfg.cancellation_notice_minutes is null or a.starts_at<=now()+make_interval(mins=>cfg.cancellation_notice_minutes)) then raise exception 'POLICY_LIMIT'; end if;
 if p_action='reschedule' then
  perform 1 from public.professionals where id=a.professional_id for update;
  if p_start is null or not exists(select 1 from public.available_slots(a.service_id,a.professional_id,(p_start at time zone 'America/Sao_Paulo')::date,p_id) s where s.starts_at=p_start) then raise exception 'SLOT_UNAVAILABLE'; end if;
  update public.appointments set starts_at=p_start,ends_at=p_start+make_interval(mins=>(select duration_minutes from public.services where id=a.service_id)) where id=p_id;
  next_status:='scheduled';
 elsif p_action in ('cancelled','completed','no_show') then
  if p_action<>'cancelled' and not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_action in ('completed','no_show') and a.ends_at>now() then raise exception 'APPOINTMENT_NOT_FINISHED'; end if;
  next_status:=p_action;
  update public.appointments set status=p_action where id=p_id;
 else raise exception 'INVALID_ACTION'; end if;
 insert into public.appointment_events(appointment_id,actor_id,old_start,new_start,old_status,new_status,reason) values(p_id,auth.uid(),a.starts_at,coalesce(p_start,a.starts_at),a.status,next_status,left(p_reason,500));
 insert into public.notifications(profile_id,appointment_id,kind) select profile_id,p_id,p_action from public.customers where id=a.customer_id;
end $$;

create function public.save_block(p_professional uuid,p_start timestamptz,p_end timestamptz,p_reason text default null,p_id uuid default null,p_repeat integer default 1)
returns uuid language plpgsql security definer set search_path='' as $$
declare group_id uuid:=gen_random_uuid(); result uuid; i integer; s timestamptz; e timestamptz;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 if p_start>=p_end or p_repeat not between 1 and 52 or (p_id is not null and p_repeat<>1) then raise exception 'INVALID_BLOCK'; end if;
 perform 1 from public.professionals where id=p_professional for update;
 for i in 0..p_repeat-1 loop
  s:=((p_start at time zone 'America/Sao_Paulo')+make_interval(days=>i*7)) at time zone 'America/Sao_Paulo';
  e:=((p_end at time zone 'America/Sao_Paulo')+make_interval(days=>i*7)) at time zone 'America/Sao_Paulo';
  if exists(select 1 from public.schedule_occupancy where professional_id=p_professional and (p_id is null or id<>p_id) and period && tstzrange(s,e,'[)')) then raise exception 'BLOCK_CONFLICT'; end if;
  if p_id is null then insert into public.schedule_blocks(professional_id,starts_at,ends_at,reason,recurrence_group,created_by) values(p_professional,s,e,left(p_reason,500),group_id,auth.uid()) returning id into result;
  else update public.schedule_blocks set professional_id=p_professional,starts_at=s,ends_at=e,reason=left(p_reason,500) where id=p_id returning id into result; end if;
 end loop;
 return result;
end $$;
create function public.remove_block(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'FORBIDDEN'; end if; delete from public.schedule_blocks where id=p_id; end $$;

create function public.grant_points(p_appointment uuid,p_operation uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.appointments; r public.loyalty_rules;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 select * into a from public.appointments where id=p_appointment for update;
 if a.status is distinct from 'completed' then raise exception 'COMPLETION_REQUIRED'; end if;
 select * into r from public.loyalty_rules where active and service_id=a.service_id;
 if r.id is null then raise exception 'LOYALTY_NOT_CONFIGURED'; end if;
 -- Validade é reservada para uma evolução com alocação de débitos por lote.
 if r.expires_after_days is not null then raise exception 'EXPIRY_NOT_SUPPORTED'; end if;
 insert into public.loyalty_transactions(customer_id,appointment_id,points,actor_id,operation_id,reason)
 values(a.customer_id,a.id,r.points,auth.uid(),p_operation,'Atendimento concluído e validado') on conflict do nothing;
end $$;
create function public.redeem_reward(p_customer uuid,p_reward uuid,p_operation uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.loyalty_rewards; balance bigint; redemption uuid;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.customers where id=p_customer for update;
 if exists(select 1 from public.reward_redemptions where operation_id=p_operation) then return; end if;
 select * into r from public.loyalty_rewards where id=p_reward and active;
 if r.id is null then raise exception 'INVALID_REWARD'; end if;
 select coalesce(sum(points),0) into balance from public.loyalty_transactions where customer_id=p_customer;
 if balance<r.cost then raise exception 'INSUFFICIENT_POINTS'; end if;
 insert into public.reward_redemptions(customer_id,reward_id,operation_id,created_by) values(p_customer,p_reward,p_operation,auth.uid()) returning id into redemption;
 insert into public.loyalty_transactions(customer_id,redemption_id,points,actor_id,operation_id,reason) values(p_customer,redemption,-r.cost,auth.uid(),p_operation,'Resgate: '||r.name);
end $$;

-- Por padrão, funções PostgreSQL são executáveis por PUBLIC. Fechar e conceder explicitamente.
revoke all on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_admin() to anon,authenticated;
grant execute on function public.available_slots(uuid,uuid,date,uuid) to anon,authenticated;
grant execute on function public.save_customer(text,text,boolean,uuid),public.admin_create_customer(text,text),public.book_appointment(uuid,uuid,timestamptz,uuid),public.change_appointment(uuid,text,timestamptz,text),public.save_block(uuid,timestamptz,timestamptz,text,uuid,integer),public.remove_block(uuid),public.grant_points(uuid,uuid),public.redeem_reward(uuid,uuid,uuid) to authenticated;


-- Migration: 202610250003_storage.sql

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-images','business-images',true,5242880,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy business_images_read on storage.objects for select using(bucket_id='business-images');
create policy business_images_admin_insert on storage.objects for insert to authenticated with check(bucket_id='business-images' and public.is_admin());
create policy business_images_admin_update on storage.objects for update to authenticated using(bucket_id='business-images' and public.is_admin()) with check(bucket_id='business-images' and public.is_admin());
create policy business_images_admin_delete on storage.objects for delete to authenticated using(bucket_id='business-images' and public.is_admin());


-- Migration: 202610250004_admin.sql

create function public.save_professional(p_id uuid,p_name text,p_active boolean,p_services uuid[]) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 if p_id is null then insert into public.professionals(name,active) values(p_name,p_active) returning id into result;
 else update public.professionals set name=p_name,active=p_active where id=p_id returning id into result; end if;
 if result is null then raise exception 'INVALID_PROFESSIONAL'; end if;
 delete from public.professional_services where professional_id=result;
 insert into public.professional_services(professional_id,service_id) select result,unnest(p_services);
 return result;
end $$;
create function public.save_block_local(p_professional uuid,p_start timestamp,p_end timestamp,p_reason text,p_id uuid,p_repeat integer) returns uuid language sql security invoker set search_path='' as $$
 select public.save_block(p_professional,p_start at time zone 'America/Sao_Paulo',p_end at time zone 'America/Sao_Paulo',p_reason,p_id,p_repeat);
$$;
revoke all on function public.save_professional(uuid,text,boolean,uuid[]),public.save_block_local(uuid,timestamp,timestamp,text,uuid,integer) from public,anon;
grant execute on function public.save_professional(uuid,text,boolean,uuid[]),public.save_block_local(uuid,timestamp,timestamp,text,uuid,integer) to authenticated;
create policy exceptions_admin_read on public.schedule_exceptions for select to authenticated using(public.is_admin());
grant select on public.schedule_exceptions to authenticated;


-- Migration: 202610250005_reports.sql

create function public.admin_report(p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 if p_to<p_from or p_to-p_from>366 then raise exception 'INVALID_PERIOD'; end if;
 with filtered as (select * from public.appointments where starts_at >= p_from::timestamp at time zone 'America/Sao_Paulo' and starts_at < (p_to+1)::timestamp at time zone 'America/Sao_Paulo'),
 popular as (select s.name,count(*) total from filtered a join public.services s on s.id=a.service_id where a.status<>'cancelled' group by s.id,s.name order by count(*) desc limit 10),
 recurring as (select c.name,count(*) total from filtered a join public.customers c on c.id=a.customer_id where a.status='completed' group by c.id,c.name having count(*)>1 order by count(*) desc limit 10)
 select jsonb_build_object('scheduled',count(*) filter(where status='scheduled'),'completed',count(*) filter(where status='completed'),'cancelled',count(*) filter(where status='cancelled'),'no_show',count(*) filter(where status='no_show'),'value_cents',coalesce(sum(price_cents) filter(where status='completed'),0),'blocks',(select count(*) from public.schedule_blocks where tstzrange(starts_at,ends_at,'[)') && tstzrange(p_from::timestamp at time zone 'America/Sao_Paulo',(p_to+1)::timestamp at time zone 'America/Sao_Paulo','[)')),'popular',coalesce((select jsonb_agg(popular) from popular),'[]'::jsonb),'recurring',coalesce((select jsonb_agg(recurring) from recurring),'[]'::jsonb)) into result from filtered;
 return result;
end $$;
revoke all on function public.admin_report(date,date) from public,anon;
grant execute on function public.admin_report(date,date) to authenticated;


-- Migration: 202610270001_report_filters.sql

create function public.admin_report_filtered(p_from date,p_to date,p_service uuid default null,p_professional uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'INVALID_PERIOD'; end if;
 with filtered as (select * from public.appointments where (p_service is null or service_id=p_service) and (p_professional is null or professional_id=p_professional) and starts_at >= p_from::timestamp at time zone 'America/Sao_Paulo' and starts_at < (p_to+1)::timestamp at time zone 'America/Sao_Paulo'),
 popular as (select s.name,count(*) total from filtered a join public.services s on s.id=a.service_id where a.status<>'cancelled' group by s.id,s.name order by count(*) desc limit 10),
 recurring as (select c.name,count(*) total from filtered a join public.customers c on c.id=a.customer_id where a.status='completed' group by c.id,c.name having count(*)>1 order by count(*) desc limit 10)
 select jsonb_build_object('scheduled',count(*) filter(where status='scheduled'),'completed',count(*) filter(where status='completed'),'cancelled',count(*) filter(where status='cancelled'),'no_show',count(*) filter(where status='no_show'),'value_cents',coalesce(sum(price_cents) filter(where status='completed'),0),'blocks',(select count(*) from public.schedule_blocks where (p_professional is null or professional_id=p_professional) and tstzrange(starts_at,ends_at,'[)') && tstzrange(p_from::timestamp at time zone 'America/Sao_Paulo',(p_to+1)::timestamp at time zone 'America/Sao_Paulo','[)')),'popular',coalesce((select jsonb_agg(popular) from popular),'[]'::jsonb),'recurring',coalesce((select jsonb_agg(recurring) from recurring),'[]'::jsonb)) into result from filtered;
 return result;
end $$;
revoke all on function public.admin_report_filtered(date,date,uuid,uuid) from public,anon;
grant execute on function public.admin_report_filtered(date,date,uuid,uuid) to authenticated;


-- Migration: 202610290001_schedule_policies.sql

-- Políticas aprovadas pelo proprietário; reservas existentes são preservadas.
alter table public.business_settings add column buffer_minutes integer not null default 0 check(buffer_minutes between 0 and 240);
alter table public.business_settings add column reschedule_notice_minutes integer not null default 120 check(reschedule_notice_minutes between 0 and 43200);
alter table public.audit_logs add column old_data jsonb, add column new_data jsonb;
create or replace function public.log_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_logs(actor_id,entity,entity_id,action,old_data,new_data)
 values(auth.uid(),tg_table_name,case when tg_table_name='business_settings' then null else (coalesce(to_jsonb(new),to_jsonb(old))->>'id')::uuid end,tg_op,
 case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end);
 return coalesce(new,old);
end $$;

-- Expediente e exceções são consultados sem considerar antecedência: também serve à detecção de conflitos.
create function public.schedule_windows(p_professional uuid,p_day date)
returns table(opens_at timestamptz,closes_at timestamptz) language sql stable security definer set search_path='' as $$
 select (p_day+e.opens_at) at time zone 'America/Sao_Paulo',(p_day+e.closes_at) at time zone 'America/Sao_Paulo'
 from public.schedule_exceptions e where e.professional_id=p_professional and e.day=p_day and not e.closed
 and not exists(select 1 from public.schedule_exceptions c where c.professional_id=p_professional and c.day=p_day and c.closed)
 union all
 select (p_day+h.opens_at) at time zone 'America/Sao_Paulo',(p_day+h.closes_at) at time zone 'America/Sao_Paulo'
 from public.business_hours h where h.professional_id=p_professional and h.weekday=extract(dow from p_day)::integer
 and not exists(select 1 from public.schedule_exceptions e where e.professional_id=p_professional and e.day=p_day);
$$;
revoke all on function public.schedule_windows(uuid,date) from public,anon,authenticated;

create or replace function public.available_slots(p_service uuid,p_professional uuid,p_day date,p_exclude uuid default null)
returns table(starts_at timestamptz) language plpgsql stable security definer set search_path='' as $$
declare svc public.services; cfg public.business_settings; override_notice boolean;
begin
 select * into svc from public.services where id=p_service and status='active';
 select * into cfg from public.business_settings;
 override_notice:=public.is_admin() and p_exclude is not null;
 if svc.duration_minutes is null or svc.price_cents is null or (not coalesce(cfg.booking_enabled,false) and not override_notice) then return; end if;
 if p_day<(now() at time zone 'America/Sao_Paulo')::date or (not override_notice and p_day>(now() at time zone 'America/Sao_Paulo')::date+cfg.max_booking_days) then return; end if;
 if not exists(select 1 from public.professionals p join public.professional_services ps on ps.professional_id=p.id where p.id=p_professional and p.active and ps.service_id=p_service) then return; end if;
 if p_exclude is not null and not exists(select 1 from public.appointments a join public.customers c on c.id=a.customer_id where a.id=p_exclude and (c.profile_id=auth.uid() or public.is_admin())) then raise exception 'FORBIDDEN'; end if;
 return query
 with candidates as (
 select generate_series(w.opens_at,w.closes_at-make_interval(mins=>svc.duration_minutes),interval '5 minutes') slot
 from public.schedule_windows(p_professional,p_day) w
 ) select distinct slot from candidates
 where slot>=now()+make_interval(mins=>case when override_notice then 0 else cfg.min_notice_minutes end)
 and not exists(select 1 from public.schedule_occupancy o where o.professional_id=p_professional and (p_exclude is null or o.id<>p_exclude)
 and case when o.kind='appointment' then tstzrange(lower(o.period)-make_interval(mins=>cfg.buffer_minutes),upper(o.period)+make_interval(mins=>cfg.buffer_minutes),'[)') else o.period end
 && tstzrange(slot,slot+make_interval(mins=>svc.duration_minutes),'[)')) order by slot;
end $$;

create function public.enforce_appointment_buffer() returns trigger language plpgsql security definer set search_path='' as $$
declare gap integer;
begin
 if new.status<>'scheduled' then return new; end if;
 if tg_op='UPDATE' and new.starts_at=old.starts_at and new.ends_at=old.ends_at and new.professional_id=old.professional_id then return new; end if;
 perform 1 from public.professionals where id=new.professional_id for update;
 select buffer_minutes into gap from public.business_settings;
 if exists(select 1 from public.appointments a where a.professional_id=new.professional_id and a.id<>new.id and a.status<>'cancelled'
 and tstzrange(a.starts_at-make_interval(mins=>gap),a.ends_at+make_interval(mins=>gap),'[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'SLOT_UNAVAILABLE'; end if;
 return new;
end $$;
revoke all on function public.enforce_appointment_buffer() from public,anon,authenticated;
create trigger appointment_buffer before insert or update on public.appointments for each row execute function public.enforce_appointment_buffer();

create function public.schedule_conflicts() returns table(appointment_id uuid,starts_at timestamptz,customer_name text,professional_name text,reason text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 return query select a.id,a.starts_at,c.name,p.name,
 case when not exists(select 1 from public.schedule_windows(a.professional_id,(a.starts_at at time zone 'America/Sao_Paulo')::date) w where a.starts_at>=w.opens_at and a.ends_at<=w.closes_at)
 then 'Fora do expediente atual' else 'Intervalo entre atendimentos menor que o configurado' end
 from public.appointments a join public.customers c on c.id=a.customer_id join public.professionals p on p.id=a.professional_id cross join public.business_settings cfg
 where a.status='scheduled' and a.ends_at>now() and (
 not exists(select 1 from public.schedule_windows(a.professional_id,(a.starts_at at time zone 'America/Sao_Paulo')::date) w where a.starts_at>=w.opens_at and a.ends_at<=w.closes_at)
 or exists(select 1 from public.appointments b where b.id<>a.id and b.professional_id=a.professional_id and b.status<>'cancelled'
 and tstzrange(b.starts_at-make_interval(mins=>cfg.buffer_minutes),b.ends_at+make_interval(mins=>cfg.buffer_minutes),'[)') && tstzrange(a.starts_at,a.ends_at,'[)')))
 order by a.starts_at;
end $$;
revoke all on function public.schedule_conflicts() from public,anon;
grant execute on function public.schedule_conflicts() to authenticated;

update public.business_settings set min_notice_minutes=60,max_booking_days=30,cancellation_notice_minutes=120,reschedule_notice_minutes=120,booking_enabled=true where id;
insert into public.business_hours(professional_id,weekday,opens_at,closes_at)
select p.id,d,'08:00'::time,'12:00'::time from public.professionals p cross join generate_series(1,6) d
where p.id='20000000-0000-4000-8000-000000000001' on conflict do nothing;
insert into public.business_hours(professional_id,weekday,opens_at,closes_at)
select p.id,d,'13:00'::time,case when d=6 then '18:00'::time else '19:00'::time end from public.professionals p cross join generate_series(1,6) d
where p.id='20000000-0000-4000-8000-000000000001' on conflict do nothing;

create or replace function public.change_appointment(p_id uuid,p_action text,p_start timestamptz default null,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare a public.appointments; cfg public.business_settings; next_status text;
begin
 perform public.consume_rate_limit();
 select * into a from public.appointments where id=p_id for update;
 if a.id is null or not (public.is_admin() or exists(select 1 from public.customers where id=a.customer_id and profile_id=auth.uid())) then raise exception 'FORBIDDEN'; end if;
 if a.status<>'scheduled' then raise exception 'INVALID_STATUS'; end if;
 select * into cfg from public.business_settings;
 if not public.is_admin() and (cfg.cancellation_notice_minutes is null or a.starts_at<now()+make_interval(mins=>case when p_action='reschedule' then cfg.reschedule_notice_minutes else cfg.cancellation_notice_minutes end)) then raise exception 'POLICY_LIMIT'; end if;
 if p_action='reschedule' then
  perform 1 from public.professionals where id=a.professional_id for update;
  if p_start is null or not exists(select 1 from public.available_slots(a.service_id,a.professional_id,(p_start at time zone 'America/Sao_Paulo')::date,p_id) s where s.starts_at=p_start) then raise exception 'SLOT_UNAVAILABLE'; end if;
  update public.appointments set starts_at=p_start,ends_at=p_start+make_interval(mins=>(select duration_minutes from public.services where id=a.service_id)) where id=p_id;
  next_status:='scheduled';
 elsif p_action in ('cancelled','completed','no_show') then
  if p_action<>'cancelled' and not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_action in ('completed','no_show') and a.ends_at>now() then raise exception 'APPOINTMENT_NOT_FINISHED'; end if;
  next_status:=p_action;
  update public.appointments set status=p_action where id=p_id;
 else raise exception 'INVALID_ACTION'; end if;
 insert into public.appointment_events(appointment_id,actor_id,old_start,new_start,old_status,new_status,reason) values(p_id,auth.uid(),a.starts_at,coalesce(p_start,a.starts_at),a.status,next_status,left(p_reason,500));
 insert into public.notifications(profile_id,appointment_id,kind) select profile_id,p_id,p_action from public.customers where id=a.customer_id;
end $$;



-- Migration: 202610300001_manual_payments.sql

create table public.payment_settings (
 id boolean primary key default true check(id),
 key_type text not null check(key_type in ('phone','email','cpf','cnpj','random')),
 pix_key text not null check(length(pix_key) between 1 and 77),
 beneficiary text not null check(length(beneficiary) between 1 and 100),
 city text not null default 'MURIAE' check(length(city) between 1 and 15),
 verified_at timestamptz, verified_by uuid references public.profiles,
 updated_at timestamptz not null default now(),
 check((verified_at is null)=(verified_by is null))
);
insert into public.payment_settings(id,key_type,pix_key,beneficiary)
values(true,'phone','+553298553119','André da Silva Nascimento Filho');

create table public.payments (
 id uuid primary key default gen_random_uuid(),
 appointment_id uuid not null unique references public.appointments,
 customer_id uuid not null references public.customers,
 amount_cents integer not null check(amount_cents>0),
 method text not null default 'pix' check(method in ('pix','cash','other')),
 status text not null default 'pending' check(status in ('pending','awaiting_review','confirmed')),
 provider text not null default 'manual' check(provider='manual'),
 reported_at timestamptz, paid_at timestamptz,
 confirmed_at timestamptz, confirmed_by uuid references public.profiles,
 created_at timestamptz not null default now(),
 check((status='confirmed' and confirmed_at is not null and confirmed_by is not null and paid_at is not null)
 or (status<>'confirmed' and confirmed_at is null and confirmed_by is null and paid_at is null))
);
create table public.payment_events (
 id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments,
 actor_id uuid not null references public.profiles,
 action text not null check(action in ('created','reported','confirmed')),
 created_at timestamptz not null default now()
);
alter table public.payment_settings enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
revoke all on public.payment_settings,public.payments,public.payment_events from anon,authenticated;
grant select on public.payment_settings,public.payments,public.payment_events to authenticated;
create policy payment_settings_read on public.payment_settings for select to authenticated using(public.is_admin() or verified_at is not null);
create policy payment_read on public.payments for select to authenticated using(public.is_admin() or customer_id in(select id from public.customers where profile_id=auth.uid()));
create policy payment_events_read on public.payment_events for select to authenticated using(public.is_admin() or payment_id in(select id from public.payments));
create index payment_status on public.payments(status,created_at);

create function public.save_payment_settings(p_type text,p_key text,p_beneficiary text,p_city text,p_verified boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 if p_type is null or p_key is null or p_beneficiary is null or p_city is null then raise exception 'INVALID_PIX'; end if;
 if not (case p_type when 'phone' then p_key ~ '^\+[1-9][0-9]{7,14}$'
 when 'email' then p_key ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 when 'cpf' then p_key ~ '^[0-9]{11}$' when 'cnpj' then p_key ~ '^[0-9]{14}$'
 when 'random' then p_key ~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' else false end)
 then raise exception 'INVALID_PIX'; end if;
 update public.payment_settings set key_type=p_type,pix_key=p_key,beneficiary=trim(p_beneficiary),city=trim(p_city),
 verified_at=case when p_verified is true then now() end,verified_by=case when p_verified is true then auth.uid() end,updated_at=now() where id;
end $$;

-- Serializa por reserva. Valor e cliente vêm do banco, nunca do navegador.
create function public.ensure_payment(p_appointment uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.appointments; result uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into a from public.appointments where id=p_appointment for update;
 if a.id is null or not (public.is_admin() or exists(select 1 from public.customers where id=a.customer_id and profile_id=auth.uid())) then raise exception 'FORBIDDEN'; end if;
 if a.status not in ('scheduled','completed') or a.starts_at>now() or a.price_cents<=0 then raise exception 'PAYMENT_NOT_DUE'; end if;
 select id into result from public.payments where appointment_id=a.id;
 if result is null then
 insert into public.payments(appointment_id,customer_id,amount_cents) values(a.id,a.customer_id,a.price_cents) returning id into result;
 insert into public.payment_events(payment_id,actor_id,action) values(result,auth.uid(),'created');
 end if;
 return result;
end $$;
create function public.report_payment(p_appointment uuid) returns void language plpgsql security definer set search_path='' as $$
declare payment uuid;
begin
 if not exists(select 1 from public.payment_settings where verified_at is not null) then raise exception 'PIX_NOT_VERIFIED'; end if;
 payment:=public.ensure_payment(p_appointment);
 update public.payments set status='awaiting_review',reported_at=now() where id=payment and status='pending';
 if found then insert into public.payment_events(payment_id,actor_id,action) values(payment,auth.uid(),'reported'); end if;
end $$;
create function public.confirm_payment(p_appointment uuid,p_method text,p_amount integer,p_paid_at timestamptz,p_checked boolean)
returns void language plpgsql security definer set search_path='' as $$
declare payment uuid; current_payment public.payments;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 if p_checked is distinct from true or p_method is null or p_method not in ('pix','cash','other') or p_paid_at is null or p_paid_at>now() then raise exception 'PAYMENT_REVIEW_REQUIRED'; end if;
 payment:=public.ensure_payment(p_appointment);
 select * into current_payment from public.payments where id=payment for update;
 if p_amount is null or p_amount<>current_payment.amount_cents then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;
 if p_paid_at<(select starts_at from public.appointments where id=p_appointment) then raise exception 'PAYMENT_NOT_DUE'; end if;
 if current_payment.status='confirmed' then return; end if;
 update public.payments set status='confirmed',method=p_method,paid_at=p_paid_at,confirmed_at=now(),confirmed_by=auth.uid() where id=payment;
 insert into public.payment_events(payment_id,actor_id,action) values(payment,auth.uid(),'confirmed');
end $$;

-- Log dedicado: o id singleton de configurações não é UUID.
create function public.audit_payment_settings() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_logs(actor_id,entity,action,old_data,new_data) values(auth.uid(),'payment_settings',tg_op,to_jsonb(old),to_jsonb(new)); return new;
end $$;
create trigger audit_payment_settings after update on public.payment_settings for each row execute function public.audit_payment_settings();
create trigger audit_payments after insert or update on public.payments for each row execute function public.log_change();
revoke all on function public.save_payment_settings(text,text,text,text,boolean),public.ensure_payment(uuid),public.report_payment(uuid),public.confirm_payment(uuid,text,integer,timestamptz,boolean),public.audit_payment_settings() from public,anon,authenticated;
grant execute on function public.save_payment_settings(text,text,text,text,boolean),public.ensure_payment(uuid),public.report_payment(uuid),public.confirm_payment(uuid,text,integer,timestamptz,boolean) to authenticated;


-- Migration: 202611020001_test_record_deletion.sql

-- Limpeza explícita de testes: sem DELETE direto para usuários da API.
create function public.delete_test_record(p_kind text,p_id uuid,p_reason text,p_confirmation text,p_cascade boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare c uuid; a uuid[] := '{}'; payments uuid[] := '{}'; t text; predicate text; row_data jsonb;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 if p_confirmation is distinct from 'EXCLUIR' or p_reason is null or length(trim(p_reason)) not between 5 and 500
 or p_kind is null or p_kind not in ('customer','appointment','payment') or p_id is null or p_cascade is null then raise exception 'INVALID_DELETION'; end if;
 -- Operação rara: serializa escritas relacionadas, inclusive criação de pagamentos e pontos.
 lock table public.customers,public.appointments,public.payments,public.payment_events,public.loyalty_transactions,public.reward_redemptions,public.appointment_events,public.notifications in share row exclusive mode;
 if p_kind='customer' then
  select id into c from public.customers where id=p_id;
  if c is null then raise exception 'NOT_FOUND'; end if;
  select coalesce(array_agg(id),'{}') into a from public.appointments where customer_id=c;
  if not p_cascade and (cardinality(a)>0 or exists(select 1 from public.loyalty_transactions where customer_id=c) or exists(select 1 from public.reward_redemptions where customer_id=c)) then raise exception 'DEPENDENCIES_EXIST'; end if;
 elsif p_kind='appointment' then
  select customer_id into c from public.appointments where id=p_id;
  if c is null then raise exception 'NOT_FOUND'; end if;
  a:=array[p_id];
  if exists(select 1 from public.loyalty_transactions where appointment_id=p_id) then raise exception 'LOYALTY_DEPENDENCY'; end if;
 else
  if not exists(select 1 from public.payments where id=p_id) then raise exception 'NOT_FOUND'; end if;
 end if;
 select coalesce(array_agg(id),'{}') into payments from public.payments where (p_kind='payment' and id=p_id) or appointment_id=any(a);
 if p_kind='appointment' and not p_cascade and cardinality(payments)>0 then raise exception 'DEPENDENCIES_EXIST'; end if;
 -- Snapshot de cada registro removido, com autor, data e motivo, permanece na auditoria.
 foreach t in array array['payment_events','payments','notifications','appointment_events','loyalty_transactions','reward_redemptions','appointments','customers'] loop
  predicate:=case t
   when 'payment_events' then 'payment_id=any($1)'
   when 'payments' then 'id=any($1)'
   when 'notifications' then 'appointment_id=any($2)'
   when 'appointment_events' then 'appointment_id=any($2)'
   when 'appointments' then 'id=any($2)'
   when 'customers' then 'id=$3 and $4'
   else 'customer_id=$3 and $4' end;
  for row_data in execute format('select to_jsonb(r) from public.%I r where %s',t,predicate) using payments,a,c,p_kind='customer' loop
   insert into public.audit_logs(actor_id,entity,entity_id,action,old_data,new_data)
   values(auth.uid(),t,(row_data->>'id')::uuid,'DELETE_TEST',row_data,jsonb_build_object('reason',trim(p_reason),'root_kind',p_kind,'root_id',p_id));
  end loop;
  execute format('delete from public.%I where %s',t,predicate) using payments,a,c,p_kind='customer';
 end loop;
end $$;
revoke all on function public.delete_test_record(text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.delete_test_record(text,uuid,text,text,boolean) to authenticated;


-- Migration: 202611020002_user_access.sql

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


-- Dados comerciais aprovados

-- Somente dados comerciais fornecidos. Sem clientes, regras comerciais ou horários fictícios.
insert into public.business_settings(id,story) values(true,'Meu nome é André, mas a maioria das pessoas me conhece como Andrezinho. Tenho 16 anos e, desde muito cedo, sempre tive vontade de crescer, conquistar minha independência e construir algo que pudesse chamar de meu.

Aos 13 anos, dei meu primeiro passo nessa caminhada: fiz meu primeiro curso de barbeiro. Comecei cortando o cabelo de alguns amigos, aprendendo a cada atendimento e descobrindo que a barbearia poderia ser muito mais do que uma profissão. Poderia ser o meu futuro.

Nem tudo foi fácil. Com o tempo, vieram responsabilidades, contas para pagar e a necessidade de buscar outros trabalhos. Passei por diferentes experiências e aprendi que conquistar um sonho exige esforço, paciência e dedicação.

No início do ano passado, decidi levar a barbearia ainda mais a sério. Mesmo trabalhando em outros lugares, comecei a investir mais tempo naquilo que realmente amo fazer.

Hoje, graças a Deus, à confiança dos meus clientes e a muito trabalho, tenho a oportunidade de viver da profissão que escolhi.

A Auto-estilo Barbershop representa muito mais do que um negócio. É a realização de um sonho que começou cedo e continua crescendo.

Sei que ainda sou muito jovem e tenho muito a aprender, mas sei aonde quero chegar: evoluir como profissional, oferecer o melhor aos meus clientes, fazer minha barbearia crescer e gerar oportunidades para outras pessoas.

Essa é só a primeira parte da minha história.') on conflict(id) do nothing;
insert into public.professionals(id,name) values('20000000-0000-4000-8000-000000000001','Andrezinho') on conflict(id) do nothing;
insert into public.services(id,name,price_cents,duration_minutes,status,sort_order) values('10000000-0000-4000-8000-000000000001','Corte',3000,30,'active',0) on conflict(id) do nothing;
insert into public.services(id,name,price_cents,duration_minutes,status,sort_order) values('10000000-0000-4000-8000-000000000002','Corte + pigmentação',4500,45,'active',1) on conflict(id) do nothing;
insert into public.services(id,name,price_cents,duration_minutes,status,sort_order) values('10000000-0000-4000-8000-000000000003','Corte + luzes',7500,null,'active',2) on conflict(id) do nothing;
insert into public.services(id,name,price_cents,duration_minutes,status,sort_order) values('10000000-0000-4000-8000-000000000004','Corte + platinado',8500,null,'active',3) on conflict(id) do nothing;
insert into public.services(id,name,price_cents,duration_minutes,status,sort_order) values('10000000-0000-4000-8000-000000000005','Pezinho',1500,10,'active',4) on conflict(id) do nothing;
insert into public.services(id,name,price_cents,duration_minutes,status,sort_order) values('10000000-0000-4000-8000-000000000006','Corte + barba',4000,45,'active',5) on conflict(id) do nothing;
insert into public.services(id,name,price_cents,duration_minutes,status,sort_order) values('10000000-0000-4000-8000-000000000007','Limpeza nasal',1500,20,'active',6) on conflict(id) do nothing;
insert into public.services(id,name,price_cents,duration_minutes,status,sort_order) values('10000000-0000-4000-8000-000000000008','Barberterapia',null,null,'coming_soon',7) on conflict(id) do nothing;
insert into public.services(id,name,price_cents,duration_minutes,status,sort_order) values('10000000-0000-4000-8000-000000000009','Limpeza facial',null,null,'coming_soon',8) on conflict(id) do nothing;
insert into public.services(id,name,price_cents,duration_minutes,status,sort_order) values('10000000-0000-4000-8000-000000000010','Hidratação capilar',null,null,'coming_soon',9) on conflict(id) do nothing;
insert into public.professional_services(professional_id,service_id) select '20000000-0000-4000-8000-000000000001',id from public.services on conflict do nothing;

-- Expediente e pol?ticas aprovados em 29/10/2026.
update public.business_settings set min_notice_minutes=60,max_booking_days=30,cancellation_notice_minutes=120,reschedule_notice_minutes=120,booking_enabled=true where id;
insert into public.business_hours(professional_id,weekday,opens_at,closes_at)
select p.id,d,'08:00'::time,'12:00'::time from public.professionals p cross join generate_series(1,6) d
where p.id='20000000-0000-4000-8000-000000000001' on conflict do nothing;
insert into public.business_hours(professional_id,weekday,opens_at,closes_at)
select p.id,d,'13:00'::time,case when d=6 then '18:00'::time else '19:00'::time end from public.professionals p cross join generate_series(1,6) d
where p.id='20000000-0000-4000-8000-000000000001' on conflict do nothing;


commit;