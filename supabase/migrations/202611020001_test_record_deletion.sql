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
