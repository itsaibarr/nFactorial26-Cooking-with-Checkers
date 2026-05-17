# Leagues Feature — Implementation Plan

## Overview

Add a competitive league system where users are ranked weekly by sharpness performance against other users in the same tier. Best performers promote, worst relegate, the middle stays.

---

## Requirements

- Users compete within weekly seasons based on games played vs the bot
- Ranking metric: **average `sharpness_score`** of all games played in the current season
- Must play **≥ 3 games** in a season to qualify for promotion/relegation; inactive users keep their tier unchanged
- Four tiers (ascending): **Bronze → Silver → Gold → Diamond**
- At season end (Sunday 23:00 UTC): top 20% of qualifying users in a tier promote, bottom 20% relegate, rest stay
- Edge cases: Diamond + promoted → stays Diamond; Bronze + relegated → stays Bronze
- Dashboard shows current tier badge + weekly standing
- `/leagues` page shows full leaderboard within user's current tier and past season history

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Ranking metric | avg sharpness_score per season | Already computed per-game; no new engine logic needed |
| Season cadence | Mon 00:00 UTC → Sun 23:59 UTC | Weekly rhythm matches streak system |
| Settlement trigger | Vercel cron (daily, guards for Sunday) | Free tier allows daily crons; idempotent handler |
| Leaderboard data | `league_entries JOIN profiles.display_name` | Low-sensitivity; standard for game apps |
| Tier changes | Supabase RPC (SECURITY DEFINER) | Keeps promotion logic server-side, bypasses RLS safely |

---

## Phase 1 — Database Migration (`supabase/migrations/007_leagues.sql`)

### Profiles addition

```sql
ALTER TABLE public.profiles
  ADD COLUMN league_tier text NOT NULL DEFAULT 'bronze'
    CHECK (league_tier IN ('bronze', 'silver', 'gold', 'diamond'));
```

### New table: `league_seasons`

One row per weekly season.

```sql
CREATE TABLE public.league_seasons (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_number integer     NOT NULL UNIQUE,
  start_date    date        NOT NULL,
  end_date      date        NOT NULL,  -- always start_date + 6
  settled       boolean     NOT NULL DEFAULT false,
  settled_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_league_seasons_dates ON public.league_seasons (start_date);
```

### New table: `league_entries`

One row per user per season. Tracks games and sharpness accumulation.

```sql
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

-- Leaderboard query index
CREATE INDEX idx_league_entries_leaderboard
  ON public.league_entries (season_id, league_tier, avg_sharpness DESC NULLS LAST);

-- User history index
CREATE INDEX idx_league_entries_user
  ON public.league_entries (user_id, season_id DESC);
```

### RPC: `get_or_create_current_season()`

Idempotent. Returns UUID of the current Mon–Sun season, creating it if missing.

```sql
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
```

### RPC: `record_league_game(p_user_id, p_sharpness_score)`

Called from `/api/games/save` after a game is persisted. Upserts the entry.

```sql
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
```

### RPC: `settle_league_season(p_season_id)`

Runs promotion/relegation for a completed season. Fully idempotent.

```sql
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
```

---

## Phase 2 — RLS Policies

```sql
-- Seasons: readable by all authenticated users (no PII)
ALTER TABLE public.league_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_read" ON public.league_seasons
  FOR SELECT TO authenticated USING (true);

-- Entries: readable by all authenticated users (leaderboard);
--          all writes happen via SECURITY DEFINER RPCs only
ALTER TABLE public.league_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entries_read" ON public.league_entries
  FOR SELECT TO authenticated USING (true);
```

---

## Phase 3 — Game Save Hook

**File**: `src/app/api/games/save/route.ts`

After the existing `updateProfileError` block (after updating `current_sharpness` and streak), add:

```ts
// Non-blocking: a league DB glitch must never abort the game save
await supabase
  .rpc('record_league_game', {
    p_user_id: user.id,
    p_sharpness_score: sharpness.score,
  })
  .catch(() => undefined)
```

---

## Phase 4 — API Routes

### `GET /api/leagues/current/route.ts`

Auth-gated. Returns:
```ts
{
  season: { id, seasonNumber, startDate, endDate, settled },
  userEntry: { leagueTier, gamesPlayed, avgSharpness, rank, totalInTier } | null,
  leaderboard: Array<{
    rank: number,
    userId: string,
    displayName: string,   // first name only for privacy
    gamesPlayed: number,
    avgSharpness: number | null,
    isCurrentUser: boolean,
  }>,
}
```

Query leaderboard: top 50 in user's tier by `avg_sharpness DESC`, always include current user's row even if outside top 50.

### `POST /api/leagues/settle/route.ts`

Cron-only. Protected by:
```ts
const secret = request.headers.get('authorization')?.replace('Bearer ', '')
if (secret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Logic:
1. Check `if today is not Sunday UTC → return 200 { skipped: true }`
2. Find current season via `get_or_create_current_season()`
3. Call `settle_league_season(season_id)`
4. Return `{ settled: true, seasonId }`

---

## Phase 5 — Frontend

### `src/components/common/LeagueBadge.tsx` (new)

Compact badge: tier color + icon + name. Two size variants: `sm` (dashboard header), `md` (leagues page hero).

```
Bronze  → amber-800 bg, 🥉 or medal icon
Silver  → slate-500 bg, 🥈
Gold    → yellow-500 bg, 🥇
Diamond → cyan-500 bg,  💎
```

### Dashboard edits (`src/app/(app)/dashboard/page.tsx`)

1. `league_tier` is already available from the profile query — pass to `<LeagueBadge size="sm">` next to the streak badge in the header
2. Add a small league card (after the activity heatmap):
   ```
   ┌─────────────────────────────────────────────┐
   │ 🥇 Золото  · Rank 12 / 47  · Сезон: 4 дня  │
   │ Играйте ещё, чтобы попасть в Топ-20%        │
   │                              [Лиги →]       │
   └─────────────────────────────────────────────┘
   ```
   Fetch rank via `GET /api/leagues/current` inside a `Suspense` boundary so it doesn't block SSR.

### `/leagues` page (`src/app/(app)/leagues/page.tsx`)

Sections:
1. **Hero** — current tier badge, user's rank, games this season, avg sharpness this season
2. **Progress bar** — "Top 20% promotes Sunday · You need avg X+ to qualify"
3. **Leaderboard table** — columns: Rank, Player, Games, Avg Sharpness; own row highlighted; top 50 shown
4. **Past seasons card** — last 3 seasons with result badge (↑ Promoted · ↓ Relegated · → Stayed · — Inactive)

### Navigation

Add `Лиги / Leagues` link to `src/app/(app)/layout.tsx` nav.

---

## Phase 6 — i18n Keys

Add to both `src/lib/i18n/en.json` and `src/lib/i18n/ru.json`:

```json
"leagues": {
  "title": "Leagues",
  "yourLeague": "Your League",
  "rank": "Rank {rank} of {total}",
  "seasonEnds": "Season ends Sunday",
  "gamesThisWeek": "Games this week: {count}",
  "avgSharpness": "Avg sharpness: {score}",
  "qualifyNotice": "Play {remaining} more game(s) to qualify for promotion",
  "tier": {
    "bronze": "Bronze",
    "silver": "Silver",
    "gold": "Gold",
    "diamond": "Diamond"
  },
  "result": {
    "promoted": "Promoted",
    "relegated": "Relegated",
    "stayed": "Stayed",
    "inactive": "Inactive"
  },
  "leaderboard": {
    "title": "This Week's Leaderboard",
    "rank": "#",
    "player": "Player",
    "games": "Games",
    "avgSharpness": "Avg Sharpness"
  },
  "history": {
    "title": "Past Seasons",
    "empty": "No past seasons yet"
  }
}
```

---

## Phase 7 — Vercel Cron

Create or update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/leagues/settle",
      "schedule": "0 23 * * *"
    }
  ]
}
```

The handler checks internally if today is Sunday UTC before running settlement. Free tier supports this (daily frequency).

Add `CRON_SECRET` to Vercel environment variables.

---

## File Map

| File | Action |
|---|---|
| `supabase/migrations/007_leagues.sql` | New — schema + RPCs + RLS |
| `src/app/api/games/save/route.ts` | Edit — call `record_league_game` after save |
| `src/app/api/leagues/current/route.ts` | New — leaderboard + user rank API |
| `src/app/api/leagues/settle/route.ts` | New — cron settlement endpoint |
| `src/components/common/LeagueBadge.tsx` | New — tier badge component |
| `src/app/(app)/leagues/page.tsx` | New — leagues page |
| `src/app/(app)/dashboard/page.tsx` | Edit — add badge + mini league card |
| `src/app/(app)/layout.tsx` | Edit — add Leagues nav link |
| `src/lib/i18n/en.json` | Edit — add `leagues.*` keys |
| `src/lib/i18n/ru.json` | Edit — add `leagues.*` keys |
| `vercel.json` | New/Edit — add cron config |

---

## Risks

| Level | Risk | Mitigation |
|---|---|---|
| MEDIUM | Settlement RPC updates all user profiles atomically | Runs inside a transaction; safe for < 10K users; add timeout guard for scale |
| MEDIUM | Cron failure leaves a season unsettled | Endpoint is idempotent; can be re-triggered manually via curl |
| LOW | Leaderboard exposes display_name + avg sharpness | Game metric, not PII; consistent with standard leaderboard norms |
| LOW | Very small league (< 5 qualifying users) | Promotion cutoff floored at 1; small leagues still function correctly |
| LOW | New season not created until first game Monday | `get_or_create_current_season` lazily creates it; no gap in data |

---

## Estimated Effort

| Layer | Hours |
|---|---|
| DB migration + 3 RPCs | 2 |
| Game save hook + settle cron route | 1 |
| Leagues GET API | 1 |
| `LeagueBadge` component | 0.5 |
| Dashboard edits | 1 |
| `/leagues` page | 2 |
| i18n + cron config | 0.5 |
| **Total** | **~8 hours** |
