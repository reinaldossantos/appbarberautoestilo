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
