import Link from 'next/link';
import { PAGE_SIZE } from '@/lib/domain/pagination';

export function Pagination({
  page,
  count,
  pathname,
  query = '',
  filters = {},
  noun = 'clientes',
}: {
  page: number;
  count: number;
  pathname: string;
  query?: string;
  filters?: Record<string, string>;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const href = (number: number) =>
    `${pathname}?${new URLSearchParams({ ...filters, page: String(number), ...(query ? { q: query } : {}) })}`;
  return (
    <nav className="flex-between" aria-label={`Paginação de ${noun}`}>
      <span className="muted">
        {count} {noun} · Página {page} de {pages}
      </span>
      <div className="row-actions">
        {page > 1 ? (
          <Link
            className="button button-outline button-sm"
            href={href(page - 1)}
          >
            Anterior
          </Link>
        ) : null}
        {page < pages ? (
          <Link
            className="button button-outline button-sm"
            href={href(page + 1)}
          >
            Próxima
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
