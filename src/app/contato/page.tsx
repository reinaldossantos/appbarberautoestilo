import { relatedName } from '@/lib/utils';
import { MapPin, ArrowUpRight, MessageCircle } from 'lucide-react';
import { getSettings } from '@/lib/data/public';
import { business } from '@/lib/domain/catalog';
import { PageHeading } from '@/components/ui/page-heading';
import { ContactActions } from '@/components/contact/contact-actions';
import { isConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
export const metadata = { title: 'Contato e localização' };
export default async function Contact() {
  const s = await getSettings();
  const address = s?.address || business.address;
  const whatsapp = s?.whatsapp || business.whatsapp;
  const hours = isConfigured()
    ? (
        await (
          await createClient()
        )
          .from('business_hours')
          .select('weekday,opens_at,closes_at,professionals(name)')
          .order('weekday')
      ).data
    : [];
  const days = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ];
  return (
    <div className="container page-content">
      <PageHeading
        eyebrow="A gente se encontra aqui"
        title="Seu estilo tem endereço."
      >
        No Centro de Muriaé, pertinho de você.
      </PageHeading>
      <div className="contact-grid">
        <div className="panel stack">
          <MapPin className="text-gold" />
          <h2>Auto-estilo Barbershop</h2>
          <p>{address}</p>
          <a
            className="button button-gold"
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Traçar rota no Google Maps <ArrowUpRight size={17} />
          </a>
          <a
            className="button button-outline"
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá! Gostaria de saber mais sobre os atendimentos da Auto-estilo.')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={17} />
            Conversar pelo WhatsApp
          </a>
          <ContactActions address={address} />
        </div>
        <div className="stack">
          <div className="location-art">
            <div className="location-label">
              <MapPin size={32} />
              <strong>Auto-estilo</strong>
              <p style={{ margin: 0 }} className="muted">
                Centro · Muriaé, MG
              </p>
            </div>
          </div>
          <div className="panel">
            <h3>Funcionamento</h3>
            {hours?.length ? (
              hours.map((h, i) => (
                <p key={i} className="muted">
                  {days[h.weekday]} · {h.opens_at.slice(0, 5)}–
                  {h.closes_at.slice(0, 5)} · {relatedName(h.professionals)}
                </p>
              ))
            ) : (
              <p className="muted">
                Horários em definição. Consulte a barbearia pelo WhatsApp.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
