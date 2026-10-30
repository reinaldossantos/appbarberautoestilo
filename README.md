# Auto-estilo Barbershop

Aplicação Next.js App Router, React e TypeScript strict, com Supabase Auth/PostgreSQL/Storage. Código organizado por domínio, componentes e ações de servidor. Identidade oficial em preto e dourado.

## Executar

```powershell
npm ci
npm run dev
```

Abra http://localhost:3000. Sem Supabase, o catálogo fornecido funciona para consulta; autenticação e reservas ficam indisponíveis, sem simulação de sucesso.

## Banco e titularidade

**Conta destinada ao projeto hospedado: andrezindamidia@gmail.com.** O projeto deve ser criado em uma organização Supabase pertencente a essa conta. Informar o e-mail não cria a conta, não concede acesso e não transfere a propriedade. O banco local é apenas ambiente de desenvolvimento.

Consulte [configuração Supabase](docs/SUPABASE.md), [manual administrativo](docs/ADMINISTRACAO.md), [publicação](docs/DEPLOY.md) e [pendências](docs/PENDENCIAS.md).

## Estrutura

- `src/app`: rotas públicas, conta do cliente e administração.
- `src/components`: interface reutilizável por funcionalidade; botão com padrão shadcn/Radix.
- `src/lib/domain`: modelos, catálogo e validações Zod.
- `src/lib/actions`: operações de servidor separadas por domínio.
- `src/lib/supabase`: clientes browser/servidor e configuração.
- `supabase/migrations`: esquema, RLS, transações, exclusão de intervalos, Storage e relatórios.
- `tests`: testes unitários, integração com PostgreSQL embarcado e Playwright.

## Verificações

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes PGlite executam as migrations reais, com um schema Auth mínimo de teste. Não substituem a validação de Supabase Auth, Storage e concorrência em conexões PostgreSQL independentes. Os testes públicos de navegador pressupõem ambiente sem Supabase configurado.

Execute `npm run build` antes de `npm run test:e2e`: o Playwright usa a versão de produção para avaliar a navegação sem o custo de compilação do modo de desenvolvimento.

## Navegação

No celular, a barra inferior mantém Início, Serviços, Agendar e Minha conta ao alcance. O cabeçalho permanece visível e os links indicam a seção atual. O catálogo tem busca que ignora acentos e filtros locais, sem solicitações adicionais ao servidor. Componentes de servidor continuam responsáveis por dados e permissões; somente os controles interativos são componentes de cliente.

## Credenciais de teste

Não há senha padrão ou porta de entrada administrativa. Após iniciar o Supabase local e configurar `.env.local`, execute `npm run test:users`. O script cria contas sintéticas de cliente e administrador com senhas aleatórias; somente após a criação bem-sucedida grava `.local/test-credentials.json`. Nunca versionar esse arquivo. A conta do proprietário não é usada como cliente fictício.

## Fontes de implementação

- [Next.js: instalação](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase: autenticação SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Tailwind: Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)

Versões efetivamente instaladas ficam fixadas no `package-lock.json`; use `npm ci` para reproduzir.
