// Hand-written types mirroring supabase/migrations/0001_init.sql.
// If the schema drifts from this file, regenerate with the Supabase CLI:
//   supabase gen types typescript --project-id <id> > src/lib/database.types.ts

export type UserRole = 'owner' | 'customer';

export type FingerprintStatus = 'follow_up' | 'wait' | 'price_blocker' | 'lost_interest';

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type InteractionEventType =
  | 'viewed_service'
  | 'viewed_price'
  | 'app_opened'
  | 'message_sent'
  | 'message_replied'
  | 'booking_created'
  | 'booking_rescheduled'
  | 'booking_cancelled'
  | 'booking_completed';

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  organization_id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  organization_id: string;
  customer_id: string;
  service_id: string;
  status: BookingStatus;
  scheduled_at: string;
  original_scheduled_at: string;
  reschedule_count: number;
  created_at: string;
  updated_at: string;
}

export interface InteractionEvent {
  id: string;
  organization_id: string;
  customer_id: string;
  event_type: InteractionEventType;
  metadata: Record<string, unknown>;
  created_at: string;
}

// One row per (organization, customer) — the `customer_fingerprints` view.
export interface CustomerFingerprint {
  organization_id: string;
  customer_id: string;
  days_since_last_interaction: number;
  last_interaction_at: string;
  price_views_14d: number;
  recent_activity_3d: number;
  avg_response_minutes: number | null;
  completed_bookings: number;
  open_bookings: number;
  last_booking_reschedules: number;
  has_cancelled_booking: boolean;
  status_override: FingerprintStatus | null;
  status_override_at: string | null;
  status: FingerprintStatus;
}
