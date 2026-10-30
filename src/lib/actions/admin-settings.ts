'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import type { ActionResult } from '@/lib/domain/validation';
import { failure } from './result';
const nullableInt = (v: FormDataEntryValue | null) =>
  v === '' || v === null ? null : Number(v);
export async function saveSettings(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      booking_enabled: z.boolean(),
      buffer_minutes: z.number().int().min(0).max(240),
      reschedule_notice_minutes: z.number().int().min(0).max(43200),
      min_notice_minutes: z.number().int().min(0).max(43200).nullable(),
      max_booking_days: z.number().int().min(1).max(365).nullable(),
      cancellation_notice_minutes: z
        .number()
        .int()
        .min(0)
        .max(43200)
        .nullable(),
      retention_days: z.number().int().positive().max(36500).nullable(),
      address: z.string().min(10).max(300),
      whatsapp: z.string().regex(/^\d{10,15}$/),
      story: z.string().max(20000),
    })
    .safeParse({
      booking_enabled: form.get('booking_enabled') === 'on',
      buffer_minutes: Number(form.get('buffer_minutes')),
      reschedule_notice_minutes: Number(form.get('reschedule_notice_minutes')),
      min_notice_minutes: nullableInt(form.get('min_notice_minutes')),
      max_booking_days: nullableInt(form.get('max_booking_days')),
      cancellation_notice_minutes: nullableInt(
        form.get('cancellation_notice_minutes'),
      ),
      retention_days: nullableInt(form.get('retention_days')),
      address: form.get('address'),
      whatsapp: form.get('whatsapp'),
      story: form.get('story'),
    });
  if (!p.success)
    return { ok: false, message: 'Revise os campos de configuração.' };
  if (
    p.data.booking_enabled &&
    (p.data.min_notice_minutes === null ||
      p.data.max_booking_days === null ||
      p.data.cancellation_notice_minutes === null)
  )
    return {
      ok: false,
      message: 'Defina todas as políticas antes de liberar a agenda.',
    };
  const { error } = await db
    .from('business_settings')
    .update(p.data)
    .eq('id', true);
  if (error) return failure(error);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Configurações salvas.' };
}
export async function saveHours(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      professional_id: z.uuid(),
      weekday: z.coerce.number().int().min(0).max(6),
      opens_at: z.string().regex(/^\d{2}:\d{2}$/),
      closes_at: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success || p.data.opens_at >= p.data.closes_at)
    return { ok: false, message: 'Informe um intervalo de expediente válido.' };
  const { error } = await db.from('business_hours').insert(p.data);
  if (error) return failure(error);
  revalidatePath('/admin/configuracoes');
  return {
    ok: true,
    message:
      'Expediente adicionado. Para intervalos, cadastre manhã e tarde separadamente.',
  };
}
export async function removeHours(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success) return failure();
  const { error } = await db.from('business_hours').delete().eq('id', id.data);
  if (error) return failure(error);
  revalidatePath('/admin/configuracoes');
  return { ok: true, message: 'Expediente removido.' };
}
export async function saveException(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const closed = form.get('closed') === 'on';
  const p = z
    .object({
      professional_id: z.uuid(),
      day: z.iso.date(),
      closed: z.boolean(),
      opens_at: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .nullable(),
      closes_at: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .nullable(),
    })
    .safeParse({
      professional_id: form.get('professional_id'),
      day: form.get('day'),
      closed,
      opens_at: closed ? null : form.get('opens_at'),
      closes_at: closed ? null : form.get('closes_at'),
    });
  if (!p.success) return failure();
  const { error } = await db.from('schedule_exceptions').insert(p.data);
  if (error) return failure(error);
  revalidatePath('/admin/configuracoes');
  return {
    ok: true,
    message:
      'Exceção registrada. Reservas existentes foram preservadas; consulte a agenda.',
  };
}
export async function removeException(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success) return failure();
  const { error } = await db
    .from('schedule_exceptions')
    .delete()
    .eq('id', id.data);
  if (error) return failure(error);
  revalidatePath('/admin/configuracoes');
  return { ok: true, message: 'Exceção removida.' };
}
export async function uploadPhoto(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const file = form.get('photo');
  if (
    !(file instanceof File) ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 5 * 1024 * 1024 ||
    file.size === 0
  )
    return {
      ok: false,
      message: 'Selecione uma fotografia PNG, JPEG ou WebP de até 5 MB.',
    };
  const path = `owner/${crypto.randomUUID()}.${file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]}`;
  const { error } = await db.storage
    .from('business-images')
    .upload(path, file, { contentType: file.type });
  if (error) return failure(error);
  const saved = await db
    .from('business_settings')
    .update({ photo_path: path })
    .eq('id', true);
  if (saved.error) return failure(saved.error);
  revalidatePath('/sobre');
  return { ok: true, message: 'Fotografia atualizada.' };
}
