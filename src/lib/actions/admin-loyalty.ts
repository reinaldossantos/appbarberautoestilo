'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/session';
import { failure } from './result';
import type { ActionResult } from '@/lib/domain/validation';
export async function saveRule(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      service_id: z.uuid(),
      points: z.coerce.number().int().min(1).max(100000),
      active: z.boolean(),
    })
    .safeParse({
      ...Object.fromEntries(form),
      active: form.get('active') === 'on',
    });
  if (!p.success) return failure();
  const { error } = await db
    .from('loyalty_rules')
    .upsert(p.data, { onConflict: 'service_id' });
  if (error) return failure(error);
  revalidatePath('/admin/fidelidade');
  return {
    ok: true,
    message:
      'Regra salva. Os pontos serão concedidos apenas após validação de atendimentos concluídos.',
  };
}
export async function saveReward(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      id: z.uuid().optional(),
      name: z.string().min(2).max(120),
      cost: z.coerce.number().int().positive().max(1000000),
      active: z.boolean(),
    })
    .safeParse({
      ...Object.fromEntries(form),
      id: form.get('id') || undefined,
      active: form.get('active') === 'on',
    });
  if (!p.success) return failure();
  const { id, ...values } = p.data;
  const { error } = id
    ? await db.from('loyalty_rewards').update(values).eq('id', id)
    : await db.from('loyalty_rewards').insert(values);
  if (error) return failure(error);
  revalidatePath('/admin/fidelidade');
  return { ok: true, message: 'Recompensa salva.' };
}
export async function grantPoints(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = z.uuid().safeParse(form.get('appointment'));
  if (!id.success) return failure();
  const { error } = await db.rpc('grant_points', {
    p_appointment: id.data,
    p_operation: crypto.randomUUID(),
  });
  if (error) return failure(error);
  revalidatePath('/admin/fidelidade');
  return {
    ok: true,
    message: 'Pontuação registrada, sem duplicar concessões anteriores.',
  };
}
export async function redeemReward(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const p = z
    .object({ customer: z.uuid(), reward: z.uuid(), operation: z.uuid() })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return failure();
  const { error } = await db.rpc('redeem_reward', {
    p_customer: p.data.customer,
    p_reward: p.data.reward,
    p_operation: p.data.operation,
  });
  if (error) return failure(error);
  revalidatePath('/admin/fidelidade');
  return { ok: true, message: 'Resgate registrado.' };
}
