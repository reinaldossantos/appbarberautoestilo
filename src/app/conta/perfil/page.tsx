import { requireUser } from '@/lib/auth/session';
import { ProfileForm } from '@/components/forms/profile-form';
import { ActionForm } from '@/components/forms/action-form';
import { privacyRequest } from '@/lib/actions/profile';
export default async function Profile() {
  const { db, user, profile } = await requireUser();
  const { data } = await db
    .from('customers')
    .select('name,phone')
    .eq('profile_id', user.id)
    .maybeSingle();
  return (
    <div className="booking-grid">
      <div className="panel">
        <h2>Meu perfil</h2>
        <ProfileForm
          name={data?.name || profile?.display_name}
          phone={data?.phone || ''}
        />
      </div>
      <div className="panel">
        <h2>Seus dados, seu controle</h2>
        <p className="muted">
          Solicite uma cópia dos seus dados ou a exclusão da conta. A barbearia
          analisará os registros que precisam ser mantidos.
        </p>
        <ActionForm action={privacyRequest} submit="Registrar solicitação">
          <label className="field">
            Solicitação
            <select name="kind">
              <option value="access">Acessar meus dados</option>
              <option value="deletion">Excluir meus dados</option>
            </select>
          </label>
        </ActionForm>
      </div>
    </div>
  );
}
