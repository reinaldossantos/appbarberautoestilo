import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { AppointmentCard } from '@/components/account/appointment-card';
import type { Appointment } from '@/lib/domain/types';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { Pagination } from './pagination';
import { PAGE_SIZE, pageNumber } from '@/lib/domain/pagination';
export async function AdminAppointmentList({
  filters = {},
  pathname = '/admin/agendamentos',
}: {
  filters?: { day?: string; service?: string; professional?: string; page?: string };
  pathname?: string;
}) {
  const { db } = await requireAdmin();
  const page = pageNumber(filters.page);
  const preserved = Object.fromEntries(
    Object.entries(filters).filter(([key, value]) => key !== 'page' && typeof value === 'string'),
  ) as Record<string, string>;
  const [services, pros] = await Promise.all([
    db.from('services').select('id,name'),
    db.from('professionals').select('id,name'),
  ]);
  let query = db
    .from('appointments')
    .select('*,services(name),professionals(name),customers(name,phone)', { count: 'exact' })
    .order('starts_at', { ascending: false })
    .order('id')
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (filters.day && z.iso.date().safeParse(filters.day).success) {
    query = query
      .gte('starts_at', `${filters.day}T00:00:00-03:00`)
      .lt(
        'starts_at',
        new Date(
          new Date(`${filters.day}T00:00:00-03:00`).getTime() + 86400000,
        ).toISOString(),
      );
  }
  if (filters.service && z.uuid().safeParse(filters.service).success)
    query = query.eq('service_id', filters.service);
  if (filters.professional && z.uuid().safeParse(filters.professional).success)
    query = query.eq('professional_id', filters.professional);
  const { data, error, count } = await query;
  if ((error?.code === 'PGRST103' || (!error && !data?.length)) && page > 1) {
    redirect(`${pathname}?${new URLSearchParams({ ...preserved, page: '1' })}`);
  }
  if (error) throw error;
  return (
    <div className="stack">
      <div className="flex-between">
        <h1>Agenda de atendimentos</h1>
        <Link className="button button-gold" href="/admin/agendamentos/novo">
          Agendar cliente
        </Link>
      </div>
      <form className="panel form-grid">
        <label className="field">
          Data
          <input type="date" name="day" defaultValue={filters.day} />
        </label>
        <label className="field">
          Serviço
          <select name="service" defaultValue={filters.service}>
            <option value="">Todos</option>
            {services.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Profissional
          <select name="professional" defaultValue={filters.professional}>
            <option value="">Todos</option>
            {pros.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-outline">Filtrar</button>
      </form>
      {data?.length ? (
        data.map((a) => (
          <div key={a.id}>
            <p className="muted">Cliente: {a.customers?.name}</p>
            <AppointmentCard appointment={a as Appointment} admin customerPhone={a.customers?.phone} />
          </div>
        ))
      ) : (
        <div className="panel empty-state">
          Nenhum atendimento neste filtro.
        </div>
      )}
      <Pagination page={page} count={count ?? 0} pathname={pathname} filters={preserved} noun="atendimentos" />
    </div>
  );
}
