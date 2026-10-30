import { Report } from '@/components/admin/report';
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    service?: string;
    professional?: string;
  }>;
}) {
  return (
    <>
      <h1>Visão geral</h1>
      <p className="muted">O dia da Auto-estilo, em um só lugar.</p>
      <Report {...await searchParams} />
    </>
  );
}
