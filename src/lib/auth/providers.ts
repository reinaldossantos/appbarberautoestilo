import { isConfigured, supabaseConfig } from '@/lib/supabase/config';

export async function googleAvailable(): Promise<boolean> {
  if (!isConfigured()) return false;
  const { url, key } = supabaseConfig();
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key }, cache: 'no-store', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const settings = await response.json();
    return settings.external?.google === true;
  } catch { return false; }
}
