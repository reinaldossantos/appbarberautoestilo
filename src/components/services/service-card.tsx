import Link from 'next/link';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { ServiceVisual } from './service-visual';
import type { Service } from '@/lib/domain/types';
import { canBook } from '@/lib/domain/catalog';
import { money } from '@/lib/utils';
import './service-card.css';
export function ServiceCard({
  service,
  featured = false,
}: {
  service: Service;
  featured?: boolean;
}) {
  return (
    <article className={`service-card ${featured ? 'featured' : ''}`}>
      <ServiceVisual name={service.name} />
      {service.status === 'coming_soon' ? (
        <span className="badge">EM BREVE</span>
      ) : featured ? (
        <span className="badge">ESTILO COMPLETO</span>
      ) : null}
      <h3>
        <Link href={`/servicos/${service.id}`}>{service.name}</Link>
      </h3>
      <p>{service.description}</p>
      <div className="service-bottom">
        <div className="service-price">
          {service.price_cents === null
            ? 'Em breve'
            : money(service.price_cents)}
          <small>
            <Clock3 size={11} style={{ display: 'inline', marginRight: 4 }} />
            {service.duration_minutes
              ? `${service.duration_minutes} minutos`
              : 'Duração a definir'}
          </small>
        </div>
        <Link
          className="icon-link"
          aria-label={`${canBook(service) ? 'Agendar' : 'Ver detalhes de'} ${service.name}`}
          href={
            canBook(service)
              ? `/agendar?servico=${service.id}`
              : `/servicos/${service.id}`
          }
        >
          <ArrowUpRight size={20} />
        </Link>
      </div>
    </article>
  );
}
