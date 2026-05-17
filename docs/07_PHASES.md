# Sharpki — Phase Plan

> Canonical execution plan. The work is sliced into **8 sequential phases**. Each phase has **exactly one trackable goal**, verified by both an automated check and a manual smoke test.
>
> This file replaces the day-by-day plan in `04_BUILD_PLAN.md` as the source of truth for "what are we doing right now." `04_BUILD_PLAN.md` is preserved as a tactical reference for SQL schema, engine implementation notes, and fallback ordering.

---

## Why phases (not days)

Bundling multiple goals into one work block (e.g., "Day 1: scaffold + auth + landing + deploy") produces a mediocre version of each. The fix is rigid single-goal phases:

- **One goal per phase.** If you're touching code that doesn't serve the current goal, you are off-task. Note it as backlog, do not act on it.
- **A phase is done or not done — no partial credit.** The "Definition of done" line is a binary check.
- **Phases are sequential, not parallel.** Do not start phase N+1 until phase N's DoD passes.
- **Both checks must pass.** Automated check catches regressions; manual smoke catches the things tests don't notice (UX, copy, feel).

A phase that "almost passes" is a failed phase. Fix it before moving on.

---

## Discipline rules

1. **Resist scope creep.** Tempted to fix something adjacent? Add it to that phase's `Backlog:` list. Do not touch it.
2. **No silent rework.** If you must revisit a previous phase, write what changed in that phase's `Revisions:` list before touching code.
3. **Update the current phase pointer in `CLAUDE.md`** after each phase completes (the "Current build phase" section).
4. **The MVP non-goals in `CLAUDE.md` are sacred.** No phase introduces them.

---

## Status

| # | Phase | Status |
|---|---|---|
| 1 | Foundation | not started |
| 2 | Engine | not started |
| 3 | Gameplay loop | not started |
| 4 | AI Coach | not started |
| 5 | Engagement loop | not started |
| 6 | Monetization | not started |
| 7 | Polish | not started |
| 8 | Ship | not started |

---

## Phase 1 — Foundation

**Goal**: A signed-in user lands on a working app shell with the database schema and RLS in place.

**Why this is one goal**: every later phase depends on auth + DB + a deployable shell. They form one indivisible substrate; if any one is broken, nothing else works. Treating them as one goal forces them to be wired together end-to-end before moving on.

**Automated check**:
- `npm run build` exits 0
- `npm run typecheck` exits 0 (after `npm run lint` passes)
- All seven tables exist:
  ```sql
  select table_name from information_schema.tables
  where table_schema = 'public'
  order by table_name;
  -- expected: game_analyses, games, profiles, puzzle_attempts,
  --           puzzles, rate_limits, subscriptions
  ```
- After a test signup, a `profiles` row exists with `id = auth.users.id`:
  ```sql
  select count(*) from profiles where id = '<test-user-uuid>';
  -- expected: 1
  ```

**Manual smoke test**:
- Visit the Vercel preview URL → landing page renders without console errors.
- Click "Sign in with Google" → OAuth completes → redirected to (placeholder) dashboard route.
- Open Supabase Studio → `profiles` has exactly one row for the test user.
- Sign in as a second test account → second `profiles` row appears.
- From the second session, attempt to read the first user's row via the client — RLS blocks it (zero rows returned, no error leak).

**Scope** (files / commands):
- `npx shadcn@latest init --preset b2fA --template next --name sharpki`
- `npx shadcn@latest add button card dialog input form label tabs toast skeleton avatar badge dropdown-menu navigation-menu popover progress scroll-area separator sheet switch tooltip alert sonner`
- `npm i @supabase/supabase-js @supabase/ssr posthog-js posthog-node stripe @stripe/stripe-js zustand next-intl zod openai resend`
- `npm i -D vitest @vitest/ui @types/node`
- Folder structure per `CLAUDE.md` → "Folder structure (canonical)"
- Warm primary CSS override in `src/app/globals.css` (honey/amber `--primary`)
- `supabase/migrations/001_initial.sql` + `002_rls.sql` applied (`npx supabase db push`)
- `lib/supabase/{client,server,middleware}.ts` + root `middleware.ts`
- `.env.local` filled from `.env.example`
- Placeholder `/dashboard` route that just confirms session

**Definition of done**: every automated check passes AND every manual smoke step reproduces. Update CLAUDE.md "Current build phase" to "Phase 2 — Engine" before moving on.

**Backlog**:
<!-- adjacent work spotted during this phase — do NOT act on it now -->

**Revisions**:
<!-- if you return to this phase later, record what changed and why -->

---

## Phase 2 — Engine

**Goal**: A complete, correct Russian shashki engine usable from both the main thread and a Web Worker, with all 6 rule invariants from `CLAUDE.md` covered by tests.

**Why this is one goal**: the engine is the core IP. Splitting it ("simple moves" / "captures" / "search") tempts you to declare an early sub-phase "done" while the rule interactions are still broken. Tests of all 6 invariants must pass simultaneously, against a single integrated engine API.

**Automated check**:
- `npm run test:engine` is green and asserts at least 80 unit tests covering:
  1. Mandatory captures (non-capturing move is illegal when a capture is available)
  2. Men capture forward AND backward
  3. Flying kings (move and capture any distance diagonally)
  4. Mid-sequence promotion (man → king during chain; chain continues as king)
  5. Choice among captures (Russian rule, not max-capture)
  6. All draw conditions (3-fold repetition, 25 king-only moves, 3K vs 1K)
- `getLegalMoves(newGame()).length === 7` for white at start (man on row 6 cannot move; only 4 white men on row 5 can move — but check actual count from the chosen rule set and lock it in a test).
- `getBestMove(state, 'hard')` returns a legal move on a benchmark mid-game position in **under 2000 ms**.
- Engine API outputs are immutable: `applyMove(state, move)` returns a new state; the input state's `===` identity is unchanged.

**Manual smoke test**:
- Open a Node REPL or write a one-off script:
  - `newGame()` → log the board → matches the standard Russian shashki starting position.
  - Construct a position where white has a capture available → call `getLegalMoves` → only capture sequences are returned, no quiet moves.
  - Construct a position where a white man is one square from the back rank with a capture sequence that crosses the back rank → confirm the result piece is a king AND the chain continued as a king.
  - Construct a position with 25 successive king-only moves → confirm `getGameState` returns `drawn`.
- Play 1 quick game from the terminal (or a throwaway page) against the Hard bot; lose deliberately to confirm it picks reasonable captures.

**Scope** (files):
- `lib/engine/types.ts`
- `lib/engine/board.ts`
- `lib/engine/moves.ts`
- `lib/engine/eval.ts`
- `lib/engine/search.ts`
- `lib/engine/engine.ts` (public API: `{ newGame, applyMove, getLegalMoves, getBestMove, evaluatePosition }`)
- `lib/engine/engine.test.ts`
- `workers/engine.worker.ts`
- `package.json` script: `"test:engine": "vitest run lib/engine"`

**Definition of done**: full test suite green, performance check passes, all 6 invariant smoke tests reproduce, and the Web Worker is wired (a throwaway component can call `getBestMove` off-thread without blocking the UI).

**Backlog**:

**Revisions**:

---

## Phase 3 — Gameplay loop

**Goal**: A signed-in user can play one full game vs the bot end-to-end, with the game persisted to `games` and `profiles.current_sharpness` updated.

**Why this is one goal**: the board UI, the move-application loop, the game-end modal, and the Sharpness Score compute are all stops on a single user journey. If any one is broken, the journey fails. Bundling them into one phase forces end-to-end verification of the actual user flow before moving on.

**Automated check**:
- A scripted integration test (or a manual scripted Supabase insert) creates a `games` row, simulates moves through the engine, calls the save endpoint, and asserts:
  - `select moves, result, sharpness_score from games where id = '<game-id>'` → moves array length matches simulation, `result` ∈ {`win`,`loss`,`draw`}, `sharpness_score` between 0 and 100.
  - `select current_sharpness from profiles where id = '<user-id>'` → matches expected EMA-7 given the test game's score.
- `getLegalMoves(state).length > 0` is asserted on every turn before the UI accepts a click — illegal moves are rejected.

**Manual smoke test**:
- Sign in → `/play` → pick **Easy** + **white** + **Russian** → "Start game" → URL becomes `/play/[gameId]`.
- Click a piece → legal target squares highlight → click a target → piece moves smoothly → bot replies within 200 ms.
- Play to completion (win or resign).
- Game-end modal shows: result, this-game Sharpness Score, "Get AI Analysis" CTA (clicking does nothing yet — that's Phase 4).
- Reload `/history` (placeholder if not built yet) and verify the game is recorded in DB via Supabase Studio.
- The game also works on phone-width (360 px) at a basic level — pieces are tappable, board is not cut off.

**Scope** (files):
- `components/board/{Board,Square,Piece}.tsx`
- `components/game/{GameControls,MoveList,GameResultModal}.tsx`
- `app/(app)/play/page.tsx` (pre-game lobby)
- `app/(app)/play/[gameId]/page.tsx` (game session)
- `app/api/games/save/route.ts`
- `lib/sharpness/compute.ts`
- Zustand store for current-game client state (if needed)

**Definition of done**: scripted flow produces correct DB state AND a human can play a full game end-to-end with no console errors, no illegal-move acceptance, and a saved game in the DB.

**Backlog**:

**Revisions**:

---

## Phase 4 — AI Coach

**Goal**: After a finished game, a user requests analysis → receives structured, game-specific JSON from Fireworks → sees a rendered analysis page with highlights that reference real moves from their game.

**Why this is one goal**: the AI Coach IS the wedge. The critical-moment detector, the prompt, the Fireworks client, the Zod validation, the persistence, and the analysis UI are all in service of a single user-visible outcome: "I see a warm, specific explanation of MY game." Anything less is not the wedge.

**Automated check**:
- An integration test posts a fixture game to `/api/coach/analyze`:
  - Response status 200.
  - Response body parses against the Zod schema in `lib/coach/types.ts` (`overall_quality`, `sharpness_score_for_this_game`, `highlights[]`, `key_lesson`, `encouragement`).
  - At least one `highlights[].move_number` matches a real move number from the fixture game (no generic output).
  - `select tokens_in, tokens_out, cost_usd from game_analyses where game_id = '<id>' and language = 'ru'` returns one row; `cost_usd` < 0.005.
- Calling the same endpoint a second time with the same `(game_id, language)` does NOT trigger a new Fireworks request (cache hit; check by asserting unchanged Fireworks call count via a spy or by observing `created_at` unchanged).
- System prompt is byte-stable: a unit test asserts the system prompt is read from a constant, not built dynamically.

**Manual smoke test**:
- Play a fresh game → click "Get AI Analysis" on the game-end modal.
- Within 7 seconds (target 4 s), the analysis page loads.
- The highlights reference specific move numbers from this game (e.g., "On move 14 you …") — not generic shashki advice.
- The output is in the user's language (`ru` by default).
- The Sharpness Score on the page matches `games.sharpness_score` for this game.
- As a Free user, request a second analysis the same day → rate-limit kicks in (paywall trigger fires; see Phase 6 — for now the API returns 429).

**Scope** (files):
- `lib/coach/types.ts` (Zod schema)
- `lib/coach/prompt.ts` (byte-stable system prompt)
- `lib/coach/critical_moments.ts` (engine-eval swing detector)
- `lib/coach/llm.ts` (Fireworks via `openai` package, behind `COACH_MODEL` env)
- `app/api/coach/analyze/route.ts` (auth gate, rate limit, pipeline, cost capture, persistence)
- `app/(app)/analysis/[gameId]/page.tsx`
- `components/coach/{AnalysisCard,CoachExplanationBubble}.tsx`
- `rate_limits` table read/write on this endpoint

**Definition of done**: schema validation, caching, cost tracking, AND visible specificity in the rendered analysis. Test the same game in both `ru` and `en` to confirm i18n on the LLM output.

**Backlog**:

**Revisions**:

---

## Phase 5 — Engagement loop

**Goal**: The daily user loop is real — daily puzzle, streak, dashboard, and history all work, so a returning user has somewhere to land and something to do.

**Why this is one goal**: streak / puzzle / dashboard / history are all components of the **D1+ retention loop**. They only matter together — a puzzle without a streak doesn't move retention, a streak without a dashboard isn't visible, a dashboard without a history can't show "what did I do yesterday?". Ship them as one block.

**Automated check**:
- Seed `003_seed_puzzles.sql` inserts 30 rows; `select count(*) from puzzles` returns 30.
- A scripted test: as a user with `last_activity_date` = yesterday and `streak_days` = 4, insert a `games` row dated today → after the save endpoint runs, `streak_days = 5` and `last_activity_date = today`.
- After 2-day gap: `streak_days` resets to 1 on next activity (or burns a `streak_freezes_remaining` if user is Pro).
- Dashboard data query returns last 3 games for the user.
- A scripted puzzle-attempt with the correct `solution_move` writes `puzzle_attempts.solved = true`.

**Manual smoke test**:
- Sign in as a fresh free user → `/dashboard` shows streak = 0, Sharpness gauge at default 50.
- Solve today's puzzle → streak becomes 1 → confetti animation plays → explanation in the user's language renders.
- Play 1 game → return to dashboard → recent games list shows it → sharpness gauge updated.
- Visit `/history` → game appears with date, result, opponent level, sharpness.
- Sign out, sign in tomorrow (or mock the date) → streak still 1 (within window).
- Skip a day → streak resets to 0 on next activity.

**Scope** (files):
- `supabase/migrations/003_seed_puzzles.sql`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/puzzles/page.tsx`
- `app/(app)/puzzles/[puzzleId]/page.tsx`
- `app/(app)/history/page.tsx`
- `components/puzzle/PuzzleBoard.tsx`
- `components/common/{StreakBadge,SharpnessGauge}.tsx`
- Server logic for streak advancement (in the save endpoint, or a shared `lib/streak/`)

**Definition of done**: 30 puzzles loaded, streak advances and breaks correctly, dashboard + history both render with real data, and the full daily loop (puzzle + game + return) feels like a coherent product.

**Backlog**:

**Revisions**:

---

## Phase 6 — Monetization

**Goal**: A Free user can hit a paywall, complete Stripe Checkout in test mode, and become Pro with rate limits lifted. They can also cancel via the Customer Portal.

**Why this is one goal**: pricing page, paywall modal, Checkout, webhook, tier flip, portal, and the rate-limit lift are one closed loop — money in, access granted, money out. Shipping pieces in isolation lets you declare success while the loop is broken (e.g., Checkout works but the webhook doesn't update the tier).

**Automated check**:
- Stripe CLI fixture: `stripe trigger checkout.session.completed` → the webhook handler at `/api/stripe/webhook` returns 200, AND:
  - `select subscription_tier from profiles where id = '<user-id>'` returns `'pro'`.
  - `select status from subscriptions where user_id = '<user-id>'` returns `'active'`.
- A scripted check: as a Pro user, `/api/coach/analyze` allows 10 requests per hour and 429s the 11th. As a Free user, the same endpoint allows 1 per day and 429s the 2nd.
- Webhook signature verification rejects an unsigned POST with 400.
- Free-tier paywall trigger function returns `true` for: 2nd analysis of the day, 6th game of the day, 2nd puzzle of the day. Returns `false` for all of those when the user is Pro.

**Manual smoke test**:
- As a free user already at the daily limit, request a 2nd analysis → paywall modal appears with the trigger reason in copy ("You've used today's free analysis").
- Click "Upgrade to Pro $4.99/mo" → Stripe Checkout opens with the correct price.
- Use test card `4242 4242 4242 4242` + any future date + any CVC → success.
- Redirected to `/dashboard?upgraded=true` → toast confirms.
- Request a 3rd, 4th, 5th analysis → no paywall, all succeed.
- Open settings → "Manage subscription" → Stripe Customer Portal opens → cancel → return to app → status reflects `cancel_at_period_end = true`.

**Scope** (files):
- `lib/stripe/{client,products}.ts`
- `app/api/stripe/checkout/route.ts`
- `app/api/stripe/webhook/route.ts` (handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`)
- `app/api/stripe/portal/route.ts`
- `components/PaywallModal.tsx`
- `app/(marketing)/pricing/page.tsx`
- `lib/rate-limit/` (server-side limit checks against `rate_limits` table)

**Definition of done**: webhook fixture flips the tier, full Checkout flow works manually, paywall triggers only when it should, and Customer Portal cancel works end-to-end. No card data ever touches our UI.

**Backlog**:

**Revisions**:

---

## Phase 7 — Polish

**Goal**: The product is presentable to a senior Russian-speaking user — bilingual, accessible, responsive on mobile, and consistently styled.

**Why this is one goal**: i18n, a11y, and responsive are interlocking concerns. Translating without checking line wrap breaks layout; a11y without keyboard navigation breaks for screen readers; responsive without re-checking i18n breaks Russian (longer strings overflow buttons that fit English). Polish them together against the same component set.

**Automated check**:
- `npm run lint` is clean.
- A grep finds **zero** hardcoded user-facing strings in `src/app/**` and `src/components/**` outside `lib/i18n/`:
  ```bash
  rg -n --type=tsx -e '>[A-Za-zА-Яа-яЁё][^<>{]{2,}<' src/app src/components | rg -v 'aria-' | rg -v 'lucide-' | tee /tmp/i18n-leaks.txt
  test ! -s /tmp/i18n-leaks.txt
  ```
- Lighthouse accessibility score ≥ 95 on: `/`, `/dashboard`, `/play/[gameId]` (mock data), `/analysis/[gameId]` (mock data), `/pricing`.
- Manual responsive snapshots taken at 360 / 768 / 1280 px on the five pages above — no horizontal scroll, no clipped content, no overlapping text.
- All buttons have either `aria-label` or visible text; board squares are keyboard-reachable with arrow keys.

**Manual smoke test**:
- Switch language to `en` via the LanguageSwitcher → walk the full flow (signup → onboarding → play → analysis → pricing → portal) → zero untranslated strings.
- Toggle accessibility mode → font scales to 1.25× → animations slow to 600 ms → touch targets visibly larger.
- On a real phone (or DevTools 360 px iPhone preset) → play one game end-to-end without zooming.
- Tab through the dashboard with keyboard only → every interactive element reachable.
- Show the app to one person over 60 — if they can sign up, play, and see analysis without your help, polish passes.

**Scope** (files):
- `lib/i18n/{ru,en}.json` (every UI string)
- `lib/i18n/index.ts` (next-intl wiring)
- `components/common/{LanguageSwitcher,AccessibilityToggle}.tsx`
- Component touch-ups across all pages (mostly className tweaks)
- `src/middleware.ts` to drive `/ru/...` vs `/en/...` routing

**Definition of done**: i18n grep is empty, a11y ≥ 95 on all 5 pages, responsive snapshots pass, and a senior user can navigate the product unaided.

**Backlog**:

**Revisions**:

---

## Phase 8 — Ship

**Goal**: Submission-ready — production deploy live, analytics flowing, legal pages exist, README in repo, Typeform submitted.

**Why this is one goal**: shipping is one event. If PostHog isn't wired, you submit without a funnel. If `/privacy` 404s, the submission looks unfinished. If the README is missing, the form is incomplete. These tasks are tiny individually but they collectively define "the product is real."

**Automated check**:
- Vercel production build succeeds; production URL returns 200 on `/`, `/pricing`, `/privacy`, `/terms`.
- PostHog Live Events shows, within a 10-minute live test, all five critical events firing with correct properties:
  - `signup_completed` with `method`
  - `game_completed` with `game_id`, `result`, `end_reason`, `sharpness_score`, `duration_seconds`
  - `ai_analysis_completed` with `game_id`, `latency_ms`, `tokens_in`, `tokens_out`, `cost_usd`
  - `paywall_shown` with `trigger_reason`
  - `checkout_completed` with `plan`, `amount_cents`
- `sitemap.xml` and `robots.txt` reachable at the production root.
- `README.md` present at repo root, sourced from `docs/06_README_TEMPLATE.md` with project URL + GitHub URL filled in.

**Manual smoke test** (do this from an incognito window on the production domain):
- Sign up in under 30 seconds.
- Complete a full game vs Easy in under 7 minutes.
- Get an AI Coach analysis that references real moves from the game, in Russian.
- Hit the paywall naturally (request a 2nd analysis the same day).
- Complete Stripe Checkout with the test card.
- Read all UI in Russian without finding a single untranslated string.
- Submit the Typeform: `https://nfactorialschool.typeform.com/to/HYVeKeEx` with project URL + GitHub URL + README description.

**Scope** (files / actions):
- PostHog event wiring across all key UI actions + server routes (see `docs/05_METRICS.md` for the full taxonomy)
- `app/(marketing)/privacy/page.tsx`
- `app/(marketing)/terms/page.tsx`
- Cookie consent banner (PostHog opt-in)
- `app/sitemap.ts`
- `app/robots.ts`
- `<meta>` + Open Graph per page (use `@vercel/og` for OG image generation)
- `README.md` at repo root
- Final production deploy + submission

**Definition of done**: all 5 PostHog events visible in Live Events on production, legal pages reachable, README in repo, Typeform submitted with the production URL. Update CLAUDE.md "Current build phase" to "Phase 8 — Shipped (submitted YYYY-MM-DD)".

**Backlog**:

**Revisions**:

---

## When to skip a phase

You do not skip phases. If you are tempted to, the work belongs in the current phase's `Backlog:` until the current phase's DoD passes.

The only legitimate way to deliver less is to **cut scope inside a phase**, using the fallback ordering in `04_BUILD_PLAN.md → Appendix: fallback plan if you fall behind`:

1. Phase 5 first (skip puzzles and/or streak)
2. Then Phase 6 second-half (skip Customer Portal)
3. Then Phase 7 partial (skip dark mode, skip OG images)
4. **Never cut**: Phase 1 (Foundation), Phase 2 (Engine), Phase 4 (AI Coach), the Stripe Checkout half of Phase 6. Those four IS the product.
