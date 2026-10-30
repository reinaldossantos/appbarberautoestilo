import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/config';
import { initialServices } from '@/lib/domain/catalog';
import type { Professional, Service, Settings } from '@/lib/domain/types';
export const getServices = cache(async (): Promise<Service[]> => {
  if (!isConfigured()) return initialServices;
  const db = await createClient();
  const { data, error } = await db
    .from('services')
    .select('*')
    .neq('status', 'hidden')
    .order('sort_order');
  if (error)
    throw new Error('Não foi possível carregar os serviços. Tente novamente.');
  return data;
});
export const getProfessionals = cache(async (): Promise<Professional[]> => {
  if (!isConfigured())
    return [
      {
        id: '20000000-0000-4000-8000-000000000001',
        name: 'Andrezinho',
        active: true,
      },
    ];
  const { data, error } = await (
    await createClient()
  )
    .from('professionals')
    .select('id,name,active')
    .eq('active', true);
  if (error) throw new Error('Não foi possível consultar os profissionais.');
  return data;
});
export const getSettings = cache(async (): Promise<Settings | null> => {
  if (!isConfigured()) return null;
  const { data, error } = await (
    await createClient()
  )
    .from('business_settings')
    .select('*')
    .single();
  if (error) throw new Error('Não foi possível carregar as configurações.');
  return data;
});
