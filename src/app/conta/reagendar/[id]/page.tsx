import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { getServices, getProfessionals, getSettings } from '@/lib/data/public';
import { BookingForm } from '@/components/booking/booking-form';
export default async function Reschedule({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db, profile } = await requireUser();
  const { data: a } = await db
    .from('appointments')
    .select('*')
    .eq('id', id)
    .eq('status', 'scheduled')
    .maybeSingle();
  if (!a) notFound();
  const [services, professionals, settings] = await Promise.all([
    getServices(),
    getProfessionals(),
    getSettings(),
  ]);
  return (
    <>
      <h2>Reagendar atendimento</h2>
      <p className="muted">
        Sua reserva atual será preservada caso o novo horário fique
        indisponível.
      </p>
      <BookingForm
        services={services}
        professionals={professionals}
        initialService={a.service_id}
        enabled={profile?.role === 'admin' || (settings?.booking_enabled ?? false)}
        signedIn
        profileReady
        reschedule={{ id: a.id, professional: a.professional_id }}
      />
    </>
  );
}
