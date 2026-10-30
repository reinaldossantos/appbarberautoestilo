import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { PwaRegister } from '@/components/pwa/register';
import { MobileNavigation } from '@/components/layout/navigation';
import './globals.css';
import './navigation.css';
export const metadata: Metadata = {
  title: {
    default: 'Auto-estilo Barbershop | Seu estilo, sua identidade',
    template: '%s | Auto-estilo',
  },
  description:
    'Corte, barba e cuidado com Andrezinho. Conheça a Auto-estilo Barbershop, no Centro de Muriaé, e agende seu próximo estilo.',
  applicationName: 'Auto-estilo Barbershop',
  appleWebApp: {
    capable: true,
    title: 'Auto-estilo',
    statusBarStyle: 'default',
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ),
  openGraph: {
    title: 'Auto-estilo Barbershop',
    description: 'Mais que um corte, um estilo de vida.',
    images: ['/logo.png'],
    locale: 'pt_BR',
    type: 'website',
  },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};
export const viewport: Viewport = {
  themeColor: '#101114',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        <Header />
        <PwaRegister />
        <main id="conteudo">{children}</main>
        <Footer />
        <MobileNavigation />
      </body>
    </html>
  );
}
