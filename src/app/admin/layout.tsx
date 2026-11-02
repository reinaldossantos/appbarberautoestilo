import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
export const dynamic = 'force-dynamic';
const links = [
  ['', 'Visão geral'],
  ['agenda', 'Agenda'],
  ['agendamentos', 'Agendamentos'],
  ['bloqueios', 'Bloqueios'],
  ['clientes', 'Clientes'],
  ['usuarios', 'Usuários e acessos'],
  ['profissionais', 'Profissionais'],
  ['servicos', 'Serviços'],
  ['fidelidade', 'Fidelidade'],
  ['relatorios', 'Relatórios'],
  ['pagamentos', 'Configurações de Pagamento'],
  ['configuracoes', 'Configurações'],
  ['auditoria', 'Auditoria'],
];
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="container admin-shell">
      <nav className="admin-nav" aria-label="Administração">
        <h2>GESTÃO</h2>
        {links.map(([slug, label]) => (
          <Link key={slug} href={`/admin${slug ? '/' + slug : ''}`}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="admin-main">{children}</div>
    </div>
  );
}
