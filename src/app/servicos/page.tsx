import { getServices } from '@/lib/data/public';
import { ServiceCatalog } from '@/components/services/service-catalog';
import { PageHeading } from '@/components/ui/page-heading';
export const metadata = { title: 'Serviços' };
export default async function Services() {
  const services = await getServices();
  return (
    <div className="container page-content">
      <PageHeading
        eyebrow="Estilo & cuidado"
        title="Um cuidado para cada estilo."
      >
        Preços transparentes e atenção em cada detalhe. Escolha o que combina
        com você.
      </PageHeading>
      <ServiceCatalog services={services} />
    </div>
  );
}
