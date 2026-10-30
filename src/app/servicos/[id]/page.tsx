import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getServices } from '@/lib/data/public';
import { canBook } from '@/lib/domain/catalog';
import { money } from '@/lib/utils';
import { PageHeading } from '@/components/ui/page-heading';
import { ActionForm } from '@/components/forms/action-form';
import { expressInterest } from '@/lib/actions/profile';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const services = await getServices();
  const service = services.find((s) => s.id === id);
  if (!service) notFound();
  const session = await getSession();
  const image =
    service.image_path
      ? (await createClient()).storage
          .from('business-images')
          .getPublicUrl(service.image_path).data.publicUrl
      : null;
  return (
    <div className="container page-content narrow">
      <PageHeading eyebrow="Estilo & cuidado" title={service.name}>
        {service.description}
      </PageHeading>
      <div className="panel stack">
        {image ? (
          <Image
            src={image}
            unoptimized
            alt={service.name}
            width={600}
            height={400}
          />
        ) : null}
        <div className="service-price">
          {service.price_cents === null
            ? 'Preço a definir'
            : money(service.price_cents)}
        </div>
        <p className="muted">
          {service.duration_minutes
            ? `${service.duration_minutes} minutos`
            : 'Duração a definir com a barbearia'}
        </p>
        {canBook(service) ? (
          <Link
            className="button button-gold"
            href={`/agendar?servico=${service.id}`}
          >
            Escolher meu horário
          </Link>
        ) : (
          <p className="notice">
            {service.status === 'coming_soon'
              ? 'Este serviço estará disponível em breve.'
              : 'O agendamento online será liberado quando a duração estiver definida.'}
          </p>
        )}
        {service.status === 'coming_soon' ? (
          session ? (
            <ActionForm action={expressInterest} submit="Tenho interesse">
              <input type="hidden" name="service_id" value={service.id} />
              <label className="checkbox-line">
                <input type="checkbox" name="consent" required />
                Autorizo o registro do meu interesse neste serviço para contato
                relacionado à disponibilidade.
              </label>
            </ActionForm>
          ) : (
            <Link className="text-link" href="/login">
              Entre para registrar seu interesse
            </Link>
          )
        ) : null}
      </div>
    </div>
  );
}
