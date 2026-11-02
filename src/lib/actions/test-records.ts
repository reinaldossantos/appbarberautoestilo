'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import type { ActionResult } from '@/lib/domain/validation';

export async function deleteTestRecord(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const parsed = z
    .object({
      kind: z.enum(['customer', 'appointment', 'payment']),
      id: z.uuid(),
      reason: z.string().trim().min(5).max(500),
      confirmation: z.literal('EXCLUIR'),
      test: z.literal('on'),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: 'Informe o motivo, confirme dados de teste e digite EXCLUIR.',
    };
  const p = parsed.data;
  const { error } = await db.rpc('delete_test_record', {
    p_kind: p.kind,
    p_id: p.id,
    p_reason: p.reason,
    p_confirmation: p.confirmation,
    p_cascade: form.get('cascade') === 'on',
  });
  if (error) {
    const message = error.message.includes('DEPENDENCIES_EXIST')
      ? 'Há registros vinculados. Exclua-os primeiro ou marque a exclusão dos vínculos.'
      : error.message.includes('LOYALTY_DEPENDENCY')
        ? 'Este atendimento gerou pontos. Para preservar a fidelidade, use a limpeza completa do cliente de teste.'
        : 'Exclusão não realizada. Atualize a página e confira sua permissão e a instalação da atualização.';
    return { ok: false, message };
  }
  revalidatePath('/admin', 'layout');
  revalidatePath('/conta', 'layout');
  revalidatePath('/agendar');
  return {
    ok: true,
    message: 'Registro de teste excluído. Histórico preservado na auditoria.',
  };
}
