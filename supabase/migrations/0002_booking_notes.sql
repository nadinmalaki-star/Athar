-- A free-text note the customer can attach when booking a specific service
-- (e.g. "بدي اللون أحمر", an allergy, a special request). Customer-authored,
-- shown to the salon owner alongside the booking — no RLS change needed,
-- the existing bookings policies already cover this column.

alter table bookings add column note text;
