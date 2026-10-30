import { LoginForm } from '@/components/auth/login-form';
import { isConfigured } from '@/lib/supabase/config';
import { PageHeading } from '@/components/ui/page-heading';
export const metadata = { title: 'Entrar' };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string }>;
}) {
  const { admin } = await searchParams;
  return (
    <div className="container section">
      <div className="narrow">
        <PageHeading
          eyebrow="Bem-vindo à Auto-estilo"
          title={admin ? 'Acesso administrativo' : 'Seu estilo começa aqui.'}
        >
          Entre para agendar e acompanhar seus atendimentos.
        </PageHeading>
        <div className="panel">
          <LoginForm configured={isConfigured()} admin={admin === '1'} />
        </div>
      </div>
    </div>
  );
}
