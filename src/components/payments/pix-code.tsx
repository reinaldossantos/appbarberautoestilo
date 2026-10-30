'use client';
import { useState } from 'react';
import Image from 'next/image';
export function PixCode({ payload, qr }: { payload: string; qr: string }) {
  const [message, setMessage] = useState('');
  return (
    <div className="panel stack">
      <Image
        src={qr}
        alt="QR Code Pix do atendimento"
        width={320}
        height={320}
        unoptimized
        style={{
          maxWidth: '100%',
          height: 'auto',
          background: '#fff',
          borderRadius: 12,
        }}
      />
      <label className="field">
        Pix Copia e Cola
        <textarea
          readOnly
          value={payload}
          rows={5}
          style={{ overflowWrap: 'anywhere' }}
        />
      </label>
      <button
        className="button button-gold"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(payload);
            setMessage(
              'Código copiado. Confira o beneficiário no aplicativo do seu banco.',
            );
          } catch {
            setMessage('Selecione e copie o código no campo acima.');
          }
        }}
      >
        Copiar código Pix
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
