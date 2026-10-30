'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/session';
import type { ActionResult } from '@/lib/domain/validation';
import { failure } from './result';
export async function saveBlock(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      professional: z.uuid(),
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
      reason: z.string().max(500),
      repeat: z.coerce.number().int().min(1).max(52),
      id: z.uuid().optional(),
    })
    .safeParse({
      ...Object.fromEntries(form),
      id: form.get('id') || undefined,
    });
  if (!p.success) return failure();
  const { error } = await db.rpc('save_block_local', {
    p_professional: p.data.professional,
    p_start: p.data.start,
    p_end: p.data.end,
    p_reason: p.data.reason,
    p_id: p.data.id || null,
    p_repeat: p.data.repeat,
  });
  if (error) return failure(error);
  revalidatePath('/admin/bloqueios');
  return {
    ok: true,
    message: 'Bloqueio salvo. Nenhuma reserva foi cancelada.',
  };
}
export async function removeBlock(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success) return failure();
  const { error } = await db.rpc('remove_block', { p_id: id.data });
  if (error) return failure(error);
  revalidatePath('/admin/bloqueios');
  return { ok: true, message: 'Período desbloqueado.' };
}
