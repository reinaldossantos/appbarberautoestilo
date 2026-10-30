'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/lib/domain/validation';
export function ActionForm({
  action,
  children,
  submit = 'Salvar',
  className = 'stack',
}: {
  action: (data: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submit?: string;
  className?: string;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className={className}
      action={(form) =>
        start(async () => {
          setResult(null);
          try {
            setResult(await action(form));
          } catch {
            setResult({
              ok: false,
              message:
                'Não foi possível concluir. Verifique sua conexão e sessão.',
            });
          }
        })
      }
    >
      {children}
      {result ? (
        <p
          role="status"
          className={`notice ${result.ok ? 'success' : 'error'}`}
        >
          {result.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Salvando…' : submit}
      </Button>
    </form>
  );
}
