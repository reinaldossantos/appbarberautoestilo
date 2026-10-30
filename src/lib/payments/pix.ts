import { createStaticPix, hasError } from 'pix-utils';
import QRCode from 'qrcode';

export type PixInput = {
  key: string;
  beneficiary: string;
  city: string;
  amountCents: number;
  reference: string;
};
// Adapter isolado: nenhum acesso bancário, nenhuma confirmação de recebimento.
export interface PaymentCodeProvider {
  generate(input: PixInput): Promise<{ payload: string; qr: string }>;
}
const ascii = (value: string, limit: number) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .slice(0, limit);
export function pixPayload(input: PixInput) {
  if (
    !Number.isSafeInteger(input.amountCents) ||
    input.amountCents <= 0 ||
    input.amountCents > 10000000
  )
    throw new Error('Valor Pix inválido.');
  if (
    !/^[A-Za-z0-9]{1,25}$/.test(input.reference) ||
    !input.key ||
    input.key.length > 77
  )
    throw new Error('Dados Pix inválidos.');
  const name = ascii(input.beneficiary, 25),
    city = ascii(input.city, 15);
  if (!name || !city)
    throw new Error('Beneficiário e cidade são obrigatórios.');
  const pix = createStaticPix({
    pixKey: input.key,
    merchantName: name,
    merchantCity: city,
    transactionAmount: input.amountCents / 100,
    txid: input.reference,
  });
  if (hasError(pix)) throw new Error('Não foi possível gerar o código Pix.');
  return pix.toBRCode();
}
export const staticPixProvider: PaymentCodeProvider = {
  async generate(input) {
    const payload = pixPayload(input);
    return {
      payload,
      qr: await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 4,
        width: 320,
      }),
    };
  },
};
