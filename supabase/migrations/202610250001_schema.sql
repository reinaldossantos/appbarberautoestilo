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
