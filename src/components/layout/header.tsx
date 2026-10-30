import Link from 'next/link';
import { Scissors, CalendarDays, UserRound } from 'lucide-react';
import { MainNavigation } from './navigation';
export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="Auto-estilo, início">
          <Scissors aria-hidden="true" />
          <span>
            Auto-estilo<small>BARBERSHOP</small>
          </span>
        </Link>
        <MainNavigation />
        <div className="header-actions">
          <Link href="/conta" className="account-link" aria-label="Minha conta">
            <UserRound size={18} />
            <span>Minha conta</span>
          </Link>
          <Link className="button button-gold button-sm" href="/agendar">
            <CalendarDays size={16} /> Agendar
          </Link>
        </div>
      </div>
      <nav className="mobile-nav" aria-label="Navegação móvel">
        <Link href="/servicos">Serviços</Link>
        <Link href="/sobre">Nossa história</Link>
        <Link href="/contato">Contato</Link>
      </nav>
    </header>
  );
}
