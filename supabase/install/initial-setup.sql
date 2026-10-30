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