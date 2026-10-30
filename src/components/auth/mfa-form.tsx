'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
export function MfaForm() {
  const [factor, setFactor] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function setup() {
    setBusy(true);
    setMessage('');
    try {
      const db = createClient();
      const { data: list, error: listError } = await db.auth.mfa.listFactors();
      if (listError) throw listError;
      const existing = list.totp.find((f) => f.status === 'verified');
      if (existing) {
        setFactor(existing.id);
        setMessage('Informe o código do seu aplicativo autenticador.');
      } else {
        for (const f of list.all.filter((f) => f.status === 'unverified'))
          await db.auth.mfa.unenroll({ factorId: f.id });
        const { data, error } = await db.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Auto-estilo',
        });
        if (error) throw error;
        setFactor(data.id);
        setQr(data.totp.qr_code);
      }
    } catch {
      setMessage('Não foi possível iniciar a autenticação em duas etapas.');
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await createClient().auth.mfa.challengeAndVerify({
        factorId: factor,
        code,
      });
      if (error) throw error;
      setQr('');
      setMessage('Autenticação em duas etapas confirmada.');
      router.refresh();
    } catch {
      setMessage('Código inválido ou expirado. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel stack">
      <h2>Autenticação em duas etapas</h2>
      <p className="muted">
        Proteja sua conta com um aplicativo autenticador. Após a ativação, o
        painel administrativo exige a segunda etapa.
      </p>
      {!factor ? (
        <Button onClick={setup} disabled={busy}>
          Configurar ou verificar autenticador
        </Button>
      ) : (
        <form className="stack" onSubmit={verify}>
          {qr ? (
            <Image
              unoptimized
              src={qr}
              alt="QR code para configurar o aplicativo autenticador"
              width={220}
              height={220}
            />
          ) : null}
          <label className="field">
            Código de seis dígitos
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              required
            />
          </label>
          <Button disabled={busy}>Confirmar código</Button>
        </form>
      )}
      {message ? (
        <p className="notice" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
