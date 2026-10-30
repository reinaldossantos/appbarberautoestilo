import { readFile, writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';
const source = process.argv[2];
if (!source) throw new Error('Informe o caminho do prompt aprovado.');
const text = await readFile(source, 'utf8');
const story = text
  .slice(
    text.indexOf('"Meu nome é André'),
    text.indexOf('Essa é só a primeira parte da minha história.') +
      'Essa é só a primeira parte da minha história.'.length,
  )
  .replace(/^"/, '')
  .replace(/\r\n/g, '\n');
if (!story.startsWith('Meu nome') || story.length < 500)
  throw new Error('Texto institucional não encontrado.');
await writeFile(
  'src/lib/domain/story.ts',
  `// Texto institucional fornecido e aprovado no briefing.\nexport const initialStory = ${JSON.stringify(story)};\n`,
);
const values = [
  ['Corte', 3000, 30],
  ['Corte + pigmentação', 4500, 45],
  ['Corte + luzes', 7500, null],
  ['Corte + platinado', 8500, null],
  ['Pezinho', 1500, 10],
  ['Corte + barba', 4000, 45],
  ['Limpeza nasal', 1500, 20],
  ['Barberterapia', null, null],
  ['Limpeza facial', null, null],
  ['Hidratação capilar', null, null],
];
const quote = (s) => `'${s.replaceAll("'", "''")}'`;
let sql = `-- Somente dados comerciais fornecidos. Sem clientes, regras comerciais ou horários fictícios.\ninsert into public.business_settings(id,story) values(true,${quote(story)}) on conflict(id) do nothing;\ninsert into public.professionals(id,name) values('20000000-0000-4000-8000-000000000001','Andrezinho') on conflict(id) do nothing;\n`;
values.forEach(([name, price, duration], i) => {
  sql += `insert into public.services(id,name,price_cents,duration_minutes,status,sort_order) values('10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}',${quote(name)},${price ?? 'null'},${duration ?? 'null'},'${i < 7 ? 'active' : 'coming_soon'}',${i}) on conflict(id) do nothing;\n`;
});
sql +=
  "insert into public.professional_services(professional_id,service_id) select '20000000-0000-4000-8000-000000000001',id from public.services on conflict do nothing;\n";
await writeFile('supabase/seed.sql', sql);
await mkdir('public/icons', { recursive: true });
for (const size of [192, 512])
  await sharp('public/logo.png')
    .resize(size, size, { fit: 'contain', background: '#000000' })
    .png()
    .toFile(`public/icons/icon-${size}.png`);
console.log('História, seed e ícones oficiais preparados.');
