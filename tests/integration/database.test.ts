import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFile, readdir } from 'node:fs/promises';
let db: PGlite;
const admin = '30000000-0000-4000-8000-000000000001',
  alice = '30000000-0000-4000-8000-000000000002',
  bob = '30000000-0000-4000-8000-000000000003';
const pro = '20000000-0000-4000-8000-000000000001',
  svc = '10000000-0000-4000-8000-000000000001';
let day: string;
async function as(user: string, role = 'authenticated') {
  await db.exec(
    `reset role; set request.jwt.claim.sub='${user}'; set role ${role};`,
  );
}
async function root() {
  await db.exec('reset role;');
}
async function book(time: string, service = svc) {
  return db.query<{ id: string }>(
    'select public.book_appointment($1,$2,$3) id',
    [service, pro, `${day}T${time}:00-03:00`],
  );
}
beforeAll(async () => {
  db = new PGlite({ extensions: { btree_gist } });
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'); create table auth.mfa_factors(user_id uuid,status text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.jwt() returns jsonb language sql stable as $$ select '{"aal":"aal1"}'::jsonb $$; grant usage on schema public,auth to anon,authenticated; grant execute on all functions in schema auth to anon,authenticated;`,
  );
  const files = (await readdir('supabase/migrations'))
    .filter((f) => f.endsWith('.sql') && !f.includes('_storage'))
    .sort();
  for (const f of files)
    await db.exec(await readFile(`supabase/migrations/${f}`, 'utf8'));
  await db.exec(await readFile('supabase/seed.sql', 'utf8'));
  await db.exec(
    `insert into auth.users(id) values('${admin}'),('${alice}'),('${bob}'); update public.profiles set role='admin' where id='${admin}'; update public.business_settings set booking_enabled=true,min_notice_minutes=0,max_booking_days=365,cancellation_notice_minutes=0,reschedule_notice_minutes=0; delete from public.business_hours; insert into public.business_hours(professional_id,weekday,opens_at,closes_at) select '${pro}',d,'08:00','18:00' from generate_series(0,6) d;`,
  );
  day = (
    await db.query<{ day: string }>(
      "select ((now() at time zone 'America/Sao_Paulo')::date+2)::text as day",
    )
  ).rows[0].day;
  await as(alice);
  await db.query(
    "select public.save_customer('Cliente de teste A','32999990001',true)",
  );
  await as(bob);
  await db.query(
    "select public.save_customer('Cliente de teste B','32999990002',true)",
  );
});
afterAll(async () => {
  await db?.close();
});
describe('Migrations reais em PostgreSQL (PGlite)', () => {
  it('exclui testes somente como admin, respeita dependências e preserva auditoria', async () => {
    await root();
    await db.exec('begin');
    const reject = async (sql: string, params: unknown[], expected: string) => {
      await db.exec('savepoint deletion_check');
      await expect(db.query(sql, params)).rejects.toThrow(expected);
      await db.exec('rollback to savepoint deletion_check');
    };
    try {
      const customer = (
        await db.query<{ id: string }>(
          "insert into public.customers(name) values('Limpeza teste') returning id",
        )
      ).rows[0].id;
      const appointment = (
        await db.query<{ id: string }>(
          "insert into public.appointments(customer_id,professional_id,service_id,starts_at,ends_at,status,price_cents) values($1,$2,$3,now()-interval '20 days',now()-interval '20 days'+interval '30 minutes','completed',3000) returning id",
          [customer, pro, svc],
        )
      ).rows[0].id;
      await as(admin);
      await db.query(
        "select public.confirm_payment($1,'cash',3000,now(),true)",
        [appointment],
      );
      const payment = (
        await db.query<{ id: string }>(
          'select id from public.payments where appointment_id=$1',
          [appointment],
        )
      ).rows[0].id;
      const sql = 'select public.delete_test_record($1,$2,$3,$4,$5)';
      await as(alice);
      await reject(
        sql,
        ['customer', customer, 'Limpeza de testes', 'EXCLUIR', true],
        'FORBIDDEN',
      );
      await as(admin);
      await reject(
        sql,
        ['customer', customer, 'Limpeza de testes', '', true],
        'INVALID_DELETION',
      );
      await reject(
        sql,
        ['customer', customer, 'Limpeza de testes', 'EXCLUIR', false],
        'DEPENDENCIES_EXIST',
      );
      await reject(
        sql,
        ['appointment', appointment, 'Limpeza de testes', 'EXCLUIR', false],
        'DEPENDENCIES_EXIST',
      );
      await reject(
        'delete from public.payments where id=$1',
        [payment],
        'permission denied',
      );
      await db.query(sql, [
        'payment',
        payment,
        'Limpeza de testes',
        'EXCLUIR',
        false,
      ]);
      expect(
        (
          await db.query('select id from public.appointments where id=$1', [
            appointment,
          ])
        ).rows,
      ).toHaveLength(1);
      await db.query(sql, [
        'appointment',
        appointment,
        'Limpeza de testes',
        'EXCLUIR',
        false,
      ]);
      await root();
      expect(
        (
          await db.query(
            'select id from public.schedule_occupancy where id=$1',
            [appointment],
          )
        ).rows,
      ).toHaveLength(0);
      await as(admin);
      await db.query(sql, [
        'customer',
        customer,
        'Limpeza de testes',
        'EXCLUIR',
        false,
      ]);
      const audit = await db.query<{ old_data: Record<string, unknown> }>(
        "select old_data from public.audit_logs where entity_id=$1 and action='DELETE_TEST'",
        [payment],
      );
      expect(audit.rows).toHaveLength(1);
      expect(audit.rows[0].old_data).toMatchObject({
        status: 'confirmed',
        confirmed_by: admin,
      });
      await root();
      const c = (
        await db.query<{ id: string }>(
          "insert into public.customers(name) values('Cascata teste') returning id",
        )
      ).rows[0].id;
      const a = (
        await db.query<{ id: string }>(
          "insert into public.appointments(customer_id,professional_id,service_id,starts_at,ends_at,status,price_cents) values($1,$2,$3,now()-interval '21 days',now()-interval '21 days'+interval '30 minutes','completed',3000) returning id",
          [c, pro, svc],
        )
      ).rows[0].id;
      await db.query(
        "insert into public.loyalty_transactions(customer_id,appointment_id,points,operation_id,reason) values($1,$2,10,gen_random_uuid(),'Teste')",
        [c, a],
      );
      await as(admin);
      await db.query('select public.ensure_payment($1)', [a]);
      await reject(
        sql,
        ['appointment', a, 'Limpeza de testes', 'EXCLUIR', true],
        'LOYALTY_DEPENDENCY',
      );
      await db.query(sql, [
        'customer',
        c,
        'Limpeza de testes',
        'EXCLUIR',
        true,
      ]);
      for (const table of ['appointments', 'payments', 'loyalty_transactions'])
        expect(
          (
            await db.query(
              `select id from public.${table} where customer_id=$1`,
              [c],
            )
          ).rows,
        ).toHaveLength(0);
    } finally {
      await root();
      await db.exec('rollback');
    }
  });
  it('protege pagamento: cliente informa, administrador confere, terceiros não leem', async () => {
    await root();
    await db.exec('begin');
    const reject = async (sql: string, params: unknown[], expected: string) => {
      await db.exec('savepoint payment_check');
      await expect(db.query(sql, params)).rejects.toThrow(expected);
      await db.exec('rollback to savepoint payment_check');
    };
    try {
      const id = (
        await db.query<{ id: string }>(
          "insert into public.appointments(customer_id,professional_id,service_id,starts_at,ends_at,status,price_cents) select id,$1,$2,now()-interval '2 days',now()-interval '2 days'+interval '30 minutes','completed',3000 from public.customers where profile_id=$3 returning id",
          [pro, svc, alice],
        )
      ).rows[0].id;
      await as(alice);
      expect(
        (await db.query('select * from public.payment_settings')).rows,
      ).toHaveLength(0);
      await reject(
        'select public.report_payment($1)',
        [id],
        'PIX_NOT_VERIFIED',
      );
      await db.query('select public.ensure_payment($1)', [id]);
      await as(admin);
      await db.query(
        "select public.save_payment_settings('phone','+553298553119','André da Silva Nascimento Filho','MURIAE',true)",
      );
      await as(alice);
      await db.query('select public.report_payment($1)', [id]);
      expect(
        (
          await db.query(
            'select status,confirmed_by from public.payments where appointment_id=$1',
            [id],
          )
        ).rows[0],
      ).toMatchObject({ status: 'awaiting_review', confirmed_by: null });
      await reject(
        "update public.payments set status='confirmed' where appointment_id=$1",
        [id],
        'permission denied',
      );
      await reject(
        "select public.confirm_payment($1,'pix',3000,now(),true)",
        [id],
        'FORBIDDEN',
      );
      await as(bob);
      expect(
        (
          await db.query(
            'select * from public.payments where appointment_id=$1',
            [id],
          )
        ).rows,
      ).toHaveLength(0);
      await reject('select public.ensure_payment($1)', [id], 'FORBIDDEN');
      await as(admin);
      await reject(
        "select public.confirm_payment($1,'pix',2000,now(),true)",
        [id],
        'PAYMENT_AMOUNT_MISMATCH',
      );
      await reject(
        "select public.confirm_payment($1,'pix',3000,now(),false)",
        [id],
        'PAYMENT_REVIEW_REQUIRED',
      );
      await db.query(
        "select public.confirm_payment($1,'pix',3000,now(),true)",
        [id],
      );
      await db.query(
        "select public.confirm_payment($1,'cash',3000,now(),true)",
        [id],
      );
      expect(
        (
          await db.query(
            'select status,method,confirmed_by from public.payments where appointment_id=$1',
            [id],
          )
        ).rows[0],
      ).toMatchObject({
        status: 'confirmed',
        method: 'pix',
        confirmed_by: admin,
      });
      expect(
        (
          await db.query(
            "select e.id from public.payment_events e join public.payments p on p.id=e.payment_id where p.appointment_id=$1 and e.action='confirmed'",
            [id],
          )
        ).rows,
      ).toHaveLength(1);
      await db.query(
        "select public.save_payment_settings('phone','+553298553119','André da Silva Nascimento Filho','MURIAE',false)",
      );
      expect(
        (await db.query('select verified_at from public.payment_settings'))
          .rows[0],
      ).toMatchObject({ verified_at: null });
      await as(alice);
      const future = (await book('17:00')).rows[0].id;
      await reject(
        'select public.ensure_payment($1)',
        [future],
        'PAYMENT_NOT_DUE',
      );
    } finally {
      await root();
      await db.exec('rollback');
    }
  });
  it('separa prazo de cancelamento e reagendamento e permite exceção administrativa de antecedência', async () => {
    await root();
    await db.exec('begin');
    try {
      await as(alice);
      const id = (await book('10:00')).rows[0].id;
      await as(admin);
      await db.exec(
        'update public.business_settings set cancellation_notice_minutes=43200,reschedule_notice_minutes=0',
      );
      await as(alice);
      await db.query("select public.change_appointment($1,'reschedule',$2)", [
        id,
        `${day}T11:00:00-03:00`,
      ]);
      await db.exec('savepoint forbidden_cancel');
      await expect(
        db.query("select public.change_appointment($1,'cancelled')", [id]),
      ).rejects.toThrow('POLICY_LIMIT');
      await db.exec('rollback to savepoint forbidden_cancel');
      await as(admin);
      await db.exec(
        'update public.business_settings set min_notice_minutes=43200',
      );
      expect(
        (
          await db.query('select * from public.available_slots($1,$2,$3,$4)', [
            svc,
            pro,
            day,
            id,
          ])
        ).rows.length,
      ).toBeGreaterThan(0);
      await as(alice);
      expect(
        (
          await db.query('select * from public.available_slots($1,$2,$3,$4)', [
            svc,
            pro,
            day,
            id,
          ])
        ).rows,
      ).toHaveLength(0);
      await as(admin);
      await db.query("select public.change_appointment($1,'cancelled')", [id]);
      expect(
        (
          await db.query('select status from public.appointments where id=$1', [
            id,
          ])
        ).rows[0],
      ).toMatchObject({ status: 'cancelled' });
    } finally {
      await root();
      await db.exec('rollback');
    }
  });
  it('respeita pausa, encerramento, buffer e preserva reservas ao mudar expediente', async () => {
    await root();
    await db.exec('begin');
    try {
      await db.query(
        'delete from public.business_hours where professional_id=$1',
        [pro],
      );
      await db.query(
        "insert into public.business_hours(professional_id,weekday,opens_at,closes_at) values($1,extract(dow from $2::date),'08:00','12:00'),($1,extract(dow from $2::date),'13:00','18:00')",
        [pro, day],
      );
      await as(alice);
      const slots = await db.query<{ time: string }>(
        "select to_char(starts_at at time zone 'America/Sao_Paulo','HH24:MI') time from public.available_slots($1,$2,$3)",
        [svc, pro, day],
      );
      const times = slots.rows.map((r) => r.time);
      expect(times).toContain('11:30');
      expect(times).not.toContain('11:35');
      expect(times).not.toContain('12:00');
      expect(times).toContain('13:00');
      expect(times).toContain('17:30');
      expect(times).not.toContain('17:35');
      const first = (await book('08:00')).rows[0].id;
      await book('08:30');
      await as(admin);
      await db.exec('update public.business_settings set buffer_minutes=15');
      const conflicts = await db.query(
        'select * from public.schedule_conflicts()',
      );
      expect(conflicts.rows.length).toBe(2);
      await as(alice);
      const buffered = await db.query<{ time: string }>(
        "select to_char(starts_at at time zone 'America/Sao_Paulo','HH24:MI') time from public.available_slots($1,$2,$3)",
        [svc, pro, day],
      );
      expect(buffered.rows.map((r) => r.time)).not.toContain('09:00');
      expect(buffered.rows.map((r) => r.time)).toContain('09:15');
      await as(admin);
      await db.query(
        'delete from public.business_hours where professional_id=$1',
        [pro],
      );
      expect(
        (await db.query('select * from public.schedule_conflicts()')).rows
          .length,
      ).toBe(2);
      expect(
        (
          await db.query('select status from public.appointments where id=$1', [
            first,
          ])
        ).rows[0],
      ).toMatchObject({ status: 'scheduled' });
      const logs = await db.query(
        "select old_data,new_data from public.audit_logs where entity='business_settings' and new_data->>'buffer_minutes'='15'",
      );
      expect(logs.rows.length).toBeGreaterThan(0);
    } finally {
      await root();
      await db.exec('rollback');
    }
  });
  it('nega relatório de conflitos ao cliente e dá prioridade ao fechamento excepcional', async () => {
    await root();
    await db.exec('begin');
    try {
      await db.query(
        'insert into public.schedule_exceptions(professional_id,day,closed) values($1,$2,true)',
        [pro, day],
      );
      await db.query(
        "insert into public.schedule_exceptions(professional_id,day,closed,opens_at,closes_at) values($1,$2,false,'08:00','18:00')",
        [pro, day],
      );
      await as(alice);
      expect(
        (
          await db.query('select * from public.available_slots($1,$2,$3)', [
            svc,
            pro,
            day,
          ])
        ).rows,
      ).toHaveLength(0);
    } finally {
      await root();
      await db.exec('rollback');
    }
    await as(alice);
    await expect(
      db.query('select * from public.schedule_conflicts()'),
    ).rejects.toThrow('FORBIDDEN');
  });
  it('filtra relatórios e mantém autorização no servidor', async () => {
    await as(admin);
    const all = await db.query<{ report: { scheduled: number } }>(
      'select public.admin_report_filtered($1,$1,null,null) report',
      [day],
    );
    expect(all.rows[0].report.scheduled).toBe(0);
    const filtered = await db.query<{ report: { scheduled: number } }>(
      'select public.admin_report_filtered($1,$1,$2,$3) report',
      [day, svc, pro],
    );
    expect(filtered.rows[0].report.scheduled).toBe(0);
    await db.exec('begin');
    const customer = (
      await db.query<{ id: string }>(
        'select id from public.customers where profile_id=$1',
        [alice],
      )
    ).rows[0].id;
    await db.query('select public.book_appointment($1,$2,$3,$4)', [
      svc,
      pro,
      `${day}T11:00:00-03:00`,
      customer,
    ]);
    const matching = await db.query<{ report: { scheduled: number } }>(
      'select public.admin_report_filtered($1,$1,$2,$3) report',
      [day, svc, pro],
    );
    const other = await db.query<{ report: { scheduled: number } }>(
      'select public.admin_report_filtered($1,$1,$2,null) report',
      [day, '10000000-0000-4000-8000-000000000002'],
    );
    expect(matching.rows[0].report.scheduled).toBe(1);
    expect(other.rows[0].report.scheduled).toBe(0);
    await db.exec('rollback');
    await expect(
      db.query(
        "select public.admin_report_filtered('2026-10-27','2026-10-01',null,null)",
      ),
    ).rejects.toThrow('INVALID_PERIOD');
    await as(alice);
    await expect(
      db.query('select public.admin_report_filtered($1,$1,null,null)', [day]),
    ).rejects.toThrow('FORBIDDEN');
  });
  it('cria reserva válida e impede sobreposição', async () => {
    await as(alice);
    expect((await book('08:00')).rows[0].id).toBeTruthy();
    await expect(book('08:00')).rejects.toThrow('SLOT_UNAVAILABLE');
  });
  it('preserva apenas uma de duas tentativas concorrentes', async () => {
    await as(bob);
    const results = await Promise.allSettled([book('08:30'), book('08:30')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('recusa fora do expediente', async () => {
    await as(alice);
    await expect(book('07:00')).rejects.toThrow('SLOT_UNAVAILABLE');
  });
  it('recusa serviço sem duração, em breve e oculto', async () => {
    await as(alice);
    for (const n of [3, 8])
      await expect(
        book('09:00', `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`),
      ).rejects.toThrow('SLOT_UNAVAILABLE');
    await root();
    await db.exec(
      `update public.services set status='hidden' where id='10000000-0000-4000-8000-000000000005'`,
    );
    await as(alice);
    await expect(
      book('09:00', '10000000-0000-4000-8000-000000000005'),
    ).rejects.toThrow('SLOT_UNAVAILABLE');
  });
  it('bloqueia horário e mantém o motivo privado', async () => {
    await as(admin);
    await db.query("select public.save_block($1,$2,$3,'Motivo privado')", [
      pro,
      `${day}T09:00:00-03:00`,
      `${day}T09:30:00-03:00`,
    ]);
    await as(alice);
    await expect(book('09:00')).rejects.toThrow('SLOT_UNAVAILABLE');
    expect(
      (await db.query('select * from public.schedule_blocks')).rows,
    ).toHaveLength(0);
  });
  it('recusa bloco conflitante sem cancelar a reserva', async () => {
    await as(admin);
    await expect(
      db.query('select public.save_block($1,$2,$3)', [
        pro,
        `${day}T08:00:00-03:00`,
        `${day}T10:00:00-03:00`,
      ]),
    ).rejects.toThrow('BLOCK_CONFLICT');
    expect(
      (
        await db.query(
          "select count(*)::int n from public.appointments where status='scheduled'",
        )
      ).rows[0],
    ).toEqual({ n: 2 });
  });
  it('bloqueia turno, período e recorrência com atomicidade', async () => {
    await as(admin);
    for (const [start, end] of [
      ['12:00', '13:00'],
      ['16:00', '18:00'],
    ])
      await db.query('select public.save_block($1,$2,$3,null,null,2)', [
        pro,
        `${day}T${start}:00-03:00`,
        `${day}T${end}:00-03:00`,
      ]);
    await as(alice);
    await expect(book('12:00')).rejects.toThrow('SLOT_UNAVAILABLE');
    await expect(book('17:00')).rejects.toThrow('SLOT_UNAVAILABLE');
  });
  it('reagenda atomicamente e preserva a reserva ao falhar', async () => {
    await as(alice);
    const id = (
      await db.query<{ id: string }>(
        'select id from public.appointments order by starts_at limit 1',
      )
    ).rows[0].id;
    await db.query("select public.change_appointment($1,'reschedule',$2)", [
      id,
      `${day}T10:00:00-03:00`,
    ]);
    await expect(
      db.query("select public.change_appointment($1,'reschedule',$2)", [
        id,
        `${day}T08:30:00-03:00`,
      ]),
    ).rejects.toThrow('SLOT_UNAVAILABLE');
    expect(
      (
        await db.query<{ t: string }>(
          "select (starts_at at time zone 'America/Sao_Paulo')::time::text t from public.appointments where id=$1",
          [id],
        )
      ).rows[0].t,
    ).toBe('10:00:00');
  });
  it('não permite ler ou alterar reserva de outro cliente', async () => {
    await as(admin);
    const id = (
      await db.query<{ id: string }>(
        'select a.id from public.appointments a join public.customers c on c.id=a.customer_id where c.profile_id=$1',
        [bob],
      )
    ).rows[0].id;
    await as(alice);
    expect(
      (await db.query('select * from public.appointments where id=$1', [id]))
        .rows,
    ).toHaveLength(0);
    await expect(
      db.query("select public.change_appointment($1,'cancelled')", [id]),
    ).rejects.toThrow('FORBIDDEN');
  });
  it('impede auto promoção e administração pelo cliente', async () => {
    await as(alice);
    await expect(
      db.exec("update public.profiles set role='admin' where id=auth.uid()"),
    ).rejects.toThrow();
    await expect(
      db.query('select public.save_block($1,$2,$3)', [
        pro,
        `${day}T14:00:00-03:00`,
        `${day}T15:00:00-03:00`,
      ]),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      db.query('select public.admin_report($1,$1)', [day]),
    ).rejects.toThrow('FORBIDDEN');
  });
  it('cancela e libera a ocupação', async () => {
    await as(alice);
    const id = (
      await db.query<{ id: string }>(
        'select id from public.appointments limit 1',
      )
    ).rows[0].id;
    await db.query("select public.change_appointment($1,'cancelled')", [id]);
    expect((await book('10:00')).rows[0].id).toBeTruthy();
  });
  it('recusa conclusão antes do fim', async () => {
    await as(admin);
    const id = (
      await db.query<{ id: string }>(
        "select id from public.appointments where status='scheduled' limit 1",
      )
    ).rows[0].id;
    await expect(
      db.query("select public.change_appointment($1,'completed')", [id]),
    ).rejects.toThrow('APPOINTMENT_NOT_FINISHED');
  });
  it('concede pontos uma única vez e recusa resgate sem saldo', async () => {
    await root();
    const c = (
      await db.query<{ id: string }>(
        'select id from public.customers where profile_id=$1',
        [alice],
      )
    ).rows[0].id;
    const a = (
      await db.query<{ id: string }>(
        "insert into public.appointments(customer_id,professional_id,service_id,starts_at,ends_at,status,price_cents) values($1,$2,$3,now()-interval '2 days',now()-interval '2 days'+interval '30 minutes','completed',3000) returning id",
        [c, pro, svc],
      )
    ).rows[0].id;
    await db.query(
      'insert into public.loyalty_rules(service_id,points,active) values($1,10,true)',
      [svc],
    );
    const reward = (
      await db.query<{ id: string }>(
        "insert into public.loyalty_rewards(name,cost,active) values('Recompensa de teste',20,true) returning id",
      )
    ).rows[0].id;
    await as(admin);
    await db.query('select public.grant_points($1,gen_random_uuid())', [a]);
    await db.query('select public.grant_points($1,gen_random_uuid())', [a]);
    expect(
      (
        await db.query<{ n: number }>(
          'select count(*)::int n from public.loyalty_transactions where appointment_id=$1',
          [a],
        )
      ).rows[0].n,
    ).toBe(1);
    await expect(
      db.query('select public.redeem_reward($1,$2,gen_random_uuid())', [
        c,
        reward,
      ]),
    ).rejects.toThrow('INSUFFICIENT_POINTS');
  });
  it('RLS mantém clientes, pontos e eventos isolados', async () => {
    await as(bob);
    expect(
      (
        await db.query('select * from public.customers where profile_id=$1', [
          alice,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (await db.query('select * from public.loyalty_transactions')).rows,
    ).toHaveLength(0);
  });
  it('feriado fecha disponibilidade e exceção respeita São Paulo', async () => {
    await root();
    await db.query(
      'insert into public.schedule_exceptions(professional_id,day,closed) values($1,$2,true)',
      [pro, day],
    );
    await as(alice);
    expect(
      (
        await db.query('select * from public.available_slots($1,$2,$3)', [
          svc,
          pro,
          day,
        ])
      ).rows,
    ).toHaveLength(0);
  });
  it('catálogo público não vaza registros ocultos ou dados pessoais', async () => {
    await as('', 'anon');
    expect(
      (await db.query("select * from public.services where status='hidden'"))
        .rows,
    ).toHaveLength(0);
    await expect(db.query('select * from public.customers')).rejects.toThrow();
    await expect(
      db.query('select * from public.schedule_occupancy'),
    ).rejects.toThrow();
  });
});
