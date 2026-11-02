import { ActionForm } from '@/components/forms/action-form';
import { deleteTestRecord } from '@/lib/actions/test-records';
import { Trash2 } from 'lucide-react';

export function DeleteTestRecord({
  kind,
  id,
  label,
}: {
  kind: 'customer' | 'appointment' | 'payment';
  id: string;
  label: string;
}) {
  return (
    <details className="panel">
      <summary>
        <Trash2 size={16} aria-hidden="true" /> Excluir registro de teste
      </summary>
      <p>{label}</p>
      <p>
        Exclusão permanente do sistema, com histórico na auditoria. Pagamentos
        excluídos não são estornados no banco.
      </p>
      {kind === 'customer' && (
        <p>
          A conta de login será mantida. A limpeza completa remove também
          agendamentos, pagamentos, pontos e resgates deste cliente.
        </p>
      )}
      <ActionForm action={deleteTestRecord} submit="Excluir definitivamente">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        {kind !== 'payment' && (
          <label className="checkbox-line">
            <input type="checkbox" name="cascade" />
            Excluir também os registros vinculados
            {kind === 'appointment' ? ' de pagamento' : ''}.
          </label>
        )}
        <label className="field">
          Motivo da exclusão
          <textarea name="reason" required minLength={5} maxLength={500} />
        </label>
        <label className="checkbox-line">
          <input type="checkbox" name="test" required />
          Confirmo que são registros de teste e revisei os vínculos que serão
          removidos.
        </label>
        <label className="field">
          Digite EXCLUIR para confirmar
          <input
            name="confirmation"
            required
            pattern="EXCLUIR"
            autoComplete="off"
          />
        </label>
      </ActionForm>
    </details>
  );
}
