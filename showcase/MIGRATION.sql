-- ============================================================================
-- OPTIONAL migration — NOT applied. Prepared for review per the project brief
-- ("prepare the migration and explain it clearly; do not apply it to
-- production without explicit approval").
--
-- Context
-- -------
-- studioathar.studio's real contact form (index.html) and the Athar Lab
-- showcase (showcase/index.html) both currently insert into the existing
-- `projects_inquiries` table using only its current columns: name, email,
-- project_details. That is why the showcase works today without needing
-- this migration — the showcase's extra fields (business name, sector,
-- scope, desired timing, budget range) are folded into a labeled block
-- inside `project_details` as a safe, zero-risk fallback.
--
-- This migration is the optional follow-up: it adds those fields as real,
-- queryable columns instead. It is purely additive (new nullable columns,
-- IF NOT EXISTS guards) — it does not touch existing rows, does not rename
-- or drop anything, and the current contact form and showcase form keep
-- working unmodified whether or not this runs.
--
-- If you apply this, say so and I'll switch showcase/index.html's submit
-- handler from the folded-text fallback to writing these columns directly.
-- ============================================================================

alter table public.projects_inquiries
  add column if not exists business_name   text,
  add column if not exists sector          text,
  add column if not exists scope           text,
  add column if not exists desired_timing  text,
  add column if not exists budget_range    text,
  add column if not exists source          text default 'website'; -- 'website' | 'athar_lab_showcase'

comment on column public.projects_inquiries.business_name  is 'Inquirer''s business/brand name, optional.';
comment on column public.projects_inquiries.sector         is 'Business sector selected in the inquiry form.';
comment on column public.projects_inquiries.scope          is 'Approximate project scope selected in the inquiry form.';
comment on column public.projects_inquiries.desired_timing is 'Desired launch timing selected in the inquiry form.';
comment on column public.projects_inquiries.budget_range   is 'Free-text budget range, optional.';
comment on column public.projects_inquiries.source         is 'Which surface the inquiry came from.';
