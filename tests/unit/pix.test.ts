import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { pixPayload } from '@/lib/payments/pix';
const input = {
  key: '+553298553119',
  beneficiary: 'André da Silva Nascimento Filho',
  city: 'Muriaé',
  amountCents: 3000,
  reference: 'ATENDIMENTO123',
};
function crc(text: string) {
  let crc = 0xffff;
  for (const c of new TextEncoder().encode(text)) {
    crc ^= c << 8;
    for (let i = 0; i < 8; i++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
function fields(text: string) {
  const map: Record<string, string> = {};
  for (let i = 0; i < text.length;) {
    const id = text.slice(i, i + 2),
      length = Number(text.slice(i + 2, i + 4));
    expect(Number.isFinite(length)).toBe(true);
    map[id] = text.slice(i + 4, i + 4 + length);
    expect(map[id].length).toBe(length);
    i += 4 + length;
  }
  return map;
}
describe('Pix estático', () => {
  it('valida TLV, valor, chave e CRC independente', () => {
    const code = pixPayload(input),
      tags = fields(code);
    expect(tags['00']).toBe('01');
    expect(tags['53']).toBe('986');
    expect(tags['54']).toBe('30.00');
    expect(tags['58']).toBe('BR');
    expect(fields(tags['26'])['01']).toBe(input.key);
    expect(tags['59'].length).toBeLessThanOrEqual(25);
    expect(tags['60']).toBe('MURIAE');
    expect(tags['63']).toBe(crc(code.slice(0, -4)));
    expect(fields(tags['62'])['05']).toBe(input.reference);
  });
  it('decodifica QR gerado e recupera exatamente o Copia e Cola', () => {
    const payload = pixPayload(input);
    const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
    const scale = 6,
      margin = 4,
      size = (qr.modules.size + margin * 2) * scale;
    const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let y = 0; y < qr.modules.size; y++)
      for (let x = 0; x < qr.modules.size; x++)
        if (qr.modules.get(y, x))
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++) {
              const i =
                (((y + margin) * scale + dy) * size +
                  (x + margin) * scale +
                  dx) *
                4;
              pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
            }
    expect(jsQR(pixels, size, size)?.data).toBe(payload);
  });
  it('recusa valores inválidos e detecta alteração no payload', () => {
    for (const amountCents of [0, -1, 0.1, NaN])
      expect(() => pixPayload({ ...input, amountCents })).toThrow();
    const code = pixPayload(input).replace('30.00', '90.00');
    expect(code.slice(-4)).not.toBe(crc(code.slice(0, -4)));
  });
});
