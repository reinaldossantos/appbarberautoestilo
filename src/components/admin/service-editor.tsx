import { ActionForm } from '@/components/forms/action-form';
import { saveService } from '@/lib/actions/admin-catalog';
import type { Service } from '@/lib/domain/types';
export function ServiceEditor({ service: s }: { service?: Service }) {
  return (
    <ActionForm action={saveService} className="form-grid">
      <input type="hidden" name="id" value={s?.id || ''} />
      <label className="field">
        Nome
        <input name="name" defaultValue={s?.name} required maxLength={120} />
      </label>
      <label className="field">
        Categoria
        <input
          name="category"
          defaultValue={s?.category || 'Estilo & cuidado'}
          required
        />
      </label>
      <label className="field full">
        Descrição
        <textarea name="description" defaultValue={s?.description} />
      </label>
      <label className="field">
        Preço em centavos
        <input
          type="number"
          min="0"
          name="price_cents"
          defaultValue={s?.price_cents ?? ''}
        />
        <small>R$ 30,00 = 3000. Deixe vazio se não definido.</small>
      </label>
      <label className="field">
        Duração em minutos
        <input
          type="number"
          min="5"
          max="720"
          name="duration_minutes"
          defaultValue={s?.duration_minutes ?? ''}
        />
      </label>
      <label className="field">
        Situação
        <select name="status" defaultValue={s?.status || 'coming_soon'}>
          <option value="active">Ativo</option>
          <option value="coming_soon">Em breve</option>
          <option value="hidden">Oculto</option>
        </select>
      </label>
      <label className="field">
        Ordem de exibição
        <input
          type="number"
          name="sort_order"
          min="0"
          defaultValue={s?.sort_order ?? 0}
        />
      </label>
      <label className="field full">
        Imagem no Storage (caminho opcional)
        <input name="image_path" defaultValue={s?.image_path || ''} />
      </label>
    </ActionForm>
  );
}
