import { Scissors, Sparkles, Droplets, WandSparkles } from 'lucide-react';
import './service-visual.css';

const names = [
  'Corte',
  'Corte + pigmentação',
  'Corte + luzes',
  'Corte + platinado',
  'Pezinho',
  'Corte + barba',
  'Limpeza nasal',
  'Barberterapia',
  'Limpeza facial',
  'Hidratação capilar',
];

export function ServiceVisual({ name }: { name: string }) {
  const index = names.indexOf(name);
  const Icon = /Limpeza|Hidratação/.test(name)
    ? Droplets
    : /luzes|platinado|pigmentação/.test(name)
      ? WandSparkles
      : name === 'Barberterapia'
        ? Sparkles
        : Scissors;
  return (
    <div className="service-visual" aria-hidden="true">
      {index >= 0 ? (
        <div
          className="service-photo"
          style={{
            backgroundPosition: `${(index % 5) * 25}% ${index < 5 ? 0 : 100}%`,
          }}
        />
      ) : null}
      <span className="service-visual-icon">
        <Icon size={18} />
      </span>
    </div>
  );
}
