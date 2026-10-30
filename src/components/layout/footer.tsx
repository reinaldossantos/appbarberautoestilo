import Link from 'next/link';
import { Scissors, ArrowUpRight } from 'lucide-react';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="brand">
            <Scissors />
            <span>
              Auto-estilo<small>BARBERSHOP</small>
            </span>
          </Link>
          <p>
            Mais que um corte,
            <br />
            um estilo de vida.
          </p>
        </div>
        <div>
          <h2>Seu próximo estilo</h2>
          <Link href="/servicos">Nossos serviços</Link>
          <Link href="/agendar">Agendar horário</Link>
          <Link href="/conta">Meus agendamentos</Link>
          <Link href="/instalar">Instalar no celular</Link>
        </div>
        <div>
          <h2>Feito em Muriaé</h2>
          <p>
            Rua Santa Rita, nº 307
            <br />
            Centro, Muriaé – MG
          </p>
          <Link href="/contato">
            Como chegar <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>Auto-estilo Barbershop · Cuidado em cada detalhe.</span>
        <Link href="/privacidade">Privacidade</Link>
        <Link href="/admin">Administração</Link>
      </div>
    </footer>
  );
}
