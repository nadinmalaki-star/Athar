-- ============================================================================
-- Athar Bookings — initial schema
--
-- Multi-tenant model: every salon is a row in `organizations`. All salon-owned
-- data (customers, services, bookings, interaction events) is scoped by
-- organization_id and isolated with Row Level Security, so one salon can
-- never read or write another salon's data — enforced by Postgres, not just
-- app code.
--
-- Two kinds of end users, both `auth.users` rows with a `profiles.role`:
--   - 'owner'    the salon's admin account (one per organization for now;
--                `memberships` leaves room for staff accounts later)
--   - 'customer' books appointments directly in the app; her behaviour
--                (bookings, price views, message replies...) is logged to
--                `interaction_events` and read by the fingerprint view below.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tenants
-- ----------------------------------------------------------------------------

create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- One row per authenticated user, app-level profile data.
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner', 'customer')),
  full_name  text not null,
  phone      text,
  created_at timestamptz not null default now()
);

-- Which organization(s) an owner administers. A customer never appears here.
create table memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id         uuid not null references profiles (id) on delete cascade,
  role            text not null default 'owner' check (role in ('owner', 'staff')),
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- Helper used throughout the RLS policies and RPCs below: is the calling
-- user an owner of this organization? SECURITY DEFINER so it can read
-- `memberships` without recursing into that table's own RLS policy.
create or replace function is_org_owner(p_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.organization_id = p_org and m.user_id = auth.uid()
  );
$$;

-- Creates an organization and makes the calling user its owner, atomically.
-- SECURITY DEFINER so a brand-new user (no rows anywhere yet) can still do
-- this in one call without needing a standalone INSERT policy on
-- organizations that any authenticated user could otherwise exploit.
create or replace function create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into organizations (name) values (org_name) returning id into new_org_id;
  insert into memberships (organization_id, user_id, role)
    values (new_org_id, auth.uid(), 'owner');
  return new_org_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- The salon <-> customer relationship
-- ----------------------------------------------------------------------------

-- A customer becomes "known" to a salon the moment she interacts with it
-- (first booking, first viewed service...). This row is where the computed
-- fingerprint status can be manually overridden by the owner — see the
-- "شو رأيك بهاد التصنيف؟" buttons in the customer detail screen.
create table salon_customers (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations (id) on delete cascade,
  customer_id         uuid not null references profiles (id) on delete cascade,
  first_seen_at       timestamptz not null default now(),
  status_override     text check (status_override in ('follow_up', 'wait', 'price_blocker', 'lost_interest')),
  status_override_at  timestamptz,
  status_override_by  uuid references profiles (id),
  unique (organization_id, customer_id)
);

-- ----------------------------------------------------------------------------
-- Services & bookings
-- ----------------------------------------------------------------------------

create table services (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  name             text not null,
  price_cents      integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

create table bookings (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organizations (id) on delete cascade,
  customer_id            uuid not null references profiles (id) on delete cascade,
  service_id             uuid not null references services (id),
  status                 text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  scheduled_at           timestamptz not null,
  original_scheduled_at  timestamptz not null default now(),
  reschedule_count       integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Interaction events — the raw signal log the fingerprint is built from.
-- Booking lifecycle events are inserted automatically by the triggers below;
-- everything else (viewed_service, viewed_price, app_opened, message_*) is
-- inserted directly by the app when it happens.
-- ----------------------------------------------------------------------------

create table interaction_events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  customer_id      uuid not null references profiles (id) on delete cascade,
  event_type       text not null check (event_type in (
                     'viewed_service', 'viewed_price', 'app_opened',
                     'message_sent', 'message_replied',
                     'booking_created', 'booking_rescheduled', 'booking_cancelled', 'booking_completed'
                   )),
  -- message_replied events carry {"response_minutes": <int>} so response
  -- speed can be measured without windowed joins over message pairs.
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index interaction_events_org_customer_idx
  on interaction_events (organization_id, customer_id, created_at desc);
create index bookings_org_customer_idx
  on bookings (organization_id, customer_id);

-- Ensure a salon_customers row exists for (org, customer) — called from the
-- booking/interaction triggers below so the app never has to remember to
-- create this link itself.
create or replace function ensure_salon_customer(p_org uuid, p_customer uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into salon_customers (organization_id, customer_id)
  values (p_org, p_customer)
  on conflict (organization_id, customer_id) do nothing;
$$;

-- Callable directly from the app (supabase.rpc('log_interaction_event', ...))
-- by a customer logging her own action, or by a salon owner logging an
-- owner-side action (e.g. message_sent to a customer). SECURITY DEFINER is
-- needed so a customer's very first event can create her salon_customers
-- row without a standalone INSERT policy on that table — the check below is
-- what keeps that privileged path from being abused to log events for
-- someone else's account or organization.
create or replace function log_interaction_event(
  p_org uuid, p_customer uuid, p_type text, p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_customer and not is_org_owner(p_org) then
    raise exception 'not authorized to log this event';
  end if;
  perform ensure_salon_customer(p_org, p_customer);
  insert into interaction_events (organization_id, customer_id, event_type, metadata)
    values (p_org, p_customer, p_type, p_metadata);
end;
$$;

create or replace function bookings_log_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    perform log_interaction_event(new.organization_id, new.customer_id, 'booking_created');
    return new;
  end if;

  if (tg_op = 'UPDATE') then
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      perform log_interaction_event(new.organization_id, new.customer_id, 'booking_cancelled');
    elsif new.status = 'completed' and old.status <> 'completed' then
      perform log_interaction_event(new.organization_id, new.customer_id, 'booking_completed');
    elsif new.scheduled_at <> old.scheduled_at then
      new.reschedule_count := old.reschedule_count + 1;
      perform log_interaction_event(new.organization_id, new.customer_id, 'booking_rescheduled',
        jsonb_build_object('from', old.scheduled_at, 'to', new.scheduled_at));
    end if;
    new.updated_at := now();
    return new;
  end if;

  return new;
end;
$$;

create trigger bookings_log_events_trigger
  before insert or update on bookings
  for each row execute function bookings_log_events();

-- ============================================================================
-- Customer fingerprint — the rule-based classification.
--
-- Deliberately NOT a black-box score: every threshold below is a plain,
-- readable rule, and the same numbers this view computes (price_views_14d,
-- days_since_last_interaction, avg response time...) are what the app shows
-- on the "ليش هيك التصنيف؟" screen. Tune thresholds here as real usage data
-- comes in — that's the whole point of keeping this in one place.
--
-- Precedence (first match wins):
--   1. lost_interest   no interaction in >= 10 days
--   2. price_blocker   viewed price 3+ times in the last 14 days, still
--                      responsive, but has an unconfirmed/cancelled booking
--   3. follow_up       booking or price/service activity in the last 3 days
--                      (she's actively doing something right now)
--   4. wait            everything else — engaged before, nothing urgent today
--
-- An owner's manual override (salon_customers.status_override) always wins.
-- ============================================================================

-- security_invoker: without it, a plain view checks row security as the
-- view's OWNER (the migration role), not the querying user — on Supabase
-- that owner can bypass RLS entirely, which would leak every salon's
-- customers to whoever queries this view. security_invoker makes the
-- underlying tables' RLS apply as the actual caller, same as querying them
-- directly.
create view customer_fingerprints with (security_invoker = true) as
with event_agg as (
  -- aggregated independently from bookings: joining raw event rows straight
  -- to raw booking rows before grouping would fan them out into a
  -- Cartesian product (N events x M bookings) and inflate every count below
  select
    organization_id,
    customer_id,
    max(created_at) as last_event_at,
    count(*) filter (
      where event_type = 'viewed_price' and created_at > now() - interval '14 days'
    ) as price_views_14d,
    count(*) filter (
      where event_type in ('viewed_service', 'viewed_price', 'message_sent', 'booking_created')
        and created_at > now() - interval '3 days'
    ) as recent_activity_3d,
    avg((metadata->>'response_minutes')::numeric) filter (
      where event_type = 'message_replied'
    ) as avg_response_minutes
  from interaction_events
  group by organization_id, customer_id
),
booking_agg as (
  select
    organization_id,
    customer_id,
    max(updated_at) as last_booking_update_at,
    count(*) filter (where status = 'completed') as completed_bookings,
    count(*) filter (where status in ('pending', 'confirmed')) as open_bookings,
    max(reschedule_count) filter (where status in ('pending', 'confirmed', 'cancelled')) as last_booking_reschedules,
    bool_or(status = 'cancelled') as has_cancelled_booking
  from bookings
  group by organization_id, customer_id
),
signals as (
  select
    sc.organization_id,
    sc.customer_id,
    sc.status_override,
    sc.status_override_at,
    greatest(
      coalesce(ea.last_event_at, sc.first_seen_at),
      coalesce(ba.last_booking_update_at, sc.first_seen_at)
    ) as last_interaction_at,
    coalesce(ea.price_views_14d, 0) as price_views_14d,
    coalesce(ea.recent_activity_3d, 0) as recent_activity_3d,
    ea.avg_response_minutes,
    coalesce(ba.completed_bookings, 0) as completed_bookings,
    coalesce(ba.open_bookings, 0) as open_bookings,
    coalesce(ba.last_booking_reschedules, 0) as last_booking_reschedules,
    coalesce(ba.has_cancelled_booking, false) as has_cancelled_booking
  from salon_customers sc
  left join event_agg ea
    on ea.organization_id = sc.organization_id and ea.customer_id = sc.customer_id
  left join booking_agg ba
    on ba.organization_id = sc.organization_id and ba.customer_id = sc.customer_id
)
select
  organization_id,
  customer_id,
  extract(day from now() - last_interaction_at)::int as days_since_last_interaction,
  last_interaction_at,
  price_views_14d,
  recent_activity_3d,
  round(avg_response_minutes) as avg_response_minutes,
  completed_bookings,
  open_bookings,
  coalesce(last_booking_reschedules, 0) as last_booking_reschedules,
  has_cancelled_booking,
  status_override,
  status_override_at,
  coalesce(
    status_override,
    case
      when now() - last_interaction_at >= interval '10 days'
        then 'lost_interest'
      when price_views_14d >= 3
        and now() - last_interaction_at < interval '10 days'
        and (open_bookings > 0 or has_cancelled_booking)
        then 'price_blocker'
      when recent_activity_3d > 0
        then 'follow_up'
      else 'wait'
    end
  ) as status
from signals;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table salon_customers enable row level security;
alter table services enable row level security;
alter table bookings enable row level security;
alter table interaction_events enable row level security;

-- organizations: any signed-in user can browse salons (needed to book);
-- only an owner can update their own.
create policy "organizations are readable by any signed-in user"
  on organizations for select to authenticated using (true);
create policy "owners can update their organization"
  on organizations for update to authenticated using (is_org_owner(id));

-- profiles: everyone can read/update their own; org owners can read the
-- profiles of customers linked to their salon (to show the customer list).
create policy "users manage their own profile"
  on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "owners can read their salon's customer profiles"
  on profiles for select to authenticated
  using (exists (
    select 1 from salon_customers sc
    where sc.customer_id = profiles.id and is_org_owner(sc.organization_id)
  ));

-- memberships: a user can see their own membership rows.
create policy "users can read their own memberships"
  on memberships for select to authenticated using (user_id = auth.uid());

-- salon_customers: owner sees/updates (for overrides) their salon's rows;
-- a customer can see her own link rows.
create policy "owners manage their salon's customer links"
  on salon_customers for all to authenticated
  using (is_org_owner(organization_id)) with check (is_org_owner(organization_id));
create policy "customers can read their own salon links"
  on salon_customers for select to authenticated using (customer_id = auth.uid());

-- services: readable by anyone signed in (customers browse before booking);
-- writable only by the owning salon.
create policy "services are readable by any signed-in user"
  on services for select to authenticated using (true);
create policy "owners manage their services"
  on services for all to authenticated
  using (is_org_owner(organization_id)) with check (is_org_owner(organization_id));

-- bookings: a customer manages her own bookings; an owner manages bookings
-- at her salon.
create policy "customers manage their own bookings"
  on bookings for all to authenticated
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "owners manage their salon's bookings"
  on bookings for all to authenticated
  using (is_org_owner(organization_id)) with check (is_org_owner(organization_id));

-- interaction_events: a customer can log/read her own events; an owner can
-- log events on behalf of her salon (e.g. message_sent to a customer) and
-- read every event at her salon (needed for the fingerprint view + timeline).
create policy "customers manage their own interaction events"
  on interaction_events for all to authenticated
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "owners manage their salon's interaction events"
  on interaction_events for all to authenticated
  using (is_org_owner(organization_id)) with check (is_org_owner(organization_id));

-- ----------------------------------------------------------------------------
-- Function privileges — Postgres grants EXECUTE on new functions to PUBLIC
-- by default, and Supabase exposes every public-schema function as a
-- callable RPC endpoint. `ensure_salon_customer` and `bookings_log_events`
-- are internal helpers only (already invoked, appropriately guarded, from
-- `log_interaction_event` and the bookings trigger) and must not be callable
-- directly, or any signed-in user could fabricate salon_customers links.
-- ----------------------------------------------------------------------------

revoke execute on function ensure_salon_customer(uuid, uuid) from public, authenticated, anon;
revoke execute on function bookings_log_events() from public, authenticated, anon;

grant execute on function create_organization(text) to authenticated;
grant execute on function log_interaction_event(uuid, uuid, text, jsonb) to authenticated;
grant execute on function is_org_owner(uuid) to authenticated;
