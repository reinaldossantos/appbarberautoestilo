import type { Service } from './types';
const supplied: [
  string,
  number | null,
  number | null,
  Service['status'],
  string,
][] = [
  ['Corte', 3000, 30, 'active', 'Um novo corte. A sua melhor versão.'],
  [
    'Corte + pigmentação',
    4500,
    45,
    'active',
    'Estilo e acabamento em cada detalhe.',
  ],
  [
    'Corte + luzes',
    7500,
    null,
    'active',
    'Uma nova expressão para o seu visual.',
  ],
  ['Corte + platinado', 8500, null, 'active', 'Personalidade que se destaca.'],
  ['Pezinho', 1500, 10, 'active', 'O acabamento que faz a diferença.'],
  [
    'Corte + barba',
    4000,
    45,
    'active',
    'Seu estilo completo, do cabelo à barba.',
  ],
  ['Limpeza nasal', 1500, 20, 'active', 'Cuidado nos pequenos detalhes.'],
  [
    'Barberterapia',
    null,
    null,
    'coming_soon',
    'Um momento de cuidado para você.',
  ],
  ['Limpeza facial', null, null, 'coming_soon', 'Mais cuidado na sua rotina.'],
  [
    'Hidratação capilar',
    null,
    null,
    'coming_soon',
    'Seu cabelo merece esse cuidado.',
  ],
];
export const initialServices: Service[] = supplied.map(
  ([name, price_cents, duration_minutes, status, description], i) => ({
    id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    name,
    price_cents,
    duration_minutes,
    status,
    description,
    category: i < 7 ? 'Estilo & cuidado' : 'Novidades',
    sort_order: i,
  }),
);
export const canBook = (service: Service) =>
  service.status === 'active' &&
  service.duration_minutes !== null &&
  service.duration_minutes > 0 &&
  service.price_cents !== null;
export const business = {
  name: 'Auto-estilo Barbershop',
  address: 'Rua Santa Rita, nº 307, Centro, Muriaé – MG',
  whatsapp: '553298553119',
  professional: 'Andrezinho',
};
