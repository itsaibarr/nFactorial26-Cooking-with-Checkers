# Sharpki — Documentation Index

> Everything you need to start building. Read in order.

## Read in this order

1. **`01_IDEA.md`** — what we're building and why. Frozen concept, naming, target persona, peer-reviewed science backing, the wedge. Read first.
2. **`02_PRD.md`** — product requirements doc. User stories (M/S/C/W), functional + non-functional requirements, tech architecture, UX outline, the AI Coach prompt spec, decision log. Read second.
3. **`03_BUSINESS_PLAN.md`** — market sizing, competitive map, pricing, GTM, week-by-week financial projection toward the $1k MRR Demo-Day goal, risks & mitigations. Read third.
4. **`07_PHASES.md`** — **canonical execution plan.** 8 sequential phases, each with one trackable goal verified by an automated check AND a manual smoke test. **This is the file you'll have open during the build.**
5. **`04_BUILD_PLAN.md`** — tactical reference (appendix). SQL schema, engine implementation notes, and fallback ordering. The day-by-day text inside is historical context — execute against `07_PHASES.md`, not days.
6. **`05_METRICS.md`** — North-star metric, 4 funnels to track, full PostHog event taxonomy with property contracts, dashboards to set up, alert thresholds.
7. **`06_README_TEMPLATE.md`** — the README to paste into your project root before submitting the form.

## The two-line product summary

Sharpki is an AI-coached Russian draughts platform positioned as cognitive training for adults 45–75. After every game an LLM coach explains in plain language what the player did well and what to improve — a feature no checkers competitor has, in a market backed by peer-reviewed science on board games and cognitive decline.

## Where this fits in the nFactorial '26 timeline

- **Stage 1 (application)** — done before this work
- **Stage 2 (technical task)** ← we are here. Build the MVP in 7 days, submit via the Typeform.
- **If admitted** → 10-week incubator. Goal: $1k MRR. The MVP becomes the incubator project. Section 6.A of the business plan is the week-by-week roadmap.

## Single most important truth in these docs

> **The chess world has 6+ AI coaches. The checkers world has zero. We are the first product to bring "AI explains your game in warm plain language" to checkers, positioned for the older adults who already love the game and have purchasing power (theirs or their children's).**

Everything else is execution.

## Things you decided

- **Audience**: Brain-training for seniors (adults 45–75, caregiver-purchase model)
- **Wedge**: Cognitive brain-training program + AI Coach (post-game LLM analysis)
- **Scope**: "Great" level per nFactorial rubric (auth + AI bot + AI coach + Stripe paywall + responsive, **no realtime multiplayer**)
- **Timeline**: 1 week to MVP submission
- **AI Provider**: Fireworks AI — Qwen3.6 Plus ($0.50/M uncached input · $0.10/M cached input · $3.00/M output). Llama 3.3 70B held as week-2 A/B fallback via `COACH_MODEL` env var.
- **Tech stack**: Next.js + Supabase + Vercel + Stripe + PostHog + shadcn/ui (preset `b2fA`: Nova style, Neutral palette, Lucide, Geist)
- **Scaffold command**: `npx shadcn@latest init --preset b2fA --template next --name sharpki`

## Things still to decide before day 2 of build

- [ ] Final product name (Sharpki is recommendation; alternates in `01_IDEA.md`)
- [ ] Domain registration
- [ ] OG image / logo (can ship without on day 1; needed by day 6)

## File hierarchy reference

```
nFactorial26/
├── CLAUDE.md                    ← single source of truth for project context (read this first)
├── AGENTS.md                    ← 5-line pointer to CLAUDE.md (for Codex / generic agents)
├── docs/
│   ├── 00_INDEX.md              ← you are here
│   ├── 01_IDEA.md               ← idea, naming, science, wedge
│   ├── 02_PRD.md                ← user stories, architecture, AI Coach prompt
│   ├── 03_BUSINESS_PLAN.md      ← market, GTM, week-by-week to $1k MRR
│   ├── 04_BUILD_PLAN.md         ← tactical reference (SQL schema + engine notes + fallback ordering)
│   ├── 05_METRICS.md            ← PostHog event taxonomy + funnels
│   ├── 06_README_TEMPLATE.md    ← submission README
│   └── 07_PHASES.md             ← canonical execution plan (8 phases, one trackable goal each)
└── .env.example                 ← env var template
```

**CLAUDE.md is the canonical project-context file.** It contains the locked tech stack, scaffold commands, folder structure, AI Coach contract, coding conventions, definition of done, non-goals, rolling decision log, and current build phase. The `docs/` files are the deep-dive sources; CLAUDE.md summarizes and points at them.
