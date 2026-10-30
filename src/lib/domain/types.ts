export type Service = {
  id: string;
  name: string;
  description: string;
  price_cents: number | null;
  duration_minutes: number | null;
  status: 'active' | 'coming_soon' | 'hidden';
  category: string;
  sort_order: number;
  image_path?: string | null;
};
export type Professional = { id: string; name: string; active: boolean };
export type Appointment = {
  id: string;
  customer_id: string;
  professional_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  price_cents: number;
  services?: { name: string } | null;
  professionals?: { name: string } | null;
};
export type Settings = {
  id: boolean;
  booking_enabled: boolean;
  min_notice_minutes: number | null;
  max_booking_days: number | null;
  cancellation_notice_minutes: number | null;
  reschedule_notice_minutes: number;
  buffer_minutes: number;
  retention_days: number | null;
  story: string;
  photo_path: string | null;
  address: string;
  whatsapp: string;
};
