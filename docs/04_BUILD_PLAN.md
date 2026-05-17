# Sharpki — 7-Day Build Plan (tactical reference)

> ⚠️ **Status: appendix / tactical reference only.**
>
> The canonical execution plan is `docs/07_PHASES.md`. The work is sliced into **8 sequential phases with one trackable goal each**, not days. Follow that file.
>
> This file is preserved for:
> - The **SQL schema** (`Appendix — SQL schema`) — referenced by Phase 1.
> - The **engine implementation notes** (`Appendix — engine implementation notes`) — referenced by Phase 2.
> - The **fallback ordering** (`Appendix — fallback plan if you fall behind`) — referenced by `07_PHASES.md → When to skip a phase`.
> - The day-by-day sequence below as **historical context** for what work belongs in which phase.
>
> The mantra still holds: ruthless scope cuts. Anything not in `02_PRD.md → Section 3 (Must-have)` does not ship in week 1.

---

> Original goal statement (kept for context):
> Stack: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase + Fireworks AI + Stripe + PostHog + Vercel.

---

## Day 0 — pre-flight (today, 1–2 hours)

### Accounts & keys to set up (parallel)
- [ ] Supabase project (free tier) → save URL + anon key + service role key
- [ ] Fireworks AI account → API key (start with $1 free credit)
- [ ] Stripe account in test mode → publishable + secret keys + webhook secret
- [ ] PostHog Cloud project (free tier, EU region) → API key + host
- [ ] Vercel account, connect GitHub repo
- [ ] Domain: register `sharpki.app` or alternate name (Namecheap, ~$12/yr)
- [ ] Google Cloud project for OAuth client (for Supabase Google auth) → client ID + secret

### Decisions to lock in (before writing code)
- [ ] Confirm final name (Sharpki or alternate)
- [ ] Pick primary language default (recommendation: detect from `Accept-Language`, fall back to RU)
- [ ] Free/Pro/Family pricing locked: $0 / $4.99 mo or $39.99 yr / $9.99 mo or $79.99 yr
- [ ] Family plan: ship UI on landing, defer checkout flow to week 2

### Output of Day 0
- Empty repo at `github.com/itsaibarr/sharpki` (or your handle)
- `.env.local` with all keys
- Vercel project linked
- Domain pointing to Vercel preview

---

## Day 1 — foundation (8–10h)

### Goals
- Next.js 15 app bootstrapped with auth, db, basic routing.
- Landing page (placeholder) deployed.

### Tasks (in order)

1. **Scaffold Next.js 15 + Tailwind + shadcn/ui via the `b2fA` preset**

   This one command does Next.js + Tailwind + shadcn/ui init in a single shot, with the chosen visual identity baked in:

   ```bash
   npx shadcn@latest init --preset b2fA --template next --name sharpki
   cd sharpki
   ```

   `b2fA` bakes in: **Nova style · Neutral base color · Lucide icons · Geist font · default radius · subtle menu accent**.

   Verify the preset before continuing (defensive):
   ```bash
   npx shadcn@latest preset decode b2fA   # should show style=nova, baseColor=neutral, font=geist, iconLibrary=lucide
   ```

2. **Add the shadcn components we actually need for MVP**

   ```bash
   npx shadcn@latest add button card dialog input form label tabs toast skeleton \
     avatar badge dropdown-menu navigation-menu popover progress scroll-area \
     separator sheet switch tooltip alert sonner
   ```

   Rationale per component:
   - `button card dialog input form label` — core building blocks
   - `tabs` — settings page, pricing toggles (monthly/yearly)
   - `toast` + `sonner` — feedback after game saves, paywall closures, Stripe redirects
   - `skeleton` — loading states for analysis screen (LLM call takes 3–5s)
   - `avatar badge` — header user menu, streak badges, level badges
   - `dropdown-menu navigation-menu` — header nav, settings dropdown
   - `popover tooltip` — AI Coach micro-explanations, sharpness-score breakdown
   - `progress` — Sharpness Score gauge, puzzle solved animations
   - `scroll-area` — game move list, history
   - `separator` — sectional dividers
   - `sheet` — mobile menu (slide-in from side)
   - `switch` — accessibility-mode toggle, theme toggle, language switcher
   - `alert` — informational banners (free-tier limits, payment errors)

3. **Add a warm brand accent on top of the neutral palette** (5 minutes, big impact)

   The neutral preset is professional but cold for a coaching brand. Override the `--primary` CSS variable with a warm honey/amber tone for CTAs, while keeping every other neutral. Edit `src/app/globals.css`:

   ```css
   @layer base {
     :root {
       /* Warm Sharpki primary — honey/amber, conveys care + premium */
       --primary: oklch(0.74 0.14 65);          /* light: warm amber */
       --primary-foreground: oklch(0.18 0.02 60);
     }
     .dark {
       --primary: oklch(0.78 0.14 70);          /* dark: slightly brighter amber */
       --primary-foreground: oklch(0.16 0.02 60);
     }
   }
   ```

   This gives every Button (default), every link, every Sharpness Score arc a warm signature color while everything else stays neutral. Test against the dashboard before committing.

4. **Install remaining dependencies**

   ```bash
   npm i @supabase/supabase-js @supabase/ssr posthog-js posthog-node stripe @stripe/stripe-js zustand next-intl zod openai resend
   npm i -D vitest @vitest/ui @types/node
   ```

   (Note: we use the `openai` package against the Fireworks OpenAI-compatible endpoint.)

5. **Folder structure** (commit as the first PR):
   ```
   src/
     app/
       (marketing)/
         page.tsx              # Landing
         pricing/page.tsx
         privacy/page.tsx
         terms/page.tsx
       (app)/
         dashboard/page.tsx
         play/page.tsx
         play/[gameId]/page.tsx
         analysis/[gameId]/page.tsx
         puzzles/page.tsx
         puzzles/[puzzleId]/page.tsx
         history/page.tsx
         settings/page.tsx
         layout.tsx           # Auth-gated layout
       api/
         coach/analyze/route.ts
         stripe/webhook/route.ts
         stripe/checkout/route.ts
         stripe/portal/route.ts
         games/save/route.ts
       layout.tsx
       globals.css
     components/
       board/
         Board.tsx
         Square.tsx
         Piece.tsx
       game/
         GameControls.tsx
         MoveList.tsx
         GameResultModal.tsx
       coach/
         AnalysisCard.tsx
         CoachExplanationBubble.tsx
       puzzle/
         PuzzleBoard.tsx
       common/
         Header.tsx
         Footer.tsx
         AccessibilityToggle.tsx
         LanguageSwitcher.tsx
         StreakBadge.tsx
         SharpnessGauge.tsx
       ui/                     # shadcn components
     lib/
       engine/
         board.ts              # Board representation, initial position
         moves.ts              # Move generation, capture chains
         eval.ts               # Position evaluation
         search.ts             # Minimax + alpha-beta
         engine.ts             # Public API
         types.ts
         engine.test.ts        # Critical: unit tests for rules
       supabase/
         client.ts             # Browser client
         server.ts             # Server client (RSC + route handlers)
         middleware.ts
       stripe/
         client.ts
         products.ts
       posthog/
         server.ts
         client.ts
       coach/
         prompt.ts
         types.ts
         fireworks.ts
         critical_moments.ts
       i18n/
         ru.json
         en.json
         index.ts
       sharpness/
         compute.ts            # Sharpness Score computation
       utils.ts
     workers/
       engine.worker.ts        # Web Worker for medium/hard bot
     middleware.ts             # Auth + i18n routing
   supabase/
     migrations/
       001_initial.sql
       002_rls.sql
       003_seed_puzzles.sql
   public/
     ...
   ```

6. **Supabase migrations** — write SQL for schema (see `Appendix: SQL schema` below).
   Run with `npx supabase db push` or via dashboard.

7. **Auth integration** — `lib/supabase/server.ts` + `lib/supabase/client.ts` + `middleware.ts`. Use the canonical `@supabase/ssr` pattern.

8. **Landing page (v0)** — hero + features + pricing + footer. Use shadcn components. Hardcode all copy in JSX for now; move to i18n on Day 2.

9. **PostHog init** — wire up in `app/layout.tsx` (client side, with consent gate).

10. **Deploy to Vercel** — confirm landing renders on the domain.

### Day 1 done = deployed landing page with auth working

---

## Day 2 — engine (10–12h, the longest day)

### Goals
- Russian shashki engine working: board, moves, captures, kings, win/draw detection.
- 200+ position unit tests passing.
- Basic AI bot (Easy random + Medium minimax) returning legal moves.

### Tasks (in order)

1. **Board representation** (`lib/engine/board.ts`)
   - 8×8 board, only dark squares used. Index dark squares 1–32 (standard PDN numbering) OR use a 64-cell array with null for light squares — pick one and document.
   - Recommendation: **64-cell array** with `null | { color: 'b'|'w', isKing: boolean }` per cell. Simpler debugging. Performance is fine for depth-6 minimax.

2. **Move generation** (`lib/engine/moves.ts`)
   - `generateMoves(board, player) → Move[]`
   - Returns NON-capture moves only if no captures exist (mandatory captures rule).
   - For each piece, find: forward simple moves, backward simple moves not allowed for men, capture chains (recursive).
   - **Capture chain rules** (Russian variant — critical):
     - Men capture forward OR backward.
     - Kings are flying: can land any distance in either direction.
     - Mid-sequence promotion: if a man lands on the back rank during a chain, it becomes a king AND must continue capturing if a king-capture is available.
     - Player picks among legal capture sequences (Russian does NOT force max-capture, unlike international rules).
   - Heavy invariant: any move passed to `applyMove` MUST come from `generateMoves`. Catch bugs early.

3. **Apply move** (`applyMove(board, move) → board`)
   - Returns new board, immutable.
   - Promotes if landing on back rank (or already king).

4. **Game state** (`getGameState(board, sideToMove, history) → { status, result, reason }`)
   - Status: `playing | won | drawn`
   - Reason for end: `checkmate | no-pieces | no-moves | 3-fold | 25-move-rule | agreement | resignation`
   - 25-move rule: 25 successive moves where only kings moved AND no captures (Russian rule). Track in history.
   - 3-fold rep: hash position + side to move; count occurrences.

5. **Position evaluation** (`lib/engine/eval.ts`)
   - `eval(board, sideToMove) → number` (centipiece-like units)
   - Components: material (men=100, kings=300), back-rank holding bonus (+10), center control (+5/center square occupied), mobility (+1/legal move), tempo bonus when ahead.
   - This is *good enough* for medium bot and for AI coach critical-moment detection. Hard bot uses depth 8 with this eval; that should be club-level. (If not, swap eval in week 2.)

6. **Search** (`lib/engine/search.ts`)
   - Minimax with alpha-beta pruning.
   - Iterative deepening with depth cap.
   - Time cap (max 1500ms for hard, 500ms for medium).
   - Quiescence search at leaves (extend through captures only) — small but important quality bump.
   - Returns `{ bestMove, eval, principalVariation }`.

7. **Public API** (`lib/engine/engine.ts`):
   ```ts
   export interface Engine {
     newGame(): GameState;
     applyMove(state: GameState, move: Move): GameState;
     getLegalMoves(state: GameState): Move[];
     getBestMove(state: GameState, level: 'easy'|'medium'|'hard'): Move;
     evaluatePosition(state: GameState): { eval: number; bestMove: Move | null };
   }
   ```

8. **Unit tests** (`engine.test.ts`) — critical
   - Use Vitest or Jest.
   - At least 50 tests covering:
     - Initial position legality
     - Forward/backward man moves
     - Single captures (each direction)
     - Multi-jump chains
     - King moves (flying)
     - King multi-captures with stop-square choice
     - Mid-sequence promotion
     - Mandatory capture enforcement
     - Win conditions
     - 25-move and 3-fold draw rules
   - **Set up CI** to block PRs with failing engine tests.

9. **Web Worker wrapper** (`workers/engine.worker.ts`)
   - Receives `{ board, level }`, returns best move.
   - Used for medium and hard. Easy runs main thread (it's instant).

### Day 2 done = engine returns legal moves and beats you (yes, you should lose to Hard)

---

## Day 3 — gameplay UI + AI Coach (10h)

### Goals
- Play a full game vs AI in the browser.
- After game end, request AI Coach analysis, get warm warm explanation back.
- All saved to Supabase.

### Tasks

1. **`<Board>` component** (`components/board/Board.tsx`)
   - 8×8 grid via CSS grid. Dark squares only have pieces.
   - Pieces render with Lucide icons (`Circle`, `Crown` for king).
   - Click-to-select-piece, click-to-move target. Mobile: tap-to-tap (no drag for v1; simpler).
   - Highlights: selected piece, legal move targets, last move.
   - Animation: piece slides to target (200ms; 600ms in accessibility mode).
   - Move-list panel renders captures vs simple moves differently.

2. **`<GameControls>`** — opponent selector (Easy/Medium/Hard), resign button, offer-draw button, undo (toggle: disabled vs AI in MVP), clock optional (cut from MVP).

3. **Game page** (`app/(app)/play/page.tsx`)
   - Pre-game lobby: pick opponent level + your color + language.
   - "Start game" → creates `games` row → navigates to `/play/[gameId]`.

4. **Game session** (`app/(app)/play/[gameId]/page.tsx`)
   - Loads game state from server.
   - Runs game loop: human move → save to DB → AI move via Web Worker → save → repeat.
   - Game-end → result modal with "Get AI Analysis" CTA.

5. **AI Coach endpoint** (`app/api/coach/analyze/route.ts`)
   - Auth gate (Supabase session).
   - Rate limit (1/day free, 10/hour Pro) — use Supabase row in `rate_limits` table or upstash if added.
   - Load game from DB.
   - Re-run game through engine, capture per-move eval.
   - Identify critical moments (eval swing ≥ 1.5).
   - Build prompt (see PRD Appendix A).
   - Call Fireworks via OpenAI client — through the abstraction layer in `lib/coach/llm.ts`:
     ```ts
     // lib/coach/llm.ts
     import OpenAI from "openai";

     const fireworks = new OpenAI({
       apiKey: process.env.FIREWORKS_API_KEY!,
       baseURL: "https://api.fireworks.ai/inference/v1",
     });

     const MODEL = process.env.COACH_MODEL ?? "accounts/fireworks/models/qwen3p6-plus";

     export async function callCoach(systemPrompt: string, userPrompt: string) {
       return fireworks.chat.completions.create({
         model: MODEL,
         messages: [
           { role: "system", content: systemPrompt },  // static; Fireworks caches this for ~$0.10/M tokens
           { role: "user", content: userPrompt },
         ],
         response_format: { type: "json_object" },
         temperature: 0.6,
         max_tokens: 800,
         // Fireworks prompt caching is automatic when the prefix is identical across calls.
         // Keep the system prompt byte-for-byte stable and place it first.
       });
     }
     ```
   - **Critical**: keep the system prompt 100% stable across calls so Fireworks' prompt cache hits. Move dynamic content (game data, user level, language) entirely into the `user` message.
   - Parse, validate with Zod, persist to `game_analyses`. Capture `tokens_in`, `tokens_out`, and computed `cost_usd` per call for cost monitoring.
   - Return to client.

6. **Analysis page** (`app/(app)/analysis/[gameId]/page.tsx`)
   - Render the analysis JSON nicely: overall verdict, highlights with mini-boards, key lesson, encouragement.
   - "Share" button (S4) — generate a PNG via @vercel/og.

7. **Sharpness Score compute** (`lib/sharpness/compute.ts`)
   - After every game: accuracy from move vs top-3 engine moves; blunder count; tempo (consistency vs user's baseline).
   - Update `profiles.current_sharpness` as EMA-7.

### Day 3 done = play a full game + see AI Coach analysis. Soft launch private to you.

---

## Day 4 — puzzles + dashboard + streak (8h)

### Goals
- Daily puzzle works end-to-end.
- Dashboard shows streak, Sharpness Score 7-day trend, recent games.
- Game history page.

### Tasks

1. **Seed puzzles** — write 30 curated Russian shashki tactical positions into `puzzles` table.
   - Format: `{ id, fen-equivalent (board state JSON), side_to_move, solution_move, theme, explanation_ru, explanation_en, difficulty }`.
   - Source from public shashki problem sets (cite responsibly). Validate every solution with the engine.

2. **Puzzle page** (`app/(app)/puzzles/page.tsx`):
   - Today's puzzle picked by user's level and not-yet-attempted.
   - Free: 1/day. Pro: full library.

3. **PuzzleBoard component** — like Board but locked to single-move solution.
   - On correct → confetti + show explanation. On wrong → 1 retry + "show solution" CTA.

4. **Dashboard** (`app/(app)/dashboard/page.tsx`)
   - Hero: streak + sharpness gauge + "Play a game" big button.
   - Section: today's puzzle preview.
   - Section: last 3 games (clickable to analysis).
   - Section: Pro upsell banner (if free + qualifying conditions).

5. **History page** — paginated game list with filters (won/lost/draw, opponent level).

6. **Streak logic** (server-side) — on every game save and puzzle attempt, check `profiles.last_activity_date`; advance or break streak. Store `streak_days` and `streak_freezes_remaining` (1/month for Pro).

7. **Email after game (S2)** — use Supabase Auth emails for transactional; for the "first analysis email," send via Resend (free tier 100 emails/day). Set up Resend account + write 1 transactional template.

### Day 4 done = daily user loop is real

---

## Day 5 — payments + paywall + polish (10h)

### Goals
- Stripe Checkout works end-to-end in test mode.
- Paywall modals trigger at the right moments.
- UI is polished, responsive, accessible.

### Tasks

1. **Stripe products + prices** (Stripe dashboard):
   - 1 product "Sharpki Pro"
   - 2 prices: monthly $4.99, yearly $39.99
   - 1 product "Sharpki Family" (placeholder for week 2 UX)

2. **Checkout endpoint** (`app/api/stripe/checkout/route.ts`):
   - Auth gate.
   - Create or fetch Stripe customer linked to `auth.users.id`.
   - Create Checkout Session, return URL.
   - Success redirect: `/dashboard?upgraded=true`. Cancel redirect: `/pricing`.

3. **Webhook** (`app/api/stripe/webhook/route.ts`):
   - Verify signature (`stripe.webhooks.constructEvent`).
   - Handle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
   - Upsert `subscriptions` table and update `profiles.subscription_tier`.

4. **Customer Portal** (`app/api/stripe/portal/route.ts`) — create billing portal session for the logged-in user.

5. **Paywall modal** (`components/PaywallModal.tsx`)
   - Trigger when:
     - 2nd AI analysis request of the day (free)
     - 6th game of the day (free)
     - 2nd puzzle of the day (free)
   - Copy: clean, no dark patterns. "Unlock unlimited AI coaching for $4.99/mo. Cancel anytime."
   - PostHog event `paywall_shown` with reason.

6. **Accessibility polish**
   - Verify keyboard navigation across all pages.
   - All buttons have aria-label.
   - Board squares accessible by keyboard.
   - Run Lighthouse accessibility audit; fix any score <95.

7. **Responsive polish** — verify everything works on 360px, 768px, 1280px.

8. **Theme + dark mode** — wire up shadcn theme toggle.

9. **I18n complete** — verify every visible string is in `ru.json` and `en.json`. Use `next-intl`. Set language from URL `/ru/...` and `/en/...`, default `/ru/...`.

### Day 5 done = clean, polished, monetized product. Could pitch tomorrow.

---

## Day 6 — analytics + content + deploy (6h)

### Goals
- PostHog events all firing.
- Privacy + Terms pages live.
- README polished for submission.
- Production deploy verified.

### Tasks

1. **PostHog events** (see METRICS.md for full taxonomy)
   - On every key UI action, fire the event.
   - Set up 4 funnels in PostHog dashboard:
     - Signup funnel (lp_viewed → signup_started → signup_completed)
     - Activation funnel (signup_completed → game_started → game_completed → analysis_requested)
     - Monetization funnel (paywall_shown → checkout_started → checkout_completed)
     - Retention funnel (d1, d3, d7 return)
   - Set up 1 retention chart: cohort weekly retention.

2. **Privacy + Terms pages** — use a generator (e.g., `https://www.iubenda.com/`) to draft, then customize. Link in footer.

3. **Cookie banner** — minimal; PostHog opt-in.

4. **SEO**
   - Set `<title>` and `<meta description>` per page.
   - Open Graph image (use @vercel/og to generate per page).
   - Sitemap.xml + robots.txt.

5. **README.md** — write the public README for the submission form. See `05_README_TEMPLATE.md` in this docs folder.

6. **Production deploy** — final smoke test on production URL.

7. **Submit form** — fill in `https://nfactorialschool.typeform.com/to/HYVeKeEx` with project URL, GitHub URL, README description.

### Day 6 done = SUBMITTED. Buffer day 7.

---

## Day 7 — buffer + polish + soft launch (variable)

### Goals
- Fix any bugs discovered post-deploy.
- Run 5 user tests (friends/family) via screen share.
- Soft launch to personal network and target subreddits.

### Tasks

1. **5 user tests via Google Meet / Telegram**:
   - 2 senior users (target persona)
   - 2 adult-child users (caregiver persona)
   - 1 tech-savvy peer (catches edge cases)
   - Watch silently. Note every pause, confusion, click-mistake.
   - Fix top 3 highest-impact issues.

2. **Soft launch posts (if time permits, otherwise day 8)**:
   - Personal Telegram + WhatsApp
   - Russian-speaking Reddit communities
   - One post on Almaty/Astana tech Telegram channels

3. **Set up Tally form for waitlist** to capture interest beyond Pro paywall.

4. **Monitor PostHog** for first 24h of data; note any odd drops or errors.

---

## Appendix — SQL schema (initial migration)

```sql
-- 001_initial.sql

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
  cost_usd numeric(8,5),
  created_at timestamptz not null default now(),
  unique (game_id, language)
);
create index idx_analyses_user on public.game_analyses (user_id, created_at desc);

create table public.puzzles (
  id uuid primary key default uuid_generate_v4(),
  slug text unique,
  position jsonb not null,                 -- board state (which squares have what)
  side_to_move text not null check (side_to_move in ('white', 'black')),
  solution_moves jsonb not null,           -- array of moves; first is the key move
  theme text,                              -- 'double_capture', 'breakthrough', 'king_promotion', etc.
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

-- RLS

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_analyses enable row level security;
alter table public.puzzles enable row level security;
alter table public.puzzle_attempts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.rate_limits enable row level security;

-- Read own profile, update own profile
create policy "read_own_profile" on public.profiles
  for select using (auth.uid() = id);
create policy "update_own_profile" on public.profiles
  for update using (auth.uid() = id);
create policy "insert_own_profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Games, analyses, puzzle_attempts, subscriptions, rate_limits: own rows only
create policy "own_games" on public.games for all using (auth.uid() = user_id);
create policy "own_analyses" on public.game_analyses for all using (auth.uid() = user_id);
create policy "own_attempts" on public.puzzle_attempts for all using (auth.uid() = user_id);
create policy "own_subs" on public.subscriptions for select using (auth.uid() = user_id);
create policy "own_rate" on public.rate_limits for all using (auth.uid() = user_id);

-- Puzzles: world-readable
create policy "read_puzzles" on public.puzzles for select using (true);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## Appendix — engine implementation notes (do these right, save time)

1. **Capture chain generation** — recurse. From a starting square, for each enemy piece in capture range, jump it, recursively generate further captures from landing square, accumulate all paths. Return the full tree of capture sequences; the player chooses one.

2. **Promotion mid-sequence** — when a man lands on the back rank during a capture chain, mark it `isKing=true`, then continue capture generation with king rules from that square.

3. **Mandatory captures** — `generateMoves` returns `captures` if any exist, else `simpleMoves`. Never both.

4. **Move serialization** — use compact JSON: `{ from: number, to: number, captures: number[] }`. Apply move = remove captured pieces + move piece + promote if applicable.

5. **3-fold detection** — hash position via FNV-1a on the 32 dark squares + side-to-move; maintain a Map<hash, count>. Increment after each move. If count ≥ 3, game is drawn unless next move is a capture.

6. **25-move rule (Russian)** — after each move, increment `kingsOnlyCounter` if move was a king-non-capture; reset on man-move or capture. ≥25 → drawn.

7. **Bot timing** — `getBestMove` has hard time limit. Iterative deepening: try depth 4 → 5 → 6 → … abort when wall clock exceeds budget.

8. **Test data sources** — generate test positions using a known correct reference. Lidraughts has API for engine eval; pydraughts can be used in a script offline.

---

## Appendix — fallback plan if you fall behind

If you're behind by end of Day 3, cut these in this exact order:

1. Day 4 features: skip puzzles entirely; ship just games + analysis + dashboard
2. Day 5 features: skip Family plan UI; only ship Pro monthly + yearly
3. Day 5 features: skip dark mode (system-only)
4. Day 6 features: skip Open Graph custom images
5. Day 4 features: skip streak entirely (just track games)

**Never cut**: auth, engine correctness, AI Coach analysis, Stripe paywall. Those four are the product.

---

## Day-by-day summary card (print and tape to monitor)

```
D1 [Foundation]  scaffold + auth + landing + deploy
D2 [Engine]      Russian shashki rules + bot + tests
D3 [Game + Coach] play loop + Fireworks AI Coach
D4 [Loop]        puzzles + dashboard + streak
D5 [Money]       Stripe + paywall + polish
D6 [Ship]        analytics + privacy + deploy + submit
D7 [Iterate]     user tests + soft launch
```
