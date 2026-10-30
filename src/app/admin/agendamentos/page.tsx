import { AdminAppointmentList } from '@/components/admin/appointment-list';
export default async function Appointments({
  searchParams,
}: {
  searchParams: Promise<{
    day?: string;
    service?: string;
    professional?: string;
    page?: string;
  }>;
}) {
  return <AdminAppointmentList filters={await searchParams} />;
}
