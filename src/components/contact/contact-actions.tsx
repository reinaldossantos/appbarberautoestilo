'use client';
import { useState } from 'react';
import { Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function ContactActions({ address }: { address: string }) {
  const [message, setMessage] = useState('');
  return (
    <div className="stack">
      <div className="row-actions">
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(address);
              setMessage('Endereço copiado.');
            } catch {
              setMessage(
                'Não foi possível copiar. Selecione o endereço acima.',
              );
            }
          }}
        >
          <Copy size={16} />
          Copiar endereço
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              if (navigator.share)
                await navigator.share({
                  title: 'Auto-estilo Barbershop',
                  url: window.location.origin,
                });
              else {
                await navigator.clipboard.writeText(window.location.origin);
                setMessage('Link copiado.');
              }
            } catch {
              setMessage('Compartilhamento não concluído.');
            }
          }}
        >
          <Share2 size={16} />
          Compartilhar
        </Button>
      </div>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
