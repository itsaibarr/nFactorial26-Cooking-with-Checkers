# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Project: Sharpki

## What this is

**Sharpki** is an AI-coached Russian draughts (шашки) web platform positioned as cognitive training for adults 45–75. After every game, an LLM coach explains in warm, plain language what the player did well and what to improve.

**The wedge**: The chess world has 6+ AI coaches (Aimchess, Chess.com Game Review, Chessalyz.ai, CircleChess, AICoachess, Lichess AI Coach). The checkers world has zero. We are the first product to bring LLM-powered coaching to checkers.

**The science**: Peer-reviewed studies (Cibeira 2024 meta-analysis, Lothian Birth Cohort 1936, CHARLS China) establish that strategic board games measurably slow cognitive decline. Our positioning is research-backed.

**Built for**: nFactorial Incubator '26 Stage-2 technical task (the "Сheckers" assignment). Submit to https://nfactorialschool.typeform.com/to/HYVeKeEx

## North-star metric

**WAU-coached** = unique weekly active users who completed ≥1 game AND received ≥1 AI Coach analysis.

This single number proves the wedge is engaging. Track it from day 1.

## Audience (3 personas)

1. **Aigul, 58, Almaty** — former engineer, worried about her mother's memory; plays shashki occasionally; uses Kaspi.
2. **Sergey, 67, retired teacher in Astana** — plays shashki with friends offline; wants to improve but no human coach available.
3. **Marina, 42, Moscow** — adult child who buys Family plan for her father; checks his weekly streak via family-account view. **The caregiver-purchase model is our growth engine.**

## Locked tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) + React 19 | RSC by default |
| Language | TypeScript strict | `strict: true`, no `any` without justification |
| Styling | Tailwind CSS | Comes with shadcn preset |
| UI components | shadcn/ui via preset `b2fA` | Nova style, Neutral palette, Lucide icons, Geist font |
| State | Zustand (client-side game state only) | React state for everything else |
| Engine | Custom TypeScript Russian shashki | In `lib/engine/`; runs in Web Worker for medium/hard bot |
| Auth + DB | Supabase (Postgres + Auth + RLS) | Free tier; ~50K MAU capacity |
| AI Coach | Fireworks Qwen3.6 Plus (`accounts/fireworks/models/qwen3p6-plus`) | $0.50/M uncached input · $0.10/M cached input · $3/M output. Behind `COACH_MODEL` env var for A/B vs Llama 3.3 70B. |
| Payments | Stripe (test mode → live) | Kaspi Pay added week 3 post-MVP |
| Email | Resend | Free tier 100 emails/day |
| Analytics | PostHog Cloud (EU region) | 1M events/mo free |
| Hosting | Vercel | Free tier sufficient for MVP |
| Internationalization | `next-intl` | Russian default, English secondary |

## Scaffold + setup

**One-shot project scaffold:**
```bash
npx shadcn@latest init --preset b2fA --template next --name sharpki
cd sharpki
```

`b2fA` bakes in: Nova style + Neutral base color + Lucide + Geist (Cyrillic supported since v1.1.0) + default radius + subtle menu accent.

**Add shadcn components needed for MVP:**
```bash
npx shadcn@latest add button card dialog input form label tabs toast skeleton \
  avatar badge dropdown-menu navigation-menu popover progress scroll-area \
  separator sheet switch tooltip alert sonner
```

**Install remaining dependencies:**
```bash
npm i @supabase/supabase-js @supabase/ssr posthog-js posthog-node stripe @stripe/stripe-js zustand next-intl zod openai resend
npm i -D vitest @vitest/ui @types/node
```

**Brand warmth override** — add to `src/app/globals.css` after init to inject honey/amber primary on the neutral base:
```css
@layer base {
  :root {
    --primary: oklch(0.74 0.14 65);
    --primary-foreground: oklch(0.18 0.02 60);
  }
  .dark {
    --primary: oklch(0.78 0.14 70);
    --primary-foreground: oklch(0.16 0.02 60);
  }
}
```

**Required env vars** — copy `.env.example` to `.env.local` and fill in. Critical entries:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `FIREWORKS_API_KEY`, `COACH_MODEL` (defaults to `accounts/fireworks/models/qwen3p6-plus`)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + 4 price IDs
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

**Secrets are server-only.** `SUPABASE_SERVICE_ROLE_KEY`, `FIREWORKS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY` must never appear in any file under `app/` that ships to the client.

## Folder structure (canonical)

```
src/
  app/
    (marketing)/                # Public pages
      page.tsx                  # Landing
      pricing/page.tsx
      privacy/page.tsx
      terms/page.tsx
    (app)/                      # Auth-gated app
      dashboard/page.tsx
      play/page.tsx
      play/[gameId]/page.tsx
      analysis/[gameId]/page.tsx
      puzzles/page.tsx
      puzzles/[puzzleId]/page.tsx
      history/page.tsx
      settings/page.tsx
      layout.tsx
    api/                        # Server routes
      coach/analyze/route.ts
      stripe/webhook/route.ts
      stripe/checkout/route.ts
      stripe/portal/route.ts
      games/save/route.ts
    layout.tsx
    globals.css
  components/
    board/                      # Board, Square, Piece
    game/                       # Controls, MoveList, ResultModal
    coach/                      # AnalysisCard, ExplanationBubble
    puzzle/                     # PuzzleBoard
    common/                     # Header, Footer, AccessibilityToggle, LanguageSwitcher, StreakBadge, SharpnessGauge
    ui/                         # shadcn components
  lib/
    engine/                     # Russian shashki engine (board, moves, eval, search, types) + engine.test.ts
    supabase/                   # client.ts, server.ts, middleware.ts
    stripe/                     # client.ts, products.ts
    posthog/                    # server.ts, client.ts
    coach/                      # llm.ts (abstraction), prompt.ts, types.ts, critical_moments.ts
    sharpness/                  # compute.ts
    i18n/                       # ru.json, en.json, index.ts
    utils.ts
  workers/
    engine.worker.ts            # Web Worker for medium/hard AI bot
  middleware.ts                 # Auth + i18n routing
supabase/
  migrations/
    001_initial.sql
    002_rls.sql
    003_seed_puzzles.sql
public/
```

## Russian shashki rule invariants

The engine MUST honor these 6 rules. Bugs here destroy trust. Write tests first.

1. **Mandatory captures**: if any capture is available, a non-capturing move is illegal.
2. **Men capture forward AND backward** (not just forward as in English checkers).
3. **Flying kings**: kings move any number of squares diagonally in any direction; capture by jumping over an opponent piece and landing on any empty square beyond.
4. **Mid-sequence promotion**: if a man lands on the back rank during a capture chain, it becomes a king AND must continue capturing as a king if a king-capture is available.
5. **Choice among captures**: when multiple capture sequences exist, the player picks one (Russian rule — does NOT force max-capture like international rules).
6. **Draws**: 3-fold repetition; 25 successive king-only moves with no captures; 3 kings vs 1 king if no win in 16 moves.

Engine lives in `lib/engine/`. Public API: `lib/engine/engine.ts` exports `{ newGame, applyMove, getLegalMoves, getBestMove, evaluatePosition }`. **Engine outputs MUST be immutable.**

## AI Coach contract

- **Model**: `accounts/fireworks/models/qwen3p6-plus` (configurable via `COACH_MODEL` env var)
- **Endpoint**: `https://api.fireworks.ai/inference/v1` via the `openai` package (Fireworks is OpenAI-compatible)
- **Abstraction layer**: All LLM calls go through `lib/coach/llm.ts` exposing `getCoachAnalysis(game, lang) → Analysis`. Never hardcode model paths in business logic.
- **Prompt caching required**: System prompt MUST be byte-stable across calls and placed first. Dynamic content (game data, user level, language) goes entirely in the `user` message. Unlocks Fireworks' $0.10/M cached input rate.

**Pipeline**:
1. Replay game through engine, capture per-move eval scores
2. Identify up to 5 critical moments (eval swing ≥ 1.5 pieces)
3. Build prompt with engine ground truth for each critical moment
4. Call Fireworks with `response_format: { type: "json_object" }`, temperature 0.6, max_tokens 800
5. Validate output with Zod against the Analysis schema
6. Persist to `game_analyses` table; cache by (game_id, language) for 7 days
7. On parse failure: retry once, then return engine-only fallback

**JSON schema** (full version in `docs/02_PRD.md` Appendix A):
```ts
{
  overall_quality: "excellent" | "good" | "developing" | "tough_game",
  sharpness_score_for_this_game: number,        // 0-100
  highlights: Array<{
    move_number: number,
    type: "best_move" | "good_idea" | "missed_tactic" | "blunder",
    what_you_did: string,                       // 1-2 sentences in user's language
    what_to_consider: string,                   // 1-2 sentences in user's language
  }>,
  key_lesson: string,                           // 1-2 sentence theme
  encouragement: string,                        // 1 specific positive note
}
```

- **Cost target**: ≤$0.005 per analysis (currently ~$0.0026 with caching enabled).
- **Rate limits**: Free = 1 analysis/day. Pro = 10/hour. Enforce server-side via `rate_limits` table.

## Database schema overview

Full SQL in `docs/04_BUILD_PLAN.md` Appendix.

| Table | Purpose | RLS |
|---|---|---|
| `profiles` | User metadata, settings, current_sharpness, streak, subscription_tier | Own row only |
| `games` | Per-game record: moves, result, opponent_level, sharpness_score | Own rows only |
| `game_analyses` | LLM output per game, cached by (game_id, language) | Own rows only |
| `puzzles` | Curated puzzle library | World-readable |
| `puzzle_attempts` | User × puzzle results | Own rows only |
| `subscriptions` | Stripe sync | Own rows only (read), webhook only (write) |
| `rate_limits` | Server-side rate limit counters | Own rows only |

**RLS on every table. No exceptions.** Reads and writes gated by `auth.uid()`. The trigger `handle_new_user` creates a `profiles` row on `auth.users` insert.

## Coding conventions (Sharpki-specific)

These layer on top of the universal behavioral guidelines above.

- **TypeScript strict mode** — `strict: true` in tsconfig.
- **React Server Components by default** — only `"use client"` if the component needs state, effects, or browser APIs.
- **No `any`** without an inline comment justifying it.
- **Server-only secrets** — never imported in client code paths. Use server route handlers for any LLM/Stripe/Supabase-admin calls.
- **RLS on every Supabase table.** Both reads and writes must be gated by `auth.uid()`.
- **Zod-validate every untrusted input** — including all LLM outputs and Stripe webhooks.
- **i18n strings live in JSON** — never inline UI text. Use `lib/i18n/ru.json` and `lib/i18n/en.json` via `next-intl`.
- **Engine outputs are immutable** — `applyMove(board, move)` returns a new board; never mutate.
- **No `console.log` in production paths** — use `posthog.capture` for analytics, a server logger for errors.
- **Russian first** — UI defaults to Russian, AI Coach output in user's language. English is secondary.
- **Senior-friendly default** — accessibility toggle for 1.25× fonts, WCAG-AA contrast, 600ms animations, 56px touch targets. Test on someone over 60 before shipping.
- **PostHog events fire from client OR server** — never both for the same event. Use the server SDK for webhook-driven events.

## Commands

After Day 1, these should work. Add new commands here as the project grows.

```bash
# Dev
npm install
npm run dev                       # localhost:3000

# Quality gates
npm run typecheck                 # tsc --noEmit
npm run lint                      # next lint
npm run test                      # vitest run
npm run test:engine               # vitest run lib/engine
npm run build                     # production build

# Supabase
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push              # apply migrations
npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts

# Stripe
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed

# Deploy
git push origin main              # Vercel auto-deploys; preview deploys on PRs
```

## Definition of done

### Per feature

A feature is "done" when:
1. It works as specified in the PRD user story.
2. It has at least 1 happy-path manual test recorded.
3. RLS policies allow only the correct access (verified with a second account).
4. Relevant PostHog events fire correctly (verified in PostHog Live Events).
5. It works on 360px mobile AND on desktop (1280px).
6. It works in accessibility mode (large fonts, high contrast).
7. Both `ru` and `en` UI strings are present.
8. Lint and typecheck pass.

### For MVP / submission

The MVP is done and submittable when:
1. All M1–M15 user stories in `docs/02_PRD.md` Section 3 work end-to-end on production.
2. Stripe Checkout completes in test mode and the user becomes Pro.
3. AI Coach returns a meaningful, game-specific analysis in BOTH RU and EN.
4. PostHog dashboard "North Star + Funnels" shows real events.
5. Privacy + Terms pages exist.
6. `README.md` from `docs/06_README_TEMPLATE.md` is in the repo root.
7. Production URL is live on the chosen domain.
8. The Typeform is submitted with project URL + GitHub URL + README description.

## Non-goals (frozen MVP cuts)

These DO NOT ship in week 1. When tempted, ask: *"does this contribute to free→paid conversion OR D7 retention this week?"* If no, defer.

- ❌ Real-time multiplayer (cut due to timeline risk; week 4 candidate)
- ❌ Kaspi Pay (Stripe only; Kaspi added week 3)
- ❌ Variants other than Russian shashki (no English, no International 10×10)
- ❌ Native iOS/Android apps (PWA-responsive web only)
- ❌ Tournaments, clubs, chat, friends, social graph
- ❌ In-app cosmetics/skins marketplace
- ❌ Family plan checkout flow (UI on landing page only; checkout post-MVP)
- ❌ Multi-player local hot-seat (AI is the differentiator)
- ❌ Hint-during-play feature (Pro feature deferred)

## PostHog event taxonomy (critical events)

Full taxonomy in `docs/05_METRICS.md`. The 5 events that MUST be wired correctly from day 1, because they power the funnel dashboards:

1. `signup_completed` — auth succeeds for first time. Property: `method`.
2. `game_completed` — game ends. Properties: `game_id`, `result`, `end_reason`, `sharpness_score`, `duration_seconds`.
3. `ai_analysis_completed` — server returns analysis. Properties: `game_id`, `latency_ms`, `tokens_in`, `tokens_out`, `cost_usd`.
4. `paywall_shown` — modal opens. Property: `trigger_reason`.
5. `checkout_completed` — Stripe webhook fires success. Properties: `plan`, `amount_cents`.

Identify users on auth with `posthog.identify(user.id, {...})` so anonymous LP visits merge into the user timeline.

## Documents index (read these for depth)

| File | Purpose |
|---|---|
| `docs/00_INDEX.md` | Reading order and 1-line summary |
| `docs/01_IDEA.md` | Idea, naming, persona, peer-reviewed science, wedge |
| `docs/02_PRD.md` | User stories, architecture, AI Coach prompt, decision log |
| `docs/03_BUSINESS_PLAN.md` | Market, GTM, week-by-week financial path to $1k MRR |
| `docs/07_PHASES.md` | **Canonical execution plan — 8 phases, one trackable goal each. Follow this during the build.** |
| `docs/04_BUILD_PLAN.md` | Tactical reference: SQL schema, engine implementation notes, fallback ordering |
| `docs/05_METRICS.md` | PostHog taxonomy + funnels + dashboards |
| `docs/06_README_TEMPLATE.md` | The README to paste into the repo before submission |

## Decision log (rolling — terse; deep rationale in `docs/02_PRD.md` Appendix B)

- **2026-05-17**: Audience locked to brain-training for adults 45–75 (cognitive-wellness, caregiver-purchase model). Rejected: kids, Gen Z.
- **2026-05-17**: MVP scope frozen to "Great" rubric level. NO realtime multiplayer, NO Kaspi, Stripe only, 1-week build.
- **2026-05-17**: Variant = Russian shashki ONLY. No English checkers, no International 10×10 in MVP.
- **2026-05-17**: AI Coach model = Fireworks **Qwen3.6 Plus** (`accounts/fireworks/models/qwen3p6-plus`). Reason: best Russian-language quality for our target audience; cost parity with Llama 3.3 70B once prompt caching is enabled. Hot-swap to Llama via `COACH_MODEL` env var.
- **2026-05-17**: UI scaffolded via shadcn preset **`b2fA`** (Nova style, Neutral palette, Lucide, Geist). One warm primary color override (honey/amber via `--primary` CSS var) on top of the neutral base to convey care.
- **2026-05-17**: CLAUDE.md is the single source of truth for project context. AGENTS.md slimmed to a pointer for OpenAI Codex / generic-agent discoverability.

## Working principles specific to Sharpki

These layer on top of the universal behavioral guidelines above.

- **Frozen MVP scope is sacred.** Anything not in `docs/02_PRD.md` Section 3 "Must-have" does not ship in week 1.
- **Engine correctness > everything else.** The Russian shashki rules are subtle. Bugs here destroy trust. Write tests first.
- **AI Coach must say specific things.** Every analysis must reference the actual game's moves. Generic output kills the product. Always feed engine ground truth into the LLM prompt.
- **Senior-friendly is the default**, not an afterthought. Large enough touch targets, clean copy, no flashy noise. Test on someone over 60.
- **Russian first.** UI defaults to Russian. AI Coach output in the user's language. English is secondary.
- **Ship the wedge first.** The 4 things that prove the product exists: auth + Russian shashki engine + AI Coach + Stripe paywall. Never cut these.

## Current build phase

**Phase 1 — Foundation (in progress). Automated checks are green; live OAuth + RLS smoke tests still need to run before moving to Phase 2.**

Execute against `docs/07_PHASES.md`. The work is sliced into **8 sequential phases, one trackable goal per phase**, verified by both an automated check and a manual smoke test. Do not start phase N+1 until phase N's Definition of Done passes.

| # | Phase | Status |
|---|---|---|
| 0 | Pre-flight (accounts + secrets) | partial |
| 1 | Foundation (scaffold + DB + auth) | **in progress** |
| 2 | Engine | not started |
| 3 | Gameplay loop | not started |
| 4 | AI Coach | not started |
| 5 | Engagement loop | not started |
| 6 | Monetization | not started |
| 7 | Polish | not started |
| 8 | Ship | not started |

**Pre-flight checklist (do this before Phase 1):**
- Open accounts: Supabase, Fireworks, Stripe (test mode), PostHog, Vercel, Google Cloud (OAuth), Resend
- Register domain (Sharpki.app or chosen alternative)
- Lock final product name
- Fill `.env.local` from `.env.example`

**Phase 1 starts with:**
```bash
npx shadcn@latest init --preset b2fA --template next --name sharpki
```

See `docs/07_PHASES.md → Phase 1 — Foundation` for the full scope, automated check, manual smoke test, and Definition of Done. Update this section after each phase completes.
