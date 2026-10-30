import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { PageHeading } from '@/components/ui/page-heading';
import { Logout } from '@/components/auth/logout';
export const dynamic = 'force-dynamic';
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  return (
    <div className="container page-content">
      <PageHeading
        eyebrow="Meu espaço"
        title={`Olá${session.profile?.display_name ? ', ' + session.profile.display_name.split(' ')[0] : ''}.`}
      >
        Seu próximo atendimento e todos os seus cuidados, em um só lugar.
      </PageHeading>
      <nav className="account-nav" aria-label="Minha conta">
        <Link href="/conta">Agendamentos</Link>
        <Link href="/conta/fidelidade">Fidelidade</Link>
        <Link href="/conta/perfil">Meu perfil</Link>
        <Link href="/conta/seguranca">Segurança</Link>
        {session.profile?.role === 'admin' ? (
          <Link href="/admin">Administração</Link>
        ) : null}
        <Logout />
      </nav>
      {children}
    </div>
  );
}
