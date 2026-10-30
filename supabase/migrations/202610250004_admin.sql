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
