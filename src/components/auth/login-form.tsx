'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { emailSchema } from '@/lib/domain/validation';
import { googleAvailable } from '@/lib/auth/providers';
export function LoginForm({
  configured,
  admin = false,
  googleEnabled = false,
}: {
  configured: boolean;
  admin?: boolean;
  googleEnabled?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordMode, setPasswordMode] = useState(admin);
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!emailSchema.safeParse({ email }).success) {
      setMessage('Informe um e-mail válido.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const db = createClient();
      if (passwordMode) {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(admin ? '/admin' : '/conta');
        router.refresh();
      } else if (sent) {
        const { error } = await db.auth.verifyOtp({
          email,
          token: code,
          type: 'email',
        });
        if (error) throw error;
        router.push('/conta');
        router.refresh();
      } else {
        const { error } = await db.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
        setSent(true);
        setMessage('Confira seu e-mail e informe o código recebido.');
      }
    } catch {
      setMessage(
        'Não foi possível entrar. Verifique os dados, o código ou tente novamente em instantes.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    try {
      if (!(await googleAvailable())) {
        setMessage('O acesso com Google ainda não está disponível. Use seu e-mail ou acesso com senha.');
        setBusy(false);
        return;
      }
      const { error } = await createClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setMessage(
        'Login Google indisponível. Use seu e-mail ou confirme a configuração do provedor.',
      );
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      {!configured ? (
        <p className="notice">
          O acesso será liberado após a configuração do Supabase local. O
          catálogo já está disponível para consulta.
        </p>
      ) : null}
      <form className="stack" onSubmit={submit}>
        <label className="field">
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
            }}
            required
            disabled={!configured}
          />
        </label>
        {passwordMode ? (
          <label className="field">
            Senha
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        ) : sent ? (
          <label className="field">
            Código de acesso
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
        ) : null}
        {message ? (
          <p className="notice" role="status">
            {message}
          </p>
        ) : null}
        <Button disabled={!configured || busy}>
          {busy
            ? 'Aguarde…'
            : passwordMode
              ? 'Entrar'
              : sent
                ? 'Confirmar código'
                : 'Receber código por e-mail'}
        </Button>
      </form>
      <Button variant="outline" onClick={google} disabled={!configured || !googleEnabled || busy}>
        Continuar com Google
      </Button>
      {configured && !googleEnabled ? <p className="muted">Acesso com Google indisponível no momento. Utilize e-mail ou senha.</p> : null}
      <button
        className="text-link"
        onClick={() => {
          setPasswordMode(!passwordMode);
          setSent(false);
          setMessage('');
        }}
      >
        {passwordMode
          ? 'Entrar ou recuperar acesso por código de e-mail'
          : 'Acesso com senha / conta de teste'}
      </button>
      <p className="muted" style={{ fontSize: 12 }}>
        Seu telefone nunca é usado como prova de identidade. O acesso é validado
        pelo Supabase Auth.
      </p>
    </div>
  );
}
