-- 002_rls.sql
-- Row Level Security: every public table has RLS enabled and policies that gate
-- reads/writes to the row owner (or world-readable for puzzles).
-- See docs/04_BUILD_PLAN.md → "Appendix — SQL schema (initial migration)".

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_analyses enable row level security;
alter table public.puzzles enable row level security;
alter table public.puzzle_attempts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.rate_limits enable row level security;

-- profiles: read/update/insert own row only (the trigger inserts via SECURITY DEFINER).
create policy "read_own_profile" on public.profiles
  for select using (auth.uid() = id);
create policy "update_own_profile" on public.profiles
  for update using (auth.uid() = id);
create policy "insert_own_profile" on public.profiles
  for insert with check (auth.uid() = id);

-- games / game_analyses / puzzle_attempts / rate_limits: own rows only (CRUD).
create policy "own_games" on public.games
  for all using (auth.uid() = user_id);
create policy "own_analyses" on public.game_analyses
  for all using (auth.uid() = user_id);
create policy "own_attempts" on public.puzzle_attempts
  for all using (auth.uid() = user_id);
create policy "own_rate" on public.rate_limits
  for all using (auth.uid() = user_id);

-- subscriptions: read-only for the owner; INSERT/UPDATE happens via the
-- service-role key inside the Stripe webhook handler (RLS bypassed).
create policy "own_subs" on public.subscriptions
  for select using (auth.uid() = user_id);

-- puzzles: world-readable. INSERT/UPDATE happens via the service-role key
-- in seed migrations / admin tooling (RLS bypassed).
create policy "read_puzzles" on public.puzzles
  for select using (true);
