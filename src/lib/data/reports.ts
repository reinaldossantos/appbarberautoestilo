import 'server-only';
import { requireAdmin } from '@/lib/auth/session';
import { z } from 'zod';
export async function getReport(
  from?: string,
  to?: string,
  service?: string,
  professional?: string,
) {
  const { db } = await requireAdmin();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const start = z.iso.date().safeParse(from).success ? from! : today;
  const end = z.iso.date().safeParse(to).success ? to! : today;
  const selectedService = z.uuid().safeParse(service).success ? service! : '';
  const selectedProfessional = z.uuid().safeParse(professional).success
    ? professional!
    : '';
  const periodInvalid =
    end < start || (Date.parse(end) - Date.parse(start)) / 86400000 > 366;
  const [services, professionals] = await Promise.all([
    db.from('services').select('id,name').order('name'),
    db.from('professionals').select('id,name').order('name'),
  ]);
  if (services.error || professionals.error)
    throw new Error('Não foi possível carregar os filtros.');
  const { data, error } = periodInvalid
    ? { data: null, error: null }
    : await db.rpc('admin_report_filtered', {
        p_from: start,
        p_to: end,
        p_service: selectedService || null,
        p_professional: selectedProfessional || null,
      });
  if (error) throw error;
  return {
    start,
    end,
    selectedService,
    selectedProfessional,
    periodInvalid,
    services: services.data,
    professionals: professionals.data,
    data: data as {
      scheduled: number;
      completed: number;
      cancelled: number;
      no_show: number;
      value_cents: number;
      blocks: number;
      popular: { name: string; total: number }[];
      recurring: { name: string; total: number }[];
    },
  };
}
