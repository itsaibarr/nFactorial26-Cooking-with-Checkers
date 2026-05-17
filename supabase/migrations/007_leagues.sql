-- Migration 007: Leagues system
-- Adds league_tier to profiles, creates league_seasons and league_entries tables,
-- and RPCs for season management and settlement.

-- ─────────────────────────────────────────────────────────────
-- Profiles: add league tier
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN league_tier text NOT NULL DEFAULT 'bronze'
    CHECK (league_tier IN ('bronze', 'silver', 'gold', 'diamond'));

-- ─────────────────────────────────────────────────────────────
-- league_seasons: one row per weekly Mon–Sun season
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.league_seasons (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_number integer     NOT NULL UNIQUE,
  start_date    date        NOT NULL,
  end_date      date        NOT NULL,
  settled       boolean     NOT NULL DEFAULT false,
  settled_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_league_seasons_dates ON public.league_seasons (start_date);

-- ─────────────────────────────────────────────────────────────
-- league_entries: one row per user per season
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.league_entries (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id        uuid        NOT NULL REFERENCES public.league_seasons(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_tier      text        NOT NULL CHECK (league_tier IN ('bronze', 'silver', 'gold', 'diamond')),
  games_played     integer     NOT NULL DEFAULT 0,
  total_sharpness  integer     NOT NULL DEFAULT 0,
  avg_sharpness    numeric(5,1) GENERATED ALWAYS AS (
    CASE WHEN games_played > 0
         THEN total_sharpness::numeric / games_played
         ELSE NULL END
  ) STORED,
  promotion_result text CHECK (promotion_result IN ('promoted', 'relegated', 'stayed', 'inactive')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, user_id)
);

CREATE INDEX idx_league_entries_leaderboard
  ON public.league_entries (season_id, league_tier, avg_sharpness DESC NULLS LAST);

CREATE INDEX idx_league_entries_user
  ON public.league_entries (user_id, season_id DESC);

-- ─────────────────────────────────────────────────────────────
-- RLS policies
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.league_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_read" ON public.league_seasons
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.league_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entries_read" ON public.league_entries
  FOR SELECT TO authenticated USING (true);

-- ─────────────────────────────────────────────────────────────
-- RPC: get_or_create_current_season
-- Returns UUID of the current Mon–Sun season, creating it if missing.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_or_create_current_season()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_season_id uuid;
  v_start     date;
  v_end       date;
  v_number    integer;
BEGIN
  v_start := date_trunc('week', CURRENT_DATE)::date;  -- Monday
  v_end   := v_start + 6;                              -- Sunday

  SELECT id INTO v_season_id
  FROM public.league_seasons
  WHERE start_date = v_start;

  IF v_season_id IS NULL THEN
    SELECT COALESCE(MAX(season_number), 0) + 1
    INTO v_number
    FROM public.league_seasons;

    INSERT INTO public.league_seasons (season_number, start_date, end_date)
    VALUES (v_number, v_start, v_end)
    RETURNING id INTO v_season_id;
  END IF;

  RETURN v_season_id;
END; $$;

-- ─────────────────────────────────────────────────────────────
-- RPC: record_league_game
-- Called from /api/games/save after a game is persisted. Upserts the entry.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_league_game(
  p_user_id        uuid,
  p_sharpness_score integer
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_season_id  uuid;
  v_tier       text;
BEGIN
  v_season_id := public.get_or_create_current_season();

  SELECT league_tier INTO v_tier
  FROM public.profiles WHERE id = p_user_id;

  INSERT INTO public.league_entries
    (season_id, user_id, league_tier, games_played, total_sharpness)
  VALUES
    (v_season_id, p_user_id, v_tier, 1, p_sharpness_score)
  ON CONFLICT (season_id, user_id) DO UPDATE
    SET games_played    = league_entries.games_played + 1,
        total_sharpness = league_entries.total_sharpness + p_sharpness_score,
        updated_at      = now();
END; $$;

-- ─────────────────────────────────────────────────────────────
-- RPC: settle_league_season
-- Runs promotion/relegation for a completed season. Fully idempotent.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.settle_league_season(p_season_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tier text;
  v_total integer;
  v_promote_cutoff integer;
  v_relegate_cutoff integer;
BEGIN
  -- No-op if already settled
  IF EXISTS (SELECT 1 FROM public.league_seasons WHERE id = p_season_id AND settled) THEN
    RETURN;
  END IF;

  FOREACH v_tier IN ARRAY ARRAY['bronze','silver','gold','diamond'] LOOP
    -- Count qualifying users (>= 3 games) in this tier
    SELECT COUNT(*) INTO v_total
    FROM public.league_entries
    WHERE season_id = p_season_id
      AND league_tier = v_tier
      AND games_played >= 3;

    v_promote_cutoff  := GREATEST(1, CEIL(v_total * 0.20));
    v_relegate_cutoff := GREATEST(1, CEIL(v_total * 0.20));

    -- Mark inactive (< 3 games)
    UPDATE public.league_entries
    SET promotion_result = 'inactive'
    WHERE season_id = p_season_id
      AND league_tier = v_tier
      AND games_played < 3;

    -- Mark promoted (top 20% by avg_sharpness)
    UPDATE public.league_entries
    SET promotion_result = 'promoted'
    WHERE id IN (
      SELECT id FROM public.league_entries
      WHERE season_id = p_season_id
        AND league_tier = v_tier
        AND games_played >= 3
      ORDER BY avg_sharpness DESC NULLS LAST
      LIMIT v_promote_cutoff
    );

    -- Mark relegated (bottom 20%)
    UPDATE public.league_entries
    SET promotion_result = 'relegated'
    WHERE id IN (
      SELECT id FROM public.league_entries
      WHERE season_id = p_season_id
        AND league_tier = v_tier
        AND games_played >= 3
        AND promotion_result IS NULL
      ORDER BY avg_sharpness ASC NULLS LAST
      LIMIT v_relegate_cutoff
    );

    -- Mark rest as stayed
    UPDATE public.league_entries
    SET promotion_result = 'stayed'
    WHERE season_id = p_season_id
      AND league_tier = v_tier
      AND games_played >= 3
      AND promotion_result IS NULL;

    -- Promote users' profile tier (cap at diamond)
    UPDATE public.profiles SET league_tier =
      CASE league_tier
        WHEN 'bronze'  THEN 'silver'
        WHEN 'silver'  THEN 'gold'
        WHEN 'gold'    THEN 'diamond'
        ELSE league_tier  -- diamond stays
      END
    WHERE id IN (
      SELECT user_id FROM public.league_entries
      WHERE season_id = p_season_id
        AND league_tier = v_tier
        AND promotion_result = 'promoted'
    );

    -- Relegate users' profile tier (floor at bronze)
    UPDATE public.profiles SET league_tier =
      CASE league_tier
        WHEN 'diamond' THEN 'gold'
        WHEN 'gold'    THEN 'silver'
        WHEN 'silver'  THEN 'bronze'
        ELSE league_tier  -- bronze stays
      END
    WHERE id IN (
      SELECT user_id FROM public.league_entries
      WHERE season_id = p_season_id
        AND league_tier = v_tier
        AND promotion_result = 'relegated'
    );
  END LOOP;

  -- Mark season settled
  UPDATE public.league_seasons
  SET settled = true, settled_at = now()
  WHERE id = p_season_id;
END; $$;
