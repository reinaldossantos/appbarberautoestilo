'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Scissors, CalendarDays, UserRound } from 'lucide-react';

export function MainNavigation() {
  const pathname = usePathname();
  return (
    <nav className="desktop-nav" aria-label="Navegação principal">
      {[
        ['/servicos', 'Serviços'],
        ['/sobre', 'O Andrezinho'],
        ['/contato', 'Onde estamos'],
      ].map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname.startsWith(href) ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();
  const items = [
    { href: '/', label: 'Início', icon: Home },
    { href: '/servicos', label: 'Serviços', icon: Scissors },
    { href: '/agendar', label: 'Agendar', icon: CalendarDays },
    { href: '/conta', label: 'Minha conta', icon: UserRound },
  ];
  return (
    <nav className="mobile-dock" aria-label="Acesso rápido">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={href === '/agendar' ? 'dock-booking' : undefined}
          aria-current={
            (href === '/' ? pathname === '/' : pathname.startsWith(href))
              ? 'page'
              : undefined
          }
        >
          <Icon size={21} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
