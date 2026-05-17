-- 001_initial.sql
-- Initial schema for Sharpki: 7 tables + handle_new_user trigger.
-- See docs/04_BUILD_PLAN.md → "Appendix — SQL schema (initial migration)".

create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  language text not null default 'ru' check (language in ('ru', 'en')),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'confident')),
  goal text,
  accessibility_mode boolean not null default false,
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  current_sharpness integer not null default 50 check (current_sharpness between 0 and 100),
  streak_days integer not null default 0,
  streak_freezes_remaining integer not null default 1,
  last_activity_date date,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro', 'family')),
  subscription_status text default 'inactive',
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_color text not null check (player_color in ('white', 'black')),
  opponent_level text not null check (opponent_level in ('easy', 'medium', 'hard')),
  moves jsonb not null default '[]'::jsonb,
  result text check (result in ('win', 'loss', 'draw', 'aborted')),
  end_reason text,
  sharpness_score integer check (sharpness_score between 0 and 100),
  sharpness_breakdown jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now()
);
create index idx_games_user on public.games (user_id, created_at desc);

create table public.game_analyses (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  language text not null check (language in ('ru', 'en')),
  payload jsonb not null,
  model text not null,
  tokens_in integer,
  tokens_out integer,
  cost_usd numeric(8, 5),
  created_at timestamptz not null default now(),
  unique (game_id, language)
);
create index idx_analyses_user on public.game_analyses (user_id, created_at desc);

create table public.puzzles (
  id uuid primary key default uuid_generate_v4(),
  slug text unique,
  position jsonb not null,
  side_to_move text not null check (side_to_move in ('white', 'black')),
  solution_moves jsonb not null,
  theme text,
  difficulty integer not null check (difficulty between 1 and 5),
  explanation_ru text not null,
  explanation_en text not null,
  created_at timestamptz not null default now()
);

create table public.puzzle_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_id uuid not null references public.puzzles(id) on delete cascade,
  solved boolean not null,
  attempts_used integer not null default 1,
  time_taken_seconds integer,
  created_at timestamptz not null default now()
);
create index idx_attempts_user on public.puzzle_attempts (user_id, created_at desc);

create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  status text not null,
  price_id text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  count integer not null default 1,
  window_start timestamptz not null,
  primary key (user_id, action, window_start)
);

-- Trigger: auto-create profile row on auth.users insert.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.email));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
