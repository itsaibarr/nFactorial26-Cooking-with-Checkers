# Sharpki

AI-coached Russian draughts for sharper minds.

Live: https://sharpki.online  
nFactorial Incubator '26, Checkers task. 

---

## The short version

You play Russian draughts against an AI. After the game, an LLM coach tells you what you did well and what to work on, in plain language. Chess has 6+ products that do this (Aimchess, Chess.com Game Review, Chessalyz.ai, CircleChess, AICoachess, Lichess AI Coach 2.0). Checkers has none. This is the first one.

The brain training market is $4.5B heading toward $25B by 2031. Russian draughts is a folk game that 200M+ Russian speakers already know. Nobody has put those two things together.

---

## Why this might work

Three peer-reviewed studies say strategic board games slow cognitive decline in older adults: Cibeira 2024 meta-analysis (p=0.003), Lothian Birth Cohort 1936 (1,091 people tracked over 68 years), and CHARLS China (n=19,816). These are on the landing page with the actual p-values, not dressed up as marketing fluff.

The existing checkers apps (Lidraughts, Draughts.io, Checkers Online Elite, the various Shashki Android apps) all do the same thing: play vs AI, see win/loss. No coaching, no explanation layer, no wellness angle. They're play surfaces, not learning products.

---

## What's built

The numbers: 136 source files, 16,831 lines of TypeScript, 162 tests passing, 21 routes live, 6 database migrations, 95 commits. Build is green.

### Engine

I wrote the Russian shashki engine from scratch (1,781 lines). It covers the full rule set: mandatory captures, men capturing forward and backward, flying kings, mid-sequence promotion (a man that hits the back rank mid-chain becomes a king and keeps capturing if a king capture exists), and the Russian rule where you pick your capture sequence instead of being forced into the longest one. Draw detection handles 3-fold repetition and the 25-move no-capture king rule.

86 unit tests cover the edge cases. The engine is immutable: `applyMove()` returns a new board, it never mutates the input.

### AI bot

Three difficulty levels. Easy picks a random legal move. Medium and Hard use minimax with alpha-beta pruning, quiescence search, and iterative deepening. The eval function weighs material, kings at 3x, back-rank control, center occupation, and mobility. The bot runs in a Web Worker so the UI stays responsive. If the worker crashes, it falls back to computing on the main thread.

### AI Coach

This is the whole point of the product. After a game, the server route replays every move through the engine and records the eval score at each position. When the eval swings by 1.5 pieces or more, that's flagged as a "critical moment." Those moments, along with the engine's ground truth about what the best move was, get fed into the LLM prompt. The model (Fireworks Qwen3.6 Plus) then writes coaching commentary in Russian or English depending on the user's preference.

I chose Qwen3.6 Plus because it's trained on ~119 languages and produces noticeably better Russian output than the alternatives. The prompt is structured so the system prompt is byte-stable across calls (this activates Fireworks' prompt caching, bringing input cost down to $0.10/M tokens). Dynamic content goes entirely in the user message. A full game analysis costs about $0.0026.

The LLM output is validated against a Zod schema (`CoachAnalysis`: overall quality, sharpness score, up to 5 highlights with move number and type, a key lesson, and an encouragement line). If parsing fails, it retries once. If it fails again, the user gets an engine-only fallback with no natural language. Results are cached by game ID and language for 7 days.

The tricky part was hallucination. Without engine grounding, the LLM would invent moves, miscount pieces, and describe positions that never existed. Feeding the engine's eval at each critical move into the prompt fixed this. Now the model translates engine truth into coaching language instead of making things up.

### Sharpness Score

A 0-100 composite of accuracy, decision speed, blunder rate, and how often the player's move matched the engine's top 3. Blunders that cause big eval swings get penalized harder. The dashboard shows a 7-day trend and a breakdown view ("Why 78?") with bars for accuracy, speed, and tactics.

### Puzzles, streaks, heatmap

Daily tactical puzzle, rotated by calendar day, seeded from a curated set in the database. One per day on the free tier, unlimited on Pro.

Streak system: one game or one puzzle per day keeps the streak alive. Pro users get one streak freeze per month.

The dashboard has a 6-month activity heatmap (yes, inspired by GitHub's contribution graph) with fit-to-width layout and positioned tooltips.

### Stripe

Pro Monthly at $4.99/mo, Pro Yearly at $39.99/yr (33% off), Family at $9.99/mo (listed but not yet available). Checkout, customer portal for managing subscriptions, and a webhook handler for the three relevant events. A paywall modal gates AI analysis and puzzles on the free tier.

Rate limiting is done server-side via a Supabase RPC called `reserve_rate_limit` that atomically checks and increments in one transaction. If the downstream LLM call fails after a slot is reserved, the slot gets released. A naive read-then-increment approach would race under concurrent requests; this doesn't.

### Auth

Supabase Auth with Google OAuth and email magic link. A database trigger (`handle_new_user`) auto-creates a profile row on signup. Row-Level Security is on every table. I verified this with a second test account: it cannot read the first account's data.

### i18n

Full Russian and English UI strings in separate JSON files. Cookie-based locale resolution via `next-intl`. A language toggle on every page. The AI Coach responds in the user's selected language.

### Accessibility

A toggle that scales fonts to 1.25x, enforces WCAG-AA contrast, slows animations, and increases touch targets to 56px. The default mode looks like a normal modern web app. The point was to make it accessible without making it look like it was designed for "old people," because that's patronizing and also bad for word-of-mouth. Dark/light theme via `next-themes`.

### Analytics

PostHog on the EU cloud. About 30 events tracked (`lp_viewed`, `signup_completed`, `game_started`, `game_completed`, `ai_analysis_requested`, `paywall_shown`, `checkout_started`, `checkout_completed`, etc.) with 4 pre-configured funnels: signup, activation, monetization, retention. Server-side events fire for webhook-driven stuff (Stripe) separately from client events so nothing gets double-counted.

### Routes

| Route | What it does |
|---|---|
| `/` | Landing page |
| `/quote` | Science citations |
| `/pricing` | Plans + Stripe checkout |
| `/dashboard` | Sharpness gauge, streak, heatmap, recent games |
| `/play` | New game form |
| `/play/[gameId]` | Live game (client component) |
| `/analysis/[gameId]` | AI Coach results |
| `/puzzles` | Puzzle picker |
| `/puzzles/[puzzleId]` | Puzzle board (client component) |
| `/history` | Past games |
| `/settings` | Language, accessibility, theme, preferences, subscription |
| `/api/coach/analyze` | Coach analysis (rate-limited) |
| `/api/games/save` | Save game result |
| `/api/profile/preferences` | Update preferences |
| `/api/puzzles/attempt` | Record puzzle attempt (rate-limited) |
| `/api/stripe/checkout` | Create Checkout session |
| `/api/stripe/portal` | Create Portal session |
| `/api/stripe/webhook` | Stripe webhook handler |
| `/auth/callback` | OAuth callback |

---

## Architecture

```
Next.js 16 (App Router, RSC + Turbopack)
  ├─ (marketing) — Landing, Pricing, Quote — server-rendered
  ├─ (app) — Dashboard, Play, Analysis, Puzzles, History, Settings
  │   RSC shells with client islands for interactive parts
  └─ api/ — Coach, Games, Stripe, Puzzles, Profile routes

Engine (TypeScript, 1,781 lines)
  ├─ board.ts — immutable board state, coordinate mapping
  ├─ moves.ts — legal move generation, capture chains, promotion
  ├─ eval.ts — position evaluation (material + kings + position)
  ├─ search.ts — minimax + alpha-beta + quiescence + iterative deepening
  └─ engine.ts — public API: newGame, applyMove, getLegalMoves,
                getBestMove, evaluatePosition

AI Coach pipeline (server route)
  ├─ Replay game through engine → per-move eval scores
  ├─ critical_moments.ts → flag eval swings >= 1.5
  ├─ prompt.ts → build RU/EN prompt with engine ground truth
  ├─ llm.ts → Fireworks Qwen3.6 Plus (JSON mode, temp 0.6)
  ├─ Zod validation → retry on parse fail → engine fallback
  └─ cache.ts → persist by (game_id, language), 7-day TTL

Web Worker (engine.worker.ts) — bot computation off main thread

Supabase (Postgres + Auth + RLS)
  ├─ 7 tables: profiles, games, game_analyses, puzzles,
  │           puzzle_attempts, subscriptions, rate_limits
  ├─ RLS on every table (auth.uid() gating)
  ├─ RPC: reserve_rate_limit (atomic slot reservation)
  └─ Trigger: handle_new_user (auto-create profile on signup)

Stripe (Checkout + Portal + Webhooks)
PostHog (EU cloud, 30+ events, 4 funnels)
Vercel (deploy, preview per PR)
```

---

## What was hard

**Engine edge cases.** Mid-sequence promotion is the nastiest one. A man lands on the back rank during a capture chain, becomes a king, and must continue capturing as a king, but only if a king capture exists from that new position. Combine that with flying kings and the player-choice rule for capture sequences, and there are a lot of positions where the correct legal move set is non-obvious. I wrote 86 tests against known-correct positions, each testing one rule in isolation.

**Coach hallucination.** Without engine grounding, the LLM invented moves and described positions that never happened. The fix was straightforward but took a while to land on: feed the engine's eval at each critical move into the prompt, so the model is translating engine output rather than generating from scratch. The `critical_moments.ts` pipeline is the bridge between deterministic engine numbers and natural language.

**Accessibility without stigma.** The toggle scales fonts, spacing, animation timing, and touch targets. But the default mode has to look like a normal web app. If it looks like it was designed for seniors, seniors won't share it. This meant CSS variable layering and per-component responsive adjustments rather than a blanket page zoom.

**Atomic rate limiting.** Read-then-increment races under concurrent requests. I wrote a Supabase RPC (`reserve_rate_limit`) that checks and increments in one transaction, and releases the slot if the downstream LLM call fails.

**Scope discipline in 7 days.** No realtime multiplayer, no Kaspi, one variant, no native apps. Every feature traces to a PRD user story. The 8-phase plan had binary done/not-done gates per phase. That's what kept scope creep from killing the timeline.

---

## Docs

7 planning documents in `docs/`, totaling about 8,000 lines:

| File | What's in it |
|---|---|
| `00_INDEX.md` | Navigation, two-line summary, decisions made |
| `01_IDEA.md` | Concept, naming, science, personas, wedge |
| `02_PRD.md` | 23 user stories (MoSCoW), functional requirements, AI Coach prompt spec |
| `03_BUSINESS_PLAN.md` | Market sizing, competitive map, pricing, GTM, 12-month financials |
| `04_BUILD_PLAN.md` | SQL schema, engine notes, tactical reference |
| `05_METRICS.md` | North-star metric, 4 funnels, PostHog event taxonomy |
| `07_PHASES.md` | 8-phase execution plan with done/not-done gates |

---

## Business

Brain-training apps: $4.5B, growing to $25B by 2031 at 24% CAGR. Russian-speaking internet-using adults 45+: ~63M. Of those, maybe 5M would consider paying for a digital wellness product.

Each AI analysis costs me ~$0.0026. A Pro subscription is $4.99/mo. That's roughly 95% gross margin. Infrastructure break-even should hit around month 3.

Free tier: 1 AI analysis/day, 1 puzzle/day. Pro ($4.99/mo or $39.99/yr): unlimited. Family ($9.99/mo, not yet shipping): for adult children buying for parents. The caregiver-purchase model is the growth engine, same pattern ChessKid used for kids but applied to seniors.

Go-to-market: personal network and Russian-speaking Telegram/VK/Instagram communities first. Kaspi Pay gets added in week 3 for Kazakhstan (85%+ of Kazakh adults use Kaspi). A B2B pilot with an Almaty senior center is the target for week 8.

12-month targets: 10K registered, 300 paying, ~$1,500 MRR. nFactorial's $1,000 MRR milestone by month 6.

---

## Roadmap

| When | What |
|---|---|
| Week 2 | Kaspi Pay via ApiPay.kz |
| Week 2 | D1/D3/D7 email nudges |
| Week 3 | Family plan checkout |
| Week 4 | Realtime multiplayer via Supabase Realtime |
| Week 5 | International draughts (10x10) |
| Week 6 | PWA + push notifications |
| Week 8 | B2B pilot, Almaty senior center |
| Week 12 | Caregiver cognitive-health PDF report |

---

## Run locally

```bash
git clone https://github.com/<your-handle>/sharpki.git
cd sharpki
cp .env.example .env.local    # fill in keys
npm install
npx supabase db push           # apply 6 migrations
npm run dev                     # localhost:3000
```

Quality gates:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm run test         # vitest run (162 tests)
npm run test:engine  # engine tests (86)
npm run build        # production build
```

Env vars you need (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `FIREWORKS_API_KEY`, `COACH_MODEL` (defaults to qwen3p6-plus)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + 2 price IDs
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

---

## Stack choices

| What | Why I picked it |
|---|---|
| Next.js 16 + App Router | RSC for fast marketing pages, server actions for auth, Turbopack for builds |
| Supabase | Postgres + Auth + RLS in one service. No separate backend needed for MVP. Free tier handles ~50K MAU |
| Fireworks Qwen3.6 Plus | Strong Russian output, $0.10/M cached input. Behind `COACH_MODEL` env var so I can A/B without code changes |
| Web Worker for bot | Keeps the UI thread free, zero server cost, deterministic and testable |
| Stripe | Ships now for international. Kaspi comes later for KZ |
| PostHog | 1M events/mo free, good funnels, EU cloud for CIS users |
| shadcn/ui (preset b2fA) | Nova style, Neutral palette, Lucide icons, Geist font with Cyrillic support |
| Zustand | Game session state only. Minimal boilerplate |

---

## License

Source available for nFactorial Incubator '26 judging. License TBD post-incubation.

---

## На русском

Sharpki, веб-платформа для игры в русские шашки против ИИ с тренером-наставником. После каждой партии ИИ анализирует игру на основе движка и объясняет простым языком, что получилось, а где можно сыграть лучше. 10 минут в день как тренировка мозга для взрослых 45-75.

В шахматах 6+ ИИ-тренеров. В шашках ни одного. Мы первые. Наука за этим стоит реально: мета-анализ Cibeira 2024 (p=0.003), лонгитюд Lothian Birth Cohort 1936 (1,091 человек, 68 лет наблюдения), CHARLS Китай (n=19,816). Стратегические настольные игры замедляют когнитивное старение.

Что построено: движок русских шашек с нуля (86 тестов), ИИ-бот трёх уровней (Web Worker), тренер на Qwen3.6 Plus (~$0.0026 за анализ), Sharpness Score 0-100, ежедневные задачи, стрики, Stripe-монетизация ($4.99/мес Pro), двуязычный интерфейс (RU + EN), режим доступности для пожилых, PostHog-аналитика. 16,831 строк кода, 162 теста, 21 маршрут. Собрано за 7 дней одним человеком.

