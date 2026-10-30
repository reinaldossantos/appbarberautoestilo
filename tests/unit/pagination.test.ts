import { expect, it } from 'vitest';
import { pageNumber, literalSearch } from '../../src/lib/domain/pagination';
it('normaliza páginas inválidas e limita valores excessivos', () => {
  for (const input of [undefined, ['2'], '-1', '0', '2.3', 'abc'])
    expect(pageNumber(input)).toBe(1);
  expect(pageNumber('3')).toBe(3);
  expect(pageNumber('999999999999999999')).toBe(100000);
});
it('trata curingas como texto literal na busca', () => {
  expect(literalSearch('100%_teste\\')).toBe('100\\%\\_teste\\\\');
});
