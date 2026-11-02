import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/config';
export const getSession = cache(async () => {
  if (!isConfigured()) return null;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { error: accessError } = await db.rpc('claim_user_access');
  if (accessError) throw new Error('Não foi possível validar o nível de acesso.');
  const { data: profile } = await db
    .from('profiles')
    .select('id, display_name, role')
    .eq('id', user.id)
    .single();
  return { user, profile, db };
});
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
export async function requireAdmin() {
  const session = await requireUser();
  if (session.profile?.role !== 'admin') redirect('/conta');
  const { data, error } = await session.db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) redirect('/login?admin=1');
  if (data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2')
    redirect('/conta/seguranca');
  return session;
}
