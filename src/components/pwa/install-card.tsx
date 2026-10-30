'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallCard() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)');
    const update = () =>
      setInstalled(
        display.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
      setMessage('Aplicativo instalado.');
    };
    update();
    display.addEventListener('change', update);
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', done);
    return () => {
      display.removeEventListener('change', update);
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  async function install() {
    if (!prompt) return;
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === 'accepted'
          ? 'Pedido aceito. Aguarde a confirmação do seu dispositivo.'
          : 'Você pode continuar usando pelo navegador.',
      );
      setPrompt(null);
    } catch {
      setMessage(
        'Não foi possível iniciar a instalação. Use o menu do navegador.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel stack" aria-labelledby="install-title">
      <Smartphone className="text-gold" size={32} />
      <h2 id="install-title">Auto-estilo na sua tela inicial</h2>
      <p className="muted">
        Acesse seus horários com um toque. A instalação é opcional e você
        continua usando a mesma conta.
      </p>
      {installed ? (
        <p className="notice success">
          Você já está usando o aplicativo instalado.
        </p>
      ) : (
        <>
          {prompt ? (
            <Button onClick={install} disabled={busy}>
              <Download size={18} />
              {busy ? 'Abrindo instalação…' : 'Instalar aplicativo'}
            </Button>
          ) : (
            <p className="notice">
              Se o navegador oferecer instalação, use o menu dele. As opções
              variam conforme o aparelho.
            </p>
          )}
          <div className="form-grid">
            <div>
              <h3>No Android</h3>
              <p className="muted">
                Abra este site no Chrome e procure “Instalar aplicativo” ou
                “Adicionar à tela inicial” no menu.
              </p>
            </div>
            <div>
              <h3>No iPhone</h3>
              <p className="muted">
                Abra no Safari, toque em Compartilhar e escolha “Adicionar à
                Tela de Início”.
              </p>
            </div>
          </div>
        </>
      )}
      {message ? (
        <p role="status" className="notice">
          {message}
        </p>
      ) : null}
      <p className="muted">
        Para consultar a agenda e confirmar reservas, mantenha a conexão com a
        internet.
      </p>
    </section>
  );
}
