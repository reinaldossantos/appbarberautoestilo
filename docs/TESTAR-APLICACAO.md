# Testar a aplicação conectada

As duas contas de teste foram criadas no projeto `dymlojijgvgvwcpxfqai`. Os e-mails e senhas estão no arquivo local `.local/remote-test-credentials.json`, que não é versionado. O papel `admin` acessa a administração; `customer` acessa somente a área do cliente.

1. Execute `npm run dev` no terminal do projeto.
2. Abra `http://localhost:3000/login`.
3. Escolha **Acesso com senha / conta de teste** e utilize uma das contas do arquivo.
4. Para o administrador, abra `/admin`. Para o cliente, complete o cadastro em `/conta/perfil`.

A agenda permanece desabilitada até definir expediente e políticas. Não há horários comerciais fictícios. Google, e-mail OTP, MFA e o fluxo completo de reserva ainda precisam de validação/configuração específica; o teste por senha não confirma essas integrações.

## Testes automatizados conectados

Após `npm run build`, execute:

```powershell
node node_modules/@playwright/test/cli.js test --config=playwright.connected.config.ts
```

Esses testes usam as credenciais locais e não gravam vídeo ou trace de autenticação. Validam entrada, saída, painel, busca e paginação de clientes, filtros de relatórios, proteção administrativa e PWA.

## Testar como PWA

Execute `npm run build` e depois `npm run start`. Abra `http://localhost:3000/instalar` para acessar as instruções de instalação. O service worker é habilitado em produção; `npm run dev` não é suficiente para validar a PWA.

Para instalar em um celular físico, a aplicação precisa de um endereço HTTPS acessível pelo aparelho. A publicação ainda está pendente. Agendamentos e acesso à conta exigem internet; a página offline não confirma reservas.
