import { InstallCard } from '@/components/pwa/install-card';
import { PageHeading } from '@/components/ui/page-heading';

export const metadata = { title: 'Instalar no celular' };
export default function InstallPage() {
  return (
    <div className="container page-content narrow">
      <PageHeading eyebrow="Sempre por perto" title="Seu cuidado, a um toque.">
        Leve a Auto-estilo para a tela inicial do seu celular.
      </PageHeading>
      <InstallCard />
    </div>
  );
}
