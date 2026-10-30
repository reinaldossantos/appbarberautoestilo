'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { bookingSchema, type ActionResult } from '@/lib/domain/validation';
import { failure } from './result';
import { z } from 'zod';
export async function bookAppointment(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: 'Revise o serviço e o horário selecionados.' };
  const d = parsed.data;
  const { data, error } = await session.db.rpc('book_appointment', {
    p_service: d.service,
    p_professional: d.professional,
    p_start: d.start,
    p_customer: d.customer || null,
  });
  if (error) return failure(error);
  revalidatePath('/conta');
  revalidatePath('/admin');
  return { ok: true, message: 'Horário reservado!', id: data };
}
export async function changeAppointment(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  const p = z
    .object({
      id: z.uuid(),
      action: z.enum(['reschedule', 'cancelled', 'completed', 'no_show']),
      start: z.iso.datetime({ offset: true }).optional(),
      reason: z.string().max(500).optional(),
    })
    .safeParse(input);
  if (!p.success) return failure();
  const { error } = await session.db.rpc('change_appointment', {
    p_id: p.data.id,
    p_action: p.data.action,
    p_start: p.data.start || null,
    p_reason: p.data.reason || null,
  });
  if (error) return failure(error);
  revalidatePath('/conta');
  revalidatePath('/admin');
  return { ok: true, message: 'Agendamento atualizado.' };
}
