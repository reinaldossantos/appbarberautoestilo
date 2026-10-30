'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { profileSchema, type ActionResult } from '@/lib/domain/validation';
import { failure } from './result';
import { z } from 'zod';
export async function saveProfile(input: unknown): Promise<ActionResult> {
  const { db } = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  const { error } = await db.rpc('save_customer', {
    p_name: parsed.data.name,
    p_phone: parsed.data.phone,
    p_consent: parsed.data.consent,
  });
  if (error) return failure(error);
  revalidatePath('/conta');
  return { ok: true, message: 'Perfil atualizado. Você já pode agendar.' };
}
export async function expressInterest(form: FormData): Promise<ActionResult> {
  const { db, user } = await requireUser();
  const id = z.uuid().safeParse(form.get('service_id'));
  if (!id.success || form.get('consent') !== 'on')
    return { ok: false, message: 'Confirme seu interesse e o consentimento.' };
  const { error } = await db
    .from('service_interest')
    .insert({ profile_id: user.id, service_id: id.data });
  if (error?.code === '23505')
    return { ok: true, message: 'Seu interesse já está registrado.' };
  if (error) return failure(error);
  return {
    ok: true,
    message: 'Interesse registrado. Nenhuma mensagem automática foi enviada.',
  };
}
export async function privacyRequest(form: FormData): Promise<ActionResult> {
  const { db, user } = await requireUser();
  const kind = z.enum(['access', 'deletion']).safeParse(form.get('kind'));
  if (!kind.success) return failure();
  const { error } = await db
    .from('privacy_requests')
    .insert({ profile_id: user.id, kind: kind.data });
  if (error) return failure(error);
  return {
    ok: true,
    message: 'Solicitação registrada para atendimento pela barbearia.',
  };
}
