import { Report } from '@/components/admin/report';
export default async function Reports({
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
      <h1>Relatórios</h1>
      <Report {...await searchParams} />
    </>
  );
}
