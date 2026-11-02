'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import type { ActionResult } from '@/lib/domain/validation';

export async function saveUserAccess(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      email: z.email().max(254),
      name: z.string().trim().min(2).max(100),
      role: z.enum(['admin', 'customer']),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success)
    return { ok: false, message: 'Revise nome, e-mail e nível de acesso.' };
  const { error } = await db.rpc('save_user_access', {
    p_email: p.data.email.toLowerCase(),
    p_name: p.data.name,
    p_role: p.data.role,
  });
  if (error)
    return {
      ok: false,
      message: error.message.includes('SELF_DEMOTION')
        ? 'Você não pode remover seu próprio acesso administrativo.'
        : 'Não foi possível salvar o acesso. Confira sua permissão e tente novamente.',
    };
  revalidatePath('/admin/usuarios');
  return {
    ok: true,
    message:
      'Acesso salvo. Para novas contas, compartilhe o link de login e peça que a pessoa entre com o e-mail cadastrado. Nenhum e-mail foi enviado automaticamente.',
  };
}

export async function removePendingAccess(
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success) return { ok: false, message: 'Acesso inválido.' };
  const { error } = await db.rpc('remove_pending_access', { p_id: id.data });
  revalidatePath('/admin/usuarios');
  return error
    ? {
        ok: false,
        message: 'Não foi possível remover. O acesso pode já ter sido ativado.',
      }
    : { ok: true, message: 'Autorização pendente removida.' };
}
