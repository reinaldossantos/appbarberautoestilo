import { mkdir, writeFile } from 'node:fs/promises';
import { staticPixProvider } from '../src/lib/payments/pix.ts';

// Node com suporte nativo a TypeScript. Não acessa banco, nem executa transferência.
const { payload, qr } = await staticPixProvider.generate({
  key: '+553298553119', beneficiary: 'André da Silva Nascimento Filho',
  city: 'MURIAE', amountCents: 1, reference: 'VALIDACAOMANUAL',
});
await mkdir('.local', { recursive: true });
await writeFile('.local/pix-validacao.html', `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Validação Pix — Auto-estilo</title><body style="max-width:650px;margin:40px auto;padding:20px;font:18px system-ui"><h1>Validação bancária pendente</h1><p>Teste de R$ 0,01. Chave informada: +553298553119.</p><p>Beneficiário esperado: André da Silva Nascimento Filho. Confira o nome retornado pelo banco antes de autorizar. Se houver divergência, não prossiga.</p><img alt="QR Pix para teste de um centavo" src="${qr}" width="320" height="320"><label>Pix Copia e Cola<textarea style="width:100%;height:130px" readonly>${payload}</textarea></label><p>Confirme também o crédito recebido na conta do beneficiário. Este arquivo não registra nem confirma pagamentos no sistema.</p></body></html>`, 'utf8');
console.log('Validação pronta em .local/pix-validacao.html; nenhum pagamento realizado.');
