import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Auto-estilo Barbershop',
    short_name: 'Auto-estilo',
    description: 'Seu estilo, sua identidade. Agende seu cuidado em Muriaé.',
    start_url: '/',
    id: '/',
    scope: '/',
    shortcuts: [
      { name: 'Agendar atendimento', short_name: 'Agendar', url: '/agendar' },
      { name: 'Meus agendamentos', short_name: 'Minha conta', url: '/conta' },
    ],
    display: 'standalone',
    background_color: '#101114',
    theme_color: '#101114',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
