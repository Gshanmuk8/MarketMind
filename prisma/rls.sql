-- MarketMind AI — Row Level Security policies
--
-- Run this in the Supabase SQL editor AFTER `npm run db:push`.
-- Idempotent: safe to re-run any time (re-run after schema resets or
-- whenever a new user-owned table is added).
--
-- How this coexists with Prisma:
--   • The app connects via DATABASE_URL as the `postgres` role, which OWNS
--     these tables, so Prisma queries are unaffected by RLS. Authorization
--     for app traffic is enforced in code (user-scoped Prisma queries via
--     getSessionUser()).
--   • RLS protects the OTHER doors into the database: the auto-generated
--     PostgREST API and Realtime with the anon/authenticated keys. With
--     these policies, a leaked anon key still can't read anyone's data.
--   • Every policy reduces to: auth.uid() must own the row (directly or
--     through its parent chain).

-- ── Enable RLS on every table ────────────────────────────────────────
alter table public.profiles              enable row level security;
alter table public.companies             enable row level security;
alter table public.competitors           enable row level security;
alter table public.signals               enable row level security;
alter table public.tech_stack_entries    enable row level security;
alter table public.score_snapshots       enable row level security;
alter table public.insights              enable row level security;
alter table public.decisions             enable row level security;
alter table public.reports               enable row level security;
alter table public.chat_threads          enable row level security;
alter table public.chat_messages         enable row level security;
alter table public.notification_channels enable row level security;
alter table public.notification_settings enable row level security;
alter table public.notification_logs     enable row level security;
alter table public.ai_provider_updates   enable row level security;

-- ── Ownership helpers ────────────────────────────────────────────────
create or replace function public.owns_company(cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from companies c where c.id = cid and c."userId" = auth.uid());
$$;

create or replace function public.owns_competitor(cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from competitors cp
    join companies c on c.id = cp."companyId"
    where cp.id = cid and c."userId" = auth.uid()
  );
$$;

-- ── Profiles: a user sees and edits only their own row ───────────────
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- ── Directly user-owned tables ───────────────────────────────────────
drop policy if exists "companies_all_own" on public.companies;
create policy "companies_all_own" on public.companies
  for all using ("userId" = auth.uid()) with check ("userId" = auth.uid());

drop policy if exists "chat_threads_all_own" on public.chat_threads;
create policy "chat_threads_all_own" on public.chat_threads
  for all using ("userId" = auth.uid()) with check ("userId" = auth.uid());

drop policy if exists "notification_channels_all_own" on public.notification_channels;
create policy "notification_channels_all_own" on public.notification_channels
  for all using ("userId" = auth.uid()) with check ("userId" = auth.uid());

drop policy if exists "notification_settings_all_own" on public.notification_settings;
create policy "notification_settings_all_own" on public.notification_settings
  for all using ("userId" = auth.uid()) with check ("userId" = auth.uid());

-- ── Owned through Company ────────────────────────────────────────────
drop policy if exists "competitors_all_own" on public.competitors;
create policy "competitors_all_own" on public.competitors
  for all using (public.owns_company("companyId"))
  with check (public.owns_company("companyId"));

drop policy if exists "signals_all_own" on public.signals;
create policy "signals_all_own" on public.signals
  for all using (public.owns_company("companyId"))
  with check (public.owns_company("companyId"));

drop policy if exists "insights_all_own" on public.insights;
create policy "insights_all_own" on public.insights
  for all using (public.owns_company("companyId"))
  with check (public.owns_company("companyId"));

drop policy if exists "decisions_all_own" on public.decisions;
create policy "decisions_all_own" on public.decisions
  for all using (public.owns_company("companyId"))
  with check (public.owns_company("companyId"));

drop policy if exists "reports_all_own" on public.reports;
create policy "reports_all_own" on public.reports
  for all using (public.owns_company("companyId"))
  with check (public.owns_company("companyId"));

-- ── Owned through Competitor ─────────────────────────────────────────
drop policy if exists "tech_stack_entries_all_own" on public.tech_stack_entries;
create policy "tech_stack_entries_all_own" on public.tech_stack_entries
  for all using (public.owns_competitor("competitorId"))
  with check (public.owns_competitor("competitorId"));

drop policy if exists "score_snapshots_all_own" on public.score_snapshots;
create policy "score_snapshots_all_own" on public.score_snapshots
  for all using (public.owns_competitor("competitorId"))
  with check (public.owns_competitor("competitorId"));

-- ── Owned through ChatThread / NotificationChannel ───────────────────
drop policy if exists "chat_messages_all_own" on public.chat_messages;
create policy "chat_messages_all_own" on public.chat_messages
  for all using (
    exists (select 1 from chat_threads t where t.id = "threadId" and t."userId" = auth.uid())
  ) with check (
    exists (select 1 from chat_threads t where t.id = "threadId" and t."userId" = auth.uid())
  );

drop policy if exists "notification_logs_select_own" on public.notification_logs;
create policy "notification_logs_select_own" on public.notification_logs
  for select using (
    exists (select 1 from notification_channels ch where ch.id = "channelId" and ch."userId" = auth.uid())
  );

-- ── Shared reference data: readable by any signed-in user ────────────
drop policy if exists "ai_provider_updates_read" on public.ai_provider_updates;
create policy "ai_provider_updates_read" on public.ai_provider_updates
  for select using (auth.role() = 'authenticated');
-- No insert/update/delete policies: only the server (table owner) writes.
