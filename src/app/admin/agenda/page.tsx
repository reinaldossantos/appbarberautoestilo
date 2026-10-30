import { AdminAppointmentList } from '@/components/admin/appointment-list';
export default async function Agenda({
  searchParams,
}: {
  searchParams: Promise<{
    day?: string;
    service?: string;
    professional?: string;
    page?: string;
  }>;
}) {
  const filters = await searchParams;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return (
    <AdminAppointmentList pathname="/admin/agenda" filters={{ ...filters, day: filters.day || today }} />
  );
}
