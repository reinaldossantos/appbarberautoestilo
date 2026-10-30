import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Configure URL e chave pública no .env.local.');
  process.exit(1);
}
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
});
try {
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Auth respondeu HTTP ${response.status}.`);
  const settings = await response.json();
  console.log(`Auth acessível. E-mail: ${settings.external?.email ? 'habilitado' : 'desabilitado'}. Google: ${settings.external?.google ? 'habilitado' : 'desabilitado'}.`);
  const catalog = await db.from('services').select('id', { count: 'exact' }).limit(1);
  if (catalog.error) {
    console.error(catalog.error.code === 'PGRST205'
      ? 'Migrations pendentes: tabela services não encontrada.'
      : `Falha na consulta do catálogo (código ${catalog.error.code}).`);
    process.exitCode = 1;
  } else {
    console.log(`Catálogo público: ${catalog.count} serviços visíveis.`);
    const configuration = await db.from('business_settings').select('booking_enabled').single();
    if (configuration.error) {
      console.error('Configuração comercial ausente ou inacessível. Confira migrations e seed.');
      process.exitCode = 1;
    } else {
      console.log(`Agenda online: ${configuration.data.booking_enabled ? 'liberada' : 'desabilitada até configurar as políticas e o expediente'}.`);
    }
  }
} catch (error) {
  console.error(`Conexão não concluída: ${error instanceof Error ? error.message : 'erro de conexão'}`);
  process.exitCode = 1;
}
