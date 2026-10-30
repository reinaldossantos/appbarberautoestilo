import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

// Somente empacota SQL local. Não conecta ou altera o projeto remoto.
const files = (await readdir('supabase/migrations'))
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();
if (!files.length) throw new Error('Nenhuma migration encontrada.');
const chunks = [
  '-- AUTO-ESTILO: implantação inicial pelo SQL Editor do Supabase.',
  '-- Projeto de destino: dymlojijgvgvwcpxfqai.',
  '-- Execute somente no projeto correto, ainda sem as tabelas da aplicação.',
  '-- Transação única: qualquer erro reverte esta implantação.',
  'begin;',
  `do $$ begin
    if to_regclass('public.profiles') is not null
       or to_regclass('public.services') is not null
       or to_regclass('public.appointments') is not null then
      raise exception 'Implantação inicial interrompida: já existem tabelas da aplicação. Use migrations incrementais.';
    end if;
  end $$;`,
];
for (const file of files) {
  chunks.push(`\n-- Migration: ${file}\n`, await readFile(`supabase/migrations/${file}`, 'utf8'));
}
chunks.push('\n-- Dados comerciais aprovados\n', await readFile('supabase/seed.sql', 'utf8'), 'commit;');
await mkdir('supabase/install', { recursive: true });
await writeFile('supabase/install/initial-setup.sql', chunks.join('\n'), 'utf8');
console.log(`Pacote gerado com ${files.length} migrations e seed. Nenhuma alteração remota executada.`);
