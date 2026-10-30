import { LoginForm } from '@/components/auth/login-form';
import { isConfigured } from '@/lib/supabase/config';
import { PageHeading } from '@/components/ui/page-heading';
import { googleAvailable } from '@/lib/auth/providers';
export const metadata = { title: 'Entrar' };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string; erro?: string }>;
}) {
  const { admin, erro } = await searchParams;
  const googleEnabled = await googleAvailable();
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
          {erro === 'autenticacao' ? <p role="alert" className="notice">Não foi possível concluir o acesso. Tente novamente ou utilize e-mail e senha.</p> : null}
          <LoginForm configured={isConfigured()} admin={admin === '1'} googleEnabled={googleEnabled} />
        </div>
      </div>
    </div>
  );
}
