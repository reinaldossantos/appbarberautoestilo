'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { profileSchema, type ActionResult } from '@/lib/domain/validation';
import { saveProfile } from '@/lib/actions/profile';
export function ProfileForm({
  name = '',
  phone = '',
}: {
  name?: string;
  phone?: string;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name, phone },
  });
  return (
    <form
      className="stack"
      onSubmit={handleSubmit(async (data) => {
        try {
          setResult(await saveProfile(data));
        } catch {
          setResult({
            ok: false,
            message: 'Falha de conexão. Tente novamente.',
          });
        }
      })}
    >
      <label className="field">
        Seu nome
        <input {...register('name')} autoComplete="name" />
        {errors.name ? <small role="alert">{errors.name.message}</small> : null}
      </label>
      <label className="field">
        Telefone / WhatsApp
        <input {...register('phone')} autoComplete="tel" inputMode="tel" />
        {errors.phone ? (
          <small role="alert">{errors.phone.message}</small>
        ) : null}
      </label>
      <label className="checkbox-line">
        <input type="checkbox" {...register('consent')} />
        <span>
          Li a{' '}
          <Link className="text-gold" href="/privacidade">
            política de privacidade
          </Link>{' '}
          e concordo com o uso dos dados para gerenciar meus agendamentos.
        </span>
      </label>
      {errors.consent ? (
        <p className="notice error">{errors.consent.message}</p>
      ) : null}
      {result ? (
        <p
          role="status"
          className={`notice ${result.ok ? 'success' : 'error'}`}
        >
          {result.message}
        </p>
      ) : null}
      <Button disabled={isSubmitting}>Salvar meu perfil</Button>
    </form>
  );
}
