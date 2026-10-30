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

