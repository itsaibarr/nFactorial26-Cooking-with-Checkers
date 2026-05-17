# Sharpki — Product Requirements Document (MVP)

> Document version: v1.0  
> Target ship date: 7 days from start of build  
> Owner: Aibar  
> Status: Frozen for week-1 MVP. Roadmap items live in "Post-MVP".

---

## 1. Product summary

Sharpki is a web-based AI-coached Russian draughts (shashki) platform positioned as a daily 10-minute cognitive workout for adults 45–75. Core loop: user plays a short game against an AI bot → AI Coach analyzes the game and explains key moments in plain warm language → user earns a Sharpness Score and streak → optionally completes a daily puzzle.

Monetization: Freemium. Free tier caps AI Coach analyses and puzzles. Pro tier ($4.99/mo) unlocks everything.

---

## 2. Goals & non-goals

### Goals (MVP)
- Demonstrate the wedge: **post-game AI coaching that no other checkers product has**.
- Hit "Great" level of the nFactorial rubric: monetization integrated (Stripe paywall), product looks like a real service.
- Build trust with senior audience: accessible UX, science-backed messaging, real explanation quality.
- Be deployable on Vercel + Supabase with zero ops overhead.
- Generate first paying user within 14 days of launch via personal network + targeted Russian-speaking communities.

### Non-goals (MVP)
- ❌ Real-time WebSocket multiplayer (cut due to 1-week timeline risk).
- ❌ International (10×10) or English/American (8×8 English rules) variants.
- ❌ Tournament system, clubs, chat, friend list.
- ❌ Native iOS/Android apps.
- ❌ Kaspi Pay integration (post-MVP week 3).
- ❌ Custom skin marketplace.
- ❌ Multi-player local hot-seat (skip; AI is the differentiator).

---

## 3. User stories (numbered, MoSCoW prioritized)

### Must-have (M)

1. **M1 — Landing**: As a visitor I see a hero with the value prop ("Train your mind. Every move is a workout."), a peer-reviewed science strip, a Play button, and pricing. CTA: "Play your first game free."
2. **M2 — Auth**: As a visitor I can sign up with Google in one click, or email + magic link. I never see passwords.
3. **M3 — Onboarding**: As a new user, after sign-up I see a 30-second flow: pick my level (Beginner / Intermediate / Confident) + my goal (Sharpen my mind / Beat my grandkids / Compete) + my preferred language. We save this to `profiles`.
4. **M4 — Play vs AI**: As a user I can start a game vs Easy/Medium/Hard AI. The board renders correctly (8×8, dark squares only, Russian shashki initial position).
5. **M5 — Move rules**: As a user my moves are validated per Russian shashki rules: men move one diagonal forward, capture forward/backward, mandatory captures, multiple jumps in sequence, mid-sequence promotion to king, flying kings.
6. **M6 — Game end states**: As a user I see clear modals for win, loss, draw (3-fold repetition, 25-move no-capture rule), with my updated Sharpness Score and a "Get AI Analysis" CTA.
7. **M7 — AI Coach analysis**: As a user, after a game I can request an AI analysis. Within 5 seconds I see (a) overall game quality, (b) 2–3 key moments with plain-language explanation, (c) one specific lesson, (d) one encouragement. Free tier: 1/day. Pro: unlimited.
8. **M8 — Sharpness Score**: As a user, after each game my Sharpness Score updates (0–100 composite of accuracy + decision speed + blunder rate). I see a 7-day trend chart on my dashboard.
9. **M9 — Daily puzzle**: As a user I see a "Today's tactical position" — one curated position, find the winning move. Free: 1/day. Pro: unlimited library.
10. **M10 — Streak**: As a user, completing ≥1 game OR ≥1 puzzle in a day extends my streak. I see a streak badge on my dashboard.
11. **M11 — Game history**: As a user I can see my past games with date, result, opponent (AI level), and Sharpness Score earned.
12. **M12 — Paywall**: As a user, when I hit a free-tier limit (e.g., 2nd AI analysis of the day, 4th game of the day) I see a clean upgrade modal: "$4.99/mo unlimited. Cancel anytime." Stripe Checkout.
13. **M13 — Profile/settings**: As a user I can change language (RU/EN), toggle accessibility mode (large font + high contrast + slower animations), choose theme (light/dark), manage subscription, sign out.
14. **M14 — Subscription management**: As a Pro user I can cancel or update payment method via Stripe Customer Portal.
15. **M15 — Analytics**: As an operator I see every meaningful event in PostHog (signup, game_started, game_ended, ai_analysis_requested, paywall_shown, checkout_started, checkout_completed). See METRICS.md.

### Should-have (S)

16. **S1 — Sharpness Score breakdown**: As a user I can tap my score to see "Why 78?" — bars for Accuracy, Speed, Tactics.
17. **S2 — Email after game**: After my first game we email me my AI analysis + invite to come back tomorrow.
18. **S3 — Resend last AI analysis**: As a user I can re-read my last 5 AI analyses from history.
19. **S4 — "Tell mom" share card**: As a Pro user I can share my weekly streak as an image (good for organic).

### Could-have (C)

20. **C1 — Family plan**: $9.99/mo for 1 primary + up to 4 sub-users (target: adult children buying for parent). Add to pricing page but don't ship checkout flow until week 2.
21. **C2 — Endgame trainer**: Curated king-vs-king and king-vs-man endgame positions. Pro-only.
22. **C3 — Opening lessons**: 3 starter openings explained.
23. **C4 — Hints during play**: Pro feature; shows best move if requested (limited per game).

### Won't-have (W) — explicitly cut

- W1 — Real-time multiplayer
- W2 — Chat / clubs / forums
- W3 — Mobile apps
- W4 — Tournaments
- W5 — In-app cosmetics/skins marketplace
- W6 — Variants other than Russian shashki

---

## 4. Functional requirements

### 4.1 Authentication
- Supabase Auth, Google OAuth + Email magic link.
- New users get a row in `profiles` with `id` (auth.users.id), `display_name`, `language` (default "ru"), `level` (beginner/intermediate/confident), `goal`, `accessibility_mode` (bool), `theme` (light/dark), `created_at`.
- Email verification required for email signup.

### 4.2 Board & engine
- **Variant**: Russian shashki (8×8, 12 pieces per side, dark squares only).
- **Rules to implement** (this is the core IP):
  - Men move one square diagonally forward only.
  - Men capture diagonally forward OR backward.
  - Captures are mandatory; if any capture is available, a non-capturing move is illegal.
  - In multi-jump sequences, capture continues until no more captures are possible.
  - If a man lands on the back rank mid-sequence, it is promoted to king and **must continue capturing** as a king if possible.
  - Kings (дамки) are "flying": move any number of empty squares diagonally in any direction.
  - Kings capture by jumping over an opponent piece, landing on any empty square beyond on the same diagonal.
  - Player chooses sequence when multiple captures are available (NOT obligated to take the maximum — this differs from international rules; specific to Russian).
  - **Draws**: 3-fold repetition; 25 moves with only king moves and no captures; agreed draw; technical draws (3 kings vs 1 king if no win in 16 moves).
- **Move representation**: Standard `"a3-b4"` for moves, `"c3:e5:g7"` for captures (chained).

### 4.3 AI bot (3 levels)
- **Easy**: Random legal move, but always takes a capture if available. Target: <100ms response. Beats no one above beginner.
- **Medium**: Minimax depth 4 with alpha-beta pruning, simple eval (piece count + kings count×3 + back-rank holding + center control). ~500ms response. Beats most casual players.
- **Hard**: Minimax depth 6–8, full eval (piece count, king count, mobility, tempo, structural). 1–2s response. Strong club-level.
- Bot runs **client-side in a Web Worker** to avoid Vercel function timeouts and keep cost zero.

### 4.4 AI Coach (Fireworks Qwen3.6 Plus)
- **Trigger**: After a game ends, user clicks "Get AI Analysis."
- **Pipeline**:
  1. Server route `/api/coach/analyze` receives the game (move list + result + user metadata).
  2. Server re-runs the game through the engine, capturing per-move eval scores (positive = player advantage).
  3. Identifies up to 5 "critical moments": moves where eval swung by ≥1.5 pieces.
  4. Builds a prompt with: game summary, user level, language preference, top critical moments with engine eval before/after.
  5. Calls Fireworks `accounts/fireworks/models/qwen3p6-plus` with JSON-mode system prompt (see Appendix A).
  6. Returns structured JSON: `{ overall_quality, sharpness_score, highlights[], key_lesson, encouragement }`.
  7. Stores result in `game_analyses` table.
- **Pricing**: $0.50/M uncached input · **$0.10/M cached input** · $3.00/M output. Context window 131K.
- **Prompt caching MUST be enabled from day 1** — the system prompt (persona + JSON schema + language instructions) is ~600 tokens and identical for every call. Caching saves ~80% on input costs at scale.
- **Cost per analysis**: ~2000 input + 800 output tokens. With caching: ~$0.0026. Budget for free-tier abuse: 100 free users × 30 analyses/month = 3,000 analyses = ~$7.80/mo. Acceptable.
- **Why Qwen3.6 Plus over Llama 3.3 70B**: Qwen was trained on 119 languages with a strong multilingual emphasis (Alibaba's strategic mandate). For our Russian-language coaching for senior users, Qwen3.6 Plus is expected to produce more natural, culturally accurate, idiomatic output than Llama. Cost is at parity with prompt caching enabled. See decision log.
- **Failure handling**: If LLM call fails or returns malformed JSON, retry once; if still failing, return graceful degradation with engine-only stats.
- **Cache**: Cache by game hash (move list + user.id + language) for 7 days to avoid duplicate analyses.
- **Abstraction layer**: Wrap the LLM client in `lib/coach/llm.ts` with a `getCoachAnalysis(game, lang) → Analysis` interface. Behind a `COACH_MODEL` env var we can A/B Qwen vs Llama 3.3 70B in week 2 if Qwen's Russian outputs disappoint. Never hardcode model paths in business logic.

### 4.5 Sharpness Score
- Composite 0–100 score updated after each game.
- Formula (v1, tune in week 2):
  - **Accuracy** (40%): % of moves where played move matches engine top-3 best moves.
  - **Speed** (20%): how decision time compares to user's baseline (faster is not always better; consistency is rewarded).
  - **Blunder rate** (40%): inverse of count of moves that lost ≥2 pieces of eval.
- Stored in `games.sharpness_score` and rolled up in `profiles.current_sharpness` (EMA-7).
- Sub-scores stored too so we can show breakdown.

### 4.6 Daily puzzle
- Library of 30 curated Russian shashki tactical positions to start (manually entered with engine validation).
- One puzzle/day surfaced based on user's level. Free tier = 1/day. Pro = unlimited library.
- Solve UI: drag-and-drop on a small board, validates against engine best move.
- Solve → AI Coach gives a 2-sentence explanation of why this is the right move.

### 4.7 Streak
- Activity = ≥1 game completed OR ≥1 puzzle solved in a calendar day (UTC+5, user's tz on settings).
- Streak counter visible on dashboard.
- Missing 1 day breaks streak; 1 "freeze" per month for Pro users.

### 4.8 Payments (Stripe)
- 1 product: "Sharpki Pro"
- 2 prices: monthly $4.99, yearly $39.99 (33% discount, billed annually).
- Stripe Checkout (hosted, no card collection in our UI).
- Webhook → update `profiles.subscription_status` and `profiles.subscription_tier`.
- Stripe Customer Portal for cancel/update.
- 7-day free trial (no card up front in MVP? **Decision: NO trial in MVP** — trial logic adds risk. Test trial in week 3.)

### 4.9 Accessibility & i18n
- Toggle in settings for "accessibility mode": adds 1.25× font scaling, WCAG AA contrast pairs, slower animations (300ms→700ms), bigger touch targets (44px → 56px).
- Two languages at launch: Russian (default for `Accept-Language: ru*` and Kazakhstan IP), English. All UI strings in JSON locale files. AI Coach output in user's language.
- Per WCAG: aim for 4.5:1 contrast minimum; keyboard navigation; screen-reader labels on board squares.

### 4.10 Theme
- Light + Dark via CSS variables. Default = system preference.

### 4.11 Analytics (PostHog)
- See METRICS.md. Every meaningful action emits an event.
- Identify user on auth; merge anonymous events.
- Funnels pre-configured: signup → first game → first analysis → paywall_shown → checkout_started → checkout_completed.

---

## 5. Non-functional requirements

| # | Requirement | Target |
|---|---|---|
| NF1 | TTI (Time-to-Interactive) on landing page, mid-tier mobile | < 2.5s |
| NF2 | Game move response (AI Easy) | < 200ms |
| NF3 | Game move response (AI Medium) | < 800ms |
| NF4 | AI Coach analysis end-to-end | < 7s (target 4s) |
| NF5 | Uptime | 99.5% (Vercel + Supabase SLAs cover this) |
| NF6 | Mobile-first; usable on 360px width | Required |
| NF7 | Zero unencrypted PII in client storage | Required |
| NF8 | Coach analysis cost per call | < $0.005 |

---

## 6. Tech architecture

### 6.1 Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui.
- **State**: React Server Components + minimal client state via Zustand (board state, current game).
- **Engine**: Custom TypeScript implementation of Russian shashki (`/lib/engine/`). Bitboard or array representation. Move gen + alpha-beta minimax. Runs in Web Worker for medium/hard bot.
- **Auth + DB**: Supabase (Postgres, Auth, Storage if needed for share cards).
- **AI**: Fireworks AI via `openai`-compatible client. Endpoint: `https://api.fireworks.ai/inference/v1`. Model: `accounts/fireworks/models/qwen3p6-plus` (Qwen3.6 Plus, Alibaba flagship). Prompt caching enabled for the static system prompt. Behind a `COACH_MODEL` env var so we can swap to `accounts/fireworks/models/llama-v3p3-70b-instruct` in week 2 if needed.
- **Payments**: Stripe (Checkout + Billing Portal + Webhooks).
- **Analytics**: PostHog (self-hosted EU cloud or PostHog Cloud).
- **Hosting**: Vercel (free tier sufficient for MVP).
- **CI/CD**: Vercel Git integration on `main` → production; preview deploys on PRs.

### 6.2 Why no Railway in MVP?
- Engine is client-side; AI Coach is a thin server route on Vercel. No need for a long-running service.
- Railway joins post-MVP IF we add real-time multiplayer (would host the WebSocket / game-state server there).

### 6.3 Why Supabase?
- Auth out of the box (Google OAuth painless).
- Postgres with RLS for security.
- Edge Functions if we ever need them.
- Free tier covers 50K MAUs.

### 6.4 Database schema (initial)
See BUILD_PLAN.md for the SQL migration. Tables:
- `profiles` (user metadata, settings, current_sharpness)
- `games` (game record: moves, result, opponent_level, sharpness_score, started_at, ended_at)
- `game_analyses` (LLM output per game, cached)
- `puzzles` (curated puzzle library)
- `puzzle_attempts` (user × puzzle results)
- `subscriptions` (Stripe sync)
- `events_log` (optional server-side event log for replay, in addition to PostHog)

### 6.5 Security
- Supabase RLS on every table. Users can only read/write their own rows.
- Stripe webhooks signed and verified.
- Fireworks API key only in server env. Never exposed to client.
- Rate-limit `/api/coach/analyze` to 10 calls per user per hour (Pro) or 1 per day (Free). Server-side enforcement.
- No password storage (passwordless via magic link).

### 6.6 Privacy
- Privacy Policy + Terms generated and linked from footer (use a generator + customize).
- Cookie consent banner: PostHog is opted-in by default for analytics. We log only event names + minimal properties; no key-stroke tracking.

---

## 7. UX outline (key screens)

### 7.1 Landing
- Hero: headline + sub + "Play your first game free" + small video/animation of board with floating coach explanation bubbles.
- Trust strip: "Based on peer-reviewed research" + 4 study citations as small chips, expandable.
- 3-card feature grid: AI Coach / Daily Brain Workout / Sharpness Score.
- Pricing block: Free, Pro $4.99/mo, Family $9.99/mo (mark Family as "coming soon" or live, your call).
- FAQ: 6 questions (what is shashki, is it really cognitive training, do I need to know rules, can my parent use this, etc.)
- Footer: blog (empty for now), privacy, terms, contact.

### 7.2 Onboarding (post-signup, single page, 3 quick questions)
1. What's your level? (Beginner / I know the rules / I'm experienced)
2. What brings you here? (Keep my mind sharp / Get better at shashki / Help a parent)
3. Pick language (RU/EN). Continue.

### 7.3 Dashboard
- Greeting: "С возвращением, Айгуль" / "Welcome back, Aigul"
- Streak badge: "🔥 5 days"
- Sharpness Score widget with 7-day trend.
- Big primary CTA: "Play a game" (3 difficulty buttons).
- Secondary: "Today's puzzle" + "View history."
- Pro upsell banner if free tier and conditions met.

### 7.4 Game screen
- Board (centered, max 600px square).
- Side panel: opponent info, move list, your time used.
- Bottom: "Resign" / "Offer draw."
- On game end → results modal → "Get AI Analysis" primary CTA.

### 7.5 AI Coach analysis screen
- Top: overall verdict ("Great game!" / "You're on the right track" / "Tough one — let's learn"). Big number = Sharpness Score for this game.
- For each critical moment: mini board showing the position, 2–3 sentences from coach.
- Bottom: "Key lesson" + "Practice this concept" (links to a puzzle).
- Share button (S4 from user stories).

### 7.6 Puzzle screen
- Board, prompt: "White to move and win" (or appropriate).
- Drag/drop. On success → confetti + coach explanation. On failure → "Try again" or "Show solution" (Pro).

### 7.7 Profile / Settings
- Language, accessibility toggle, theme, subscription status, sign out, delete account.

### 7.8 Pricing / Upgrade modal
- 3 columns: Free (what you have), Pro $4.99/mo (everything unlocked), Yearly $39.99 (save 33%).
- "Start Pro" → Stripe Checkout.

---

## 8. Quality bar

A judge or a paying user should be able to:
1. Sign up in ≤30 seconds.
2. Complete a full game in ≤7 minutes vs Easy AI.
3. See an AI Coach analysis that **actually says something specific to their game** (not generic).
4. Hit the paywall naturally (e.g., requesting 2nd analysis of the day).
5. Complete Stripe Checkout in test mode.
6. Read all UI in Russian without finding a single untranslated string.

If any of those breaks, we don't ship.

---

## 9. Open questions / decisions to confirm

| # | Question | Recommendation | Status |
|---|---|---|---|
| Q1 | Name: Sharpki or alternative? | Sharpki | **Decide before day 2** |
| Q2 | Yearly price? | $39.99 (33% discount) | Decided |
| Q3 | Free trial? | None in MVP, add post-launch | Decided |
| Q4 | Family plan ship date? | UI on landing now; checkout post-MVP | Decided |
| Q5 | Daily puzzle library size at launch? | 30 hand-curated | Decided |
| Q6 | LLM model | Qwen3.6 Plus at launch (best Russian quality); abstraction layer lets us A/B with Llama 3.3 70B in week 2 | Decided |
| Q7 | Real-time mp post-MVP? | Yes by week 4 if metrics support | Roadmap |
| Q8 | Kaspi Pay? | Week 3 | Roadmap |

---

## 10. Roadmap (post-MVP, ranked)

| Phase | Item | Why |
|---|---|---|
| Week 2 | Kaspi Pay integration (via ApiPay.kz) | Unlocks 85% of Kazakhstan adults |
| Week 2 | Email lifecycle: D1, D3, D7 nudges | Retention lift |
| Week 3 | Family plan checkout (full flow) | Caregiver purchase model |
| Week 3 | Endgame trainer module | Pro stickiness |
| Week 4 | Real-time multiplayer (friend invite link) | Viral loop + social moat |
| Week 5 | International (10×10) variant | Global expansion |
| Week 6 | Mobile PWA polish + push notifications | Daily habit anchor |
| Week 8 | B2B pilot: 1 Almaty senior center | Lumosity-style direct sales |
| Week 12 | Cognitive report PDF (for caregivers) | Differentiation + healthcare angle |

---

## Appendix A — AI Coach prompt (v1)

```text
SYSTEM:
You are Sharpki, a kind and patient Russian draughts (shashki) coach.
Your students are adults aged 45–75 who play shashki to keep their minds sharp.
Speak warmly, like a wise grandchild explaining gently to a beloved grandparent.
Use simple, encouraging language. Avoid jargon.
When the player makes a mistake, acknowledge what they were trying to do
BEFORE suggesting a better move.
Always end with one specific encouragement that references something they did well.
Respond strictly in the requested language ({lang}).
You MUST respond as valid JSON matching the schema provided. No prose outside JSON.

USER:
The student played as {player_color}. Opponent was the {opponent_level} AI bot.
Game result: {result}.
Student's current sharpness score: {sharpness}/100. Current streak: {streak} days.

Here is the game in PDN-like notation: {moves}.

Here are critical moments identified by the engine (eval is from student's perspective; positive = student advantage):
{critical_moments_json}

Please respond in JSON with this schema:
{
  "overall_quality": "excellent" | "good" | "developing" | "tough_game",
  "sharpness_score_for_this_game": 0-100,
  "highlights": [
    {
      "move_number": int,
      "type": "best_move" | "good_idea" | "missed_tactic" | "blunder",
      "what_you_did": "1-2 sentences in {lang}",
      "what_to_consider": "1-2 sentences in {lang} explaining the better idea or why this was good"
    }
  ],
  "key_lesson": "1-2 sentence theme for this game, in {lang}",
  "encouragement": "1 specific positive note, in {lang}"
}
```

This prompt is deliberately structured to (a) force JSON output, (b) demand warmth + specificity, (c) include engine ground truth so the LLM can't hallucinate. We'll iterate on it in week 2.

---

## Appendix B — Decision log

- **2026-05-17**: Frozen MVP scope to: Russian shashki only, no multiplayer, no Kaspi, Stripe only, 1-week build.
- **2026-05-17**: Chose senior brain-training positioning over kids-learning (per user input).
- **2026-05-17**: Initial AI Coach model recommendation was Fireworks Llama 3.3 70B based on cost analysis ($0.90/M tokens) and battle-tested status.
- **2026-05-17 (later)**: **Switched to Fireworks Qwen3.6 Plus** (`accounts/fireworks/models/qwen3p6-plus`, released April 2026, $0.50/M uncached input · $0.10/M cached input · $3.00/M output). Rationale: (1) Qwen trained on 119 languages with strong multilingual emphasis → better Russian-language coaching quality for our target senior audience; (2) Newer flagship model → better instruction following and JSON-mode reliability; (3) Cost is at parity with Llama once prompt caching is enabled; (4) Caveat: closed-weights vendor lock-in, mitigated by abstraction layer (`lib/coach/llm.ts`) that allows hot-swap to Llama 3.3 70B via `COACH_MODEL` env var if Qwen's Russian outputs underperform in week 2 testing.
