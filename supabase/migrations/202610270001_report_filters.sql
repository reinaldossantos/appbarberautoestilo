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
