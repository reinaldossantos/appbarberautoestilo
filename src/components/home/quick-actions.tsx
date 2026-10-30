import Link from 'next/link';
import { CalendarDays, Scissors, UserRound, MapPin } from 'lucide-react';

const actions = [
  { href: '/agendar', label: 'Agendar horário', icon: CalendarDays },
  { href: '/servicos', label: 'Nossos serviços', icon: Scissors },
  { href: '/sobre', label: 'Conheça o André', icon: UserRound },
  { href: '/contato', label: 'Localização', icon: MapPin },
];

export function QuickActions() {
  return (
    <nav className="container quick-actions" aria-label="Explore a barbearia">
      {actions.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}>
          <Icon size={25} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
