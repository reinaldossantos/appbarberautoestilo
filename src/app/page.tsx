import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Scissors,
  HeartHandshake,
  Sparkles,
} from 'lucide-react';
import { getServices } from '@/lib/data/public';
import { ServiceCard } from '@/components/services/service-card';
import { QuickActions } from '@/components/home/quick-actions';
import './brand.css';
export default async function Home() {
  const services = await getServices();
  const highlights = [
    services.find((s) => s.name === 'Corte'),
    services.find((s) => s.name === 'Corte + barba'),
    services.find((s) => s.name === 'Corte + pigmentação'),
  ].filter((s) => !!s);
  return (
    <>
      <div className="container hero">
        <div>
          <span className="eyebrow">Sua barbearia em Muriaé</span>
          <h1>
            Seu estilo.
            <br />
            Sua identidade.
            <br />
            <span className="text-gold">Seu momento.</span>
          </h1>
          <p className="intro">
            Mais que um corte, um estilo de vida. Aqui, cada detalhe é pensado
            para você sair com confiança e se sentir bem.
          </p>
          <div className="hero-actions">
            <Link href="/agendar" className="button button-gold">
              <CalendarDays size={18} /> Agendar meu horário{' '}
              <ArrowRight size={17} />
            </Link>
            <Link href="/servicos" className="button button-outline">
              Conhecer serviços
            </Link>
          </div>
          <p className="hero-note">
            <MapPin size={15} /> Rua Santa Rita, 307 · Centro, Muriaé
          </p>
        </div>
        <div className="hero-art">
          <Image
            src="/andrezinho.jpeg"
            alt="Andrezinho com a tesoura e o uniforme da Auto-estilo"
            fill
            preload
            sizes="(max-width: 640px) 90vw, 500px"
          />
          <div className="art-caption">
            <div><span className="portrait-signature">Andrezinho</span><span>Seu barbeiro. Sua melhor versão.</span></div>
            <Link href="/sobre" aria-label="Conheça a história do Andrezinho" className="icon-link"><ArrowRight size={20} /></Link>
          </div>
        </div>
      </div>
      <QuickActions />
      <div className="values-strip">
        <div className="container values-inner">
          <div className="value-item">
            <Scissors />
            <div>
              Cuidado em cada detalhe<small>Técnica e personalidade</small>
            </div>
          </div>
          <div className="value-item">
            <HeartHandshake />
            <div>
              Você em primeiro lugar<small>Atendimento de perto</small>
            </div>
          </div>
          <div className="value-item">
            <Sparkles />
            <div>
              Seu estilo, valorizado
              <small>Uma experiência feita para você</small>
            </div>
          </div>
        </div>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">O próximo visual começa aqui</span>
            <h2>Escolha o seu cuidado.</h2>
          </div>
          <Link href="/servicos" className="text-link">
            Todos os serviços <ArrowRight size={16} />
          </Link>
        </div>
        <div className="service-grid">
          {highlights.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              featured={s.name === 'Corte + barba'}
            />
          ))}
        </div>
      </section>
      <section className="story-section">
        <div className="container section story-grid">
          <div className="story-mark">
            <span className="eyebrow">Uma história de determinação</span>
            <div className="years">13 → 16</div>
            <h3>
              Uma paixão que virou
              <br />
              um sonho de verdade.
            </h3>
            <p>
              Aos 13 anos, o primeiro curso.
              <br />
              Aos 16, a construção da própria história.
            </p>
          </div>
          <div className="story-copy">
            <span className="eyebrow">Por trás da cadeira</span>
            <h2>Prazer, Andrezinho.</h2>
            <p>
              Uma vontade de crescer, muita dedicação e a fé de quem sabe aonde
              quer chegar. A Auto-estilo nasceu de um sonho que começou cedo e
              continua evoluindo a cada atendimento.
            </p>
            <p>Aqui, você faz parte dessa história.</p>
            <Link href="/sobre" className="text-link">
              Conheça o Andrezinho <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="cta">
          <div>
            <span className="eyebrow">Reserve um tempo para você</span>
            <h2 style={{ marginTop: 15 }}>Seu próximo estilo está aqui.</h2>
            <p>Escolha seu serviço e encontre o melhor momento.</p>
          </div>
          <Link href="/agendar" className="button button-gold">
            Vamos agendar? <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
