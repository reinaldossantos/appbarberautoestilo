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
