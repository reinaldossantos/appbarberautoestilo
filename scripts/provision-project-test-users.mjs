import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ref = 'dymlojijgvgvwcpxfqai';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url !== `https://${ref}.supabase.co`) throw new Error('Projeto diferente do autorizado.');
const destination = '.local/remote-test-credentials.json';
await mkdir('.local', { recursive: true });
let saved = [];
try { saved = JSON.parse(await readFile(destination, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
// Captura em memória; nunca imprimir ou persistir a chave administrativa.
let keys;
try {
  const raw = execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'projects', 'api-keys', '--project-ref', ref, '--reveal', '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
  const parsed = JSON.parse(raw);
  keys = Array.isArray(parsed) ? parsed : parsed.api_keys ?? parsed.keys;
} catch { throw new Error('Não foi possível obter acesso administrativo pela CLI. Nenhuma chave foi exibida.'); }
if (!Array.isArray(keys)) throw new Error('Formato da resposta de chaves não reconhecido.');
const key = keys.find(k => k.name === 'service_role')?.api_key ?? keys.find(k => k.type === 'secret')?.api_key;
if (!key) throw new Error('Chave administrativa não disponível.');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const db = createClient(url, key, options);
for (const role of ['admin', 'customer']) {
  let credential = saved.find(c => c.role === role);
  if (!credential) {
    credential = { role, email: `${role}.teste.${randomBytes(5).toString('hex')}@auto-estilo.test`, password: randomBytes(24).toString('base64url') };
    saved.push(credential);
    await writeFile(destination, JSON.stringify(saved, null, 2), { mode: 0o600 });
  }
  if (!credential.id) {
    const { data, error } = await db.auth.admin.createUser({ email: credential.email, password: credential.password, email_confirm: true, user_metadata: { name: role === 'admin' ? 'Administrador de teste' : 'Cliente de teste', test_account: true } });
    if (error) throw new Error(`Criação de ${role} não concluída (${error.status}).`);
    credential.id = data.user.id;
    await writeFile(destination, JSON.stringify(saved, null, 2), { mode: 0o600 });
  }
  if (role === 'admin') {
    const { data, error } = await db.from('profiles').update({ role: 'admin' }).eq('id', credential.id).select('id').single();
    if (error || !data) throw new Error('Não foi possível atribuir o papel administrativo.');
  }
  const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
  const { error } = await client.auth.signInWithPassword({ email: credential.email, password: credential.password });
  if (error) throw new Error(`Login de ${role} não validado (${error.status}).`);
  const profile = await client.from('profiles').select('role').eq('id', credential.id).single();
  if (profile.error || profile.data.role !== role) throw new Error(`Papel de ${role} não validado.`);
  const report = await client.rpc('admin_report', { p_from: '2026-10-26', p_to: '2026-10-26' });
  if (role === 'admin' && report.error) throw new Error('Relatório administrativo não acessível.');
  if (role === 'customer' && !report.error) throw new Error('Falha: cliente acessou relatório administrativo.');
  await client.auth.signOut();
  console.log(`Conta ${role}: login e permissões validados.`);
}
console.log(`Credenciais disponíveis em ${destination}. Nenhum expediente ou regra comercial foi alterado.`);
