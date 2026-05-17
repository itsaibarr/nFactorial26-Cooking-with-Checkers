# README template (paste into project root as README.md before submission)

> Per the nFactorial task, the README should describe: **what you built, for whom, and why it's valuable**. Keep it concise, English + Russian sections, with one strong screenshot at the top.

---

## Below this line is the actual README content to copy.

---

# Sharpki — AI-coached Russian draughts for sharper minds

**Live demo:** https://sharpki.app  
**Submission:** nFactorial Incubator '26 — Сheckers technical task

[![Sharpki hero screenshot](./public/og-image.png)](https://sharpki.app)

---

## What I built

**Sharpki** is a web platform for playing Russian draughts (шашки) against an AI, where after every game an **LLM-powered coach** explains in warm, plain language what you did well and what to improve. It's positioned as a daily 10-minute cognitive workout for adults 45–75.

Stack: **Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase + Fireworks AI (Qwen3.6 Plus) + Stripe + PostHog + Vercel**.

Key features in MVP:

- 🎯 **Full Russian shashki engine** (8×8, flying kings, mandatory captures, mid-sequence promotion, 25-move and 3-fold draw rules) — implemented from scratch in TypeScript with 100+ unit tests
- 🤖 **3-level AI bot** (Easy/Medium/Hard) using minimax + alpha-beta with iterative deepening, runs in a Web Worker
- 🧠 **AI Coach**: post-game analysis via Fireworks Qwen3.6 Plus (Alibaba's flagship multilingual model, trained on ~119 languages for strong Russian-language output quality). The pipeline: engine identifies critical moments by eval-swing, LLM translates engine output into warm coaching language (RU/EN), output is structured JSON validated by Zod, cached per game. Prompt caching keeps marginal cost ~$0.0026 per analysis
- 📈 **Sharpness Score** — composite 0–100 cognitive metric tracking accuracy, decision speed, and blunder rate; visualized as a 7-day trend
- 🎲 **Daily tactical puzzle** with personalized difficulty
- 🔥 **Streak system** with one streak-freeze per month for Pro users (habit anchor)
- 💳 **Stripe Checkout** ($4.99/mo Pro, $39.99/yr Pro, $9.99/mo Family — caregiver model)
- ♿ **Senior-friendly accessibility mode** — 1.25× fonts, WCAG-AA contrast pairs, slower animations, larger touch targets
- 🌐 **Bilingual UI**: Russian (default) and English
- 📊 **PostHog analytics** with full event taxonomy and pre-configured funnels

---

## Who it's for

Three personas (in priority order):

1. **Aigul, 58, Almaty** — wants to keep her mind sharp and feels Lumosity is gimmicky. Played shashki as a child. Pays 2,500 KZT/month for something she can feel working.
2. **Sergey, 67, retired teacher in Astana** — plays shashki with friends offline, loses to younger players online and doesn't know why. Wants a patient teacher.
3. **Marina, 42, Moscow** — buys a yearly subscription for her father (72), checks his weekly streak via family-account view. Caregiver-purchase model.

---

## Why it's valuable

### The hard truth
Chess has 6+ LLM-powered AI coaches (Aimchess, Chess.com Game Review, Chessalyz.ai, CircleChess, AICoachess, Lichess AI Coach 2.0). **The checkers/draughts world has zero**. Every existing checkers product (Lidraughts, Draughts.io, Checkers Online Elite, Shashki Android apps) is "play vs AI, see win/loss" with no learning layer.

### The opportunity
The brain-training app market is **$4.5B → $25.2B by 2031 (CAGR 24%)**, fueled by aging populations and dementia anxiety. Russian draughts is a culturally embedded folk game for ~200M+ Russian speakers. Kazakhstan has 19.5M internet users (93.4% penetration) and 13M+ Kaspi Pay users (85%+ adults), creating a domestic monetization moat.

### The science backing
Multiple peer-reviewed studies establish that strategic board games measurably slow cognitive decline:
- **Cibeira et al., 2024 meta-analysis** (Journal of Alzheimer's Disease): traditional board games significantly improve Montreal Cognitive Assessment (p=0.003) and Mini-Mental State (p=0.02); chess specifically improved quality of life (p<0.00001).
- **Altschul & Deary, Lothian Birth Cohort 1936** (68-year longitudinal, n=1,091): higher frequency of analog game playing = less cognitive decline ages 70–79.
- **CHARLS China study** (n=19,816 adults 45+): significant association between board games and cognitive function with dose-response.
- **COGniChESs (2025)**: 12 weekly chess/Go sessions reduced depression in women (p=0.013).

### The wedge
We're the first product to combine these three things into one experience:
1. **AI coach that explains every move** (no checkers competitor has this)
2. **Cognitive-wellness positioning** with peer-reviewed credibility
3. **Caregiver-purchase amplification** (adult children buying for parents — proven by ChessKid for kids; we apply it to seniors)

Marginal cost per AI-coached game: ~$0.0026 (Fireworks Qwen3.6 Plus with prompt caching enabled). 95% gross margin product.

---

## Architecture highlights

```
┌────────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router, RSC)                                  │
│   ├─ Landing + auth flow (Supabase Google + Email magic link)  │
│   ├─ Onboarding → Dashboard (RSC)                              │
│   ├─ Game UI (client; engine in Web Worker)                    │
│   └─ Analysis viewer (RSC; data from server-side LLM call)     │
├────────────────────────────────────────────────────────────────┤
│  Engine (TypeScript)                                           │
│   ├─ Russian shashki rules (men/king move gen, capture chains, │
│   │   mid-sequence promotion, 25-move and 3-fold draw rules)   │
│   ├─ Minimax + alpha-beta + quiescence + iterative deepening   │
│   ├─ Eval: material + kings (×3) + back-rank + center + mobility│
│   └─ 100+ unit tests covering rule edge cases                  │
├────────────────────────────────────────────────────────────────┤
│  AI Coach pipeline (server route)                              │
│   ├─ Replay game through engine, capture per-move eval         │
│   ├─ Identify critical moments (eval swing ≥ 1.5)              │
│   ├─ Build prompt (RU/EN, user level, engine ground truth)     │
│   ├─ Fireworks Qwen3.6 Plus (JSON mode, temp 0.6, cached sys)  │
│   ├─ Zod validation, retry on parse fail                       │
│   └─ Cache by (game_id, language)                              │
├────────────────────────────────────────────────────────────────┤
│  Supabase (Postgres + Auth + RLS)                              │
│   ├─ profiles, games, game_analyses, puzzles, puzzle_attempts, │
│   │   subscriptions, rate_limits                               │
│   └─ Row-level security on every table                         │
├────────────────────────────────────────────────────────────────┤
│  Stripe (Checkout + Customer Portal + Webhooks)                │
│  PostHog (every meaningful event + 4 pre-built funnels)        │
│  Vercel (deploy; preview per PR)                               │
└────────────────────────────────────────────────────────────────┘
```

---

## What was hard

1. **Russian shashki rule edge cases** — mid-sequence promotion + choice among capture sequences + flying kings combine in subtle ways. Solved with ~100 unit tests using known correct positions.
2. **AI Coach quality** — pure LLM outputs without grounding hallucinated checkers concepts. Fixed by feeding the engine's eval at each critical move into the prompt, forcing the LLM to translate engine truth instead of inventing it.
3. **Senior-friendly UX inside a polished modern look** — accessibility-mode toggle that scales fonts/spacing/timing without making the app feel "for old people" by default.
4. **1-week timeline** — ruthless scope cuts: no realtime multiplayer, no Kaspi yet, single variant (Russian only), no native apps.

---

## What's next (roadmap, ranked)

| When | What |
|---|---|
| Week 2 | Kaspi Pay (via ApiPay.kz) for KZ market |
| Week 2 | Email lifecycle: D1/D3/D7 nudges |
| Week 3 | Family plan checkout flow |
| Week 4 | Realtime multiplayer (friend invite link) via Supabase Realtime |
| Week 5 | International draughts (10×10) variant |
| Week 6 | PWA polish + push notifications |
| Week 8 | First B2B pilot with an Almaty senior center |
| Week 12 | Caregiver cognitive-health PDF report |

---

## Run locally

```bash
git clone https://github.com/<your-handle>/sharpki.git
cd sharpki
cp .env.example .env.local           # fill in keys (see below)
npm install
npx supabase db push                  # apply migrations to your Supabase project
npm run dev
```

To reproduce the initial scaffold from scratch:
```bash
npx shadcn@latest init --preset b2fA --template next --name sharpki
# b2fA = Nova style + Neutral palette + Lucide + Geist
```

Required env vars (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `FIREWORKS_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

---

## Stack rationale

- **Next.js 15 + App Router** — RSC keeps the marketing pages fast and the dashboard streamable; server actions simplify the auth flows.
- **Supabase** — Postgres + Auth + RLS in one. Eliminates the need for a separate backend service in MVP. Free tier sufficient until ~50K MAU.
- **Fireworks AI + Qwen3.6 Plus** — Alibaba's flagship closed model, exclusive to Fireworks outside Alibaba's own cloud. Released April 2026. $0.50/M uncached input · $0.10/M cached input · $3.00/M output. Trained on ~119 languages with strong multilingual emphasis — critical for warm, idiomatic Russian-language coaching for our senior audience. Behind a `COACH_MODEL` env var so we can A/B against Llama 3.3 70B without code changes.
- **Web Worker engine** — keeps the AI bot off the main thread and zero-server-cost; also makes the engine deterministic and testable in isolation.
- **Stripe** — global default; Kaspi added in week 2 for KZ market via ApiPay.kz.
- **PostHog** — generous free tier (1M events/mo), self-hostable later, great funnels.

---

## License

Source available for nFactorial Incubator '26 judging. License TBD post-incubation.

---

## Acknowledgements

- nFactorial team for the task design
- The Russian shashki community for centuries of strategic depth
- Authors of the Lothian Birth Cohort, CHARLS, and 2024 board-games meta-analysis for the science I get to cite
- Fireworks AI for affordable inference

---

## RU description (short, optional)

**Sharpki** — это веб-платформа для игры в русские шашки против AI с **тренером-наставником**. После каждой партии ИИ-тренер на основе движка анализирует вашу игру и объясняет тёплым, простым языком, что было сильно, а где можно улучшиться. Это ежедневная 10-минутная тренировка мозга для взрослых 45–75 лет, опирающаяся на исследования о том, что стратегические настольные игры замедляют когнитивное старение. Никаких "сыграл и забыл" — каждое движение становится уроком.

---

*Built solo in 7 days for nFactorial Incubator '26 by [your handle]. Questions/feedback: [email].*
