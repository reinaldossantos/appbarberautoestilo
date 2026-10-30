import { BookingForm } from '@/components/booking/booking-form';
import { PageHeading } from '@/components/ui/page-heading';
import { getServices, getProfessionals, getSettings } from '@/lib/data/public';
import { getSession } from '@/lib/auth/session';
export const metadata = { title: 'Agendar' };
export default async function Book({
  searchParams,
}: {
  searchParams: Promise<{ servico?: string }>;
}) {
  const [{ servico }, services, professionals, settings, session] =
    await Promise.all([
      searchParams,
      getServices(),
      getProfessionals(),
      getSettings(),
      getSession(),
    ]);
  const customer = session
    ? (
        await session.db
          .from('customers')
          .select('id')
          .eq('profile_id', session.user.id)
          .maybeSingle()
      ).data
    : null;
  return (
    <div className="container page-content">
      <PageHeading eyebrow="Seu próximo estilo" title="Reserve seu momento.">
        Escolha seu cuidado, encontre um horário e deixe o resto com a gente.
      </PageHeading>
      <BookingForm
        services={services}
        professionals={professionals}
        initialService={servico}
        enabled={settings?.booking_enabled ?? false}
        signedIn={!!session}
        profileReady={!!customer}
      />
    </div>
  );
}
