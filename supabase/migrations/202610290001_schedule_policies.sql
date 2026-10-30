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

