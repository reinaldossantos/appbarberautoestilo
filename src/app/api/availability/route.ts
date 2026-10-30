import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/config';
export async function GET(request: Request) {
  const p = z
    .object({
      service: z.uuid(),
      professional: z.uuid(),
      day: z.iso.date(),
      exclude: z.uuid().optional(),
    })
    .safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!p.success)
    return Response.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
  if (!isConfigured())
    return Response.json(
      { slots: [], configured: false },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  const { data, error } = await (
    await createClient()
  ).rpc('available_slots', {
    p_service: p.data.service,
    p_professional: p.data.professional,
    p_day: p.data.day,
    p_exclude: p.data.exclude || null,
  });
  if (error)
    return Response.json(
      { error: 'Não foi possível consultar os horários.' },
      { status: 503 },
    );
  return Response.json(
    { slots: data, configured: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
