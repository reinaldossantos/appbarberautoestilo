export const PAGE_SIZE = 20;
export function pageNumber(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return 1;
  return Math.min(Number(value), 100000);
}
export function literalSearch(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}
