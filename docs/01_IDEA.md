# Sharpki — The Idea

> Working name: **Sharpki** (a portmanteau of *sharp* + *shashki*). Phonetically smooth in English and Russian (Шарпки), brandable, memorable, easy to type, .com/.app likely available. Final naming is yours; alternatives below.

---

## One-sentence pitch

**Sharpki is research-backed cognitive training disguised as Russian draughts — adults 45–75 play short daily games against an AI, and after every game an AI coach explains in plain language what they did well and what to improve. We turn the strategy game your grandmother played into a daily 10-minute brain workout that measurably keeps your mind sharp.**

---

## The wedge (why this exists)

Every successful chess platform in 2024–2025 ships LLM-powered "Game Review" — Chess.com Game Review, Aimchess, Chessalyz.ai, CircleChess, AICoachess, Lichess AI Coach. The checkers/draughts world has **zero** equivalents. Lidraughts is text-only Scan engine evaluations; every other major checkers app (Checkers Online Elite, Draughts.io, DraughtsNow, Shashki Russian Checkers on Android) is "play vs AI, see win/loss." No coaching layer. No explanation layer.

Simultaneously, the **brain-training app market** is $4.5B → $25.2B by 2031 (CAGR 24%), driven by aging populations and dementia anxiety. Lumosity, BrainHQ, Peak all sell to seniors and to adult children buying for their parents.

**Sharpki sits in the intersection no one occupies:**
- Russian draughts (cultural fit for CIS, but globally legible)
- AI coach that explains every move in warm plain language
- Cognitive-wellness positioning (not just a game; a daily brain workout)
- Caregiver purchase model (adult children buy for parents, like ChessKid for kids)

---

## The science (this is rare and powerful)

We can — and will — cite peer-reviewed evidence on the landing page. Real, named studies:

1. **Cibeira et al. 2024 systematic review & meta-analysis** (Journal of Alzheimer's Disease, Sage): traditional board games significantly improve Montreal Cognitive Assessment scores (p=0.003) and Mini-Mental State Examination (p=0.02). Chess specifically improved quality of life (p<0.00001).

2. **COGniChESs study (2025, PubMed 41342683)**: 12 weekly chess/Go sessions improved categorical fluency and quality of life in MCI patients; reduced depression in women (p=0.013).

3. **Altschul & Deary 2020, Journals of Gerontology, "Lothian Birth Cohort 1936"** (NCBI PMC7021446): 68-year longitudinal study, n=1,091. Higher frequency of analog game playing = less cognitive decline ages 70–79, particularly memory and processing speed.

4. **CHARLS China (Aging Clinical and Experimental Research, 2025)**: n=19,816 adults 45+. Significant cross-sectional association between board games (chess, mahjong, cards) and cognitive function. Dose-response present.

5. **12-week chess pilot in institutionalized older adults**: improved cognition (p<0.001), attention, processing speed, executive function (p<0.043), quality of life (p<0.021).

**Implication for marketing**: "10 minutes of strategic play per day is associated with significantly slower cognitive decline across multiple peer-reviewed studies" — this becomes our landing-page headline credibility anchor.

---

## Target user (specific)

### Primary persona — "Aigul, 58, Almaty"
- Former engineer, now part-time consultant
- Worried about her mother (76) showing signs of memory slips, wants to support her
- Played shashki with her grandfather as a child
- Uses Kaspi for everything, WhatsApp daily, occasionally Telegram
- Has heard "doing puzzles keeps your mind sharp" but doesn't trust most apps
- Will pay 2,500 KZT/month ($5) for something that visibly helps

### Secondary persona — "Sergey, 67, retired teacher in Astana"
- Plays shashki regularly with friends offline
- Frustrated that he loses to younger people online and doesn't understand why
- Wants to improve but no human coach will work with him at his level
- Adult son lives abroad and is happy to gift him a subscription

### Tertiary persona — "Marina, 42, Moscow"
- Buys her father (72) a yearly Sharpki subscription
- Checks his weekly "brain streak" report via family-account view
- Sees it as preventive healthcare

This audience is **massively underserved**. Lumosity feels gimmicky to them. Chess feels intimidating. Shashki is familiar, comfortable, and culturally theirs.

---

## What we are NOT

We are not:
- A faster chess.com (we don't have the budget; chess is owned)
- A tournament platform (low margin, hard to operate, cheating is a nightmare)
- A real-time multiplayer party game (we cut this from MVP — see PRD)
- A kids' app (different UX, different sales motion; ChessKid owns that)
- A general brain-training app (Lumosity has the moat there)

We are **the AI-coached cognitive-wellness platform built around the one strategy game your target audience already loves and knows**.

---

## Differentiators ranked (judges should remember these in order)

1. **AI coach speaks human, not engine** — after every game, plain-language warm coaching: "Your move on turn 14 was clever — you were preparing a king. But on turn 23 you missed a double-take that would have won the game. Here's why."
2. **Cognitive metrics, not just rating** — your "Sharpness Score" tracks decision quality, calculation depth, and tactical pattern recognition. Adult children can see their parent's trends.
3. **Russian shashki done right** — flying kings, mandatory captures, mid-sequence promotion. Most apps butcher the rules. We don't.
4. **Senior-friendly UX from day one** — accessibility-toggle for large fonts, high contrast, slower animations, no jargon. We compete on care, not flash.
5. **Built for CIS payment reality** — Stripe for international + Kaspi roadmap. Localized Russian-language coaching out of the box.

---

## Why now

- LLMs reached "coach-quality explanation" tier in 2024–2026 (Qwen3.6 Plus, Llama 3.3, GPT-4o, etc.) — wasn't possible 2 years ago
- Inference cost collapsed: a full game analysis is now <$0.003 — enables freemium without bleeding
- Brain training market accelerating post-COVID (long-COVID cognitive symptoms drive demand)
- Aging CIS population + Kaspi payment rails + Russian as lingua franca = local market is ripe and unowned
- nFactorial '26 thematic focus: AI-first startups — this is genuinely AI-first, not AI-bolted-on

---

## Why us (for the application)

- Native Russian-speaking founder in Almaty: cultural fit, market access, distribution channels (Russian-speaking Reddit, Telegram channels, Instagram, VK)
- Tech stack already chosen and proven (Next.js, Supabase, Vercel) — execution risk minimal
- Clear, measurable wedge: judges can verify after 30 seconds of use that the AI coach is the magic

---

## What we ship in week 1 (MVP scope frozen)

See PRD for detail. Headline:
- Auth (Google + email, Supabase)
- Russian shashki engine in TypeScript (rules + 3-level AI bot)
- Play vs AI with three difficulty levels
- AI Coach: post-game analysis via Fireworks Qwen3.6 Plus (Alibaba flagship, strong Russian-language quality; Llama 3.3 70B as week-2 fallback option)
- Daily puzzle (1/day free, unlimited Pro)
- Sharpness Score (composite of accuracy, speed, blunder rate)
- Streaks, basic stats dashboard
- Stripe paywall: Free → Pro $4.99/mo
- Russian + English UI, accessibility toggle (large fonts, high contrast)
- Responsive design
- PostHog analytics on every meaningful event
- Deployed on Vercel

What we do NOT ship in week 1:
- Real-time multiplayer (too risky for the timeline)
- Kaspi Pay (Stripe first; Kaspi by week 3 if we continue)
- International / English / Brazilian variants (Russian shashki only)
- Native mobile apps
- Tournaments, clubs, friend lists, chat

---

## Naming alternatives (decide before launch)

Pick one. Sharpki is my recommendation but you own this.

| Name | Pros | Cons |
|---|---|---|
| **Sharpki** | Sharp + shashki. Memorable, brandable, bilingual feel, easy to spell. | Made-up word, no immediate meaning. |
| **DamaBrain** | "Dama" = king piece in Russian; explicit positioning. | "Dama" also means "lady" — could be confusing. |
| **Shashki360** | Localized, conveys completeness. | Generic, hard to trademark. |
| **MindMate** | Friendly, cognitive wellness vibe. | Already taken / generic in many markets. |
| **Sharper** | Direct, English-friendly. | Generic, less brandable. |
| **Думай** ("Dumay" — "Think") | Russian-native, strong. | English market harder. |
| **Etalon** | Russian for "standard/benchmark," premium. | Less playful. |

**My pick: Sharpki.** Final call is yours.

---

## North-star metric

**Weekly active users who completed at least 1 game and 1 AI coach analysis.**

This is the activation+retention metric that proves the wedge is working. If people aren't reading AI Coach analyses, the product has no reason to exist. We track this from day one in PostHog.
