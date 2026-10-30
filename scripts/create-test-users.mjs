import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error(
    'Configure URL e service role no .env.local (somente servidor).',
  );
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error(
    'Este script cria usuários sintéticos somente no Supabase local.',
  );
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const credentials = [];
for (const role of ['admin', 'customer']) {
  const email = `${role}.${Date.now()}@auto-estilo.test`;
  const password = randomBytes(24).toString('base64url');
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: role === 'admin' ? 'Administrador de teste' : 'Cliente de teste',
    },
  });
  if (error)
    throw new Error(`Falha ao criar usuário ${role}: ${error.message}`);
  if (role === 'admin') {
    const { error: promotion } = await db
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', data.user.id);
    if (promotion) throw promotion;
  }
  credentials.push({ role, email, password });
}
await mkdir('.local', { recursive: true });
await writeFile(
  '.local/test-credentials.json',
  JSON.stringify(credentials, null, 2),
  { mode: 0o600 },
);
console.log(
  'Duas contas criadas no Supabase local. Credenciais em .local/test-credentials.json (ignorado pelo Git).',
);
