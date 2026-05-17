# Sharpki — Business Plan

> Audience: nFactorial Incubator '26 judges, prospective investors, internal team alignment.  
> Time horizon: 12 months.  
> Last updated: 2026-05-17.

---

## 1. Executive summary

**Sharpki** is an AI-coached Russian draughts platform positioned as cognitive training for adults 45–75. The product launches into a gap nobody occupies: the chess world has 6+ LLM-powered AI coaches (Aimchess, Chess.com Game Review, etc.); the checkers world has zero. Simultaneously, the $4.5B brain-training market is growing 24% annually, fueled by aging populations and dementia anxiety, and Russian draughts is a culturally embedded folk game across a 200M+ Russian-speaking population.

We monetize via freemium subscription ($4.99/mo Pro, $9.99/mo Family) with Stripe at launch and Kaspi Pay added in week 3 to capture the 85%-Kaspi-penetrated Kazakhstan market. The MVP ships in 7 days on Vercel + Supabase + Fireworks, with marginal cost per AI-coached game under $0.003.

**12-month targets**:
- 10,000 registered users
- 300 paying customers
- ~$1,500 MRR (mix of monthly + annual + family)
- Break-even on infrastructure by month 3
- nFactorial $1,000 MRR milestone hit by month 6

---

## 2. Market

### 2.1 Top-down sizing

| Layer | Number | Source |
|---|---|---|
| Global brain-training apps market (2023) | $4.52B | Kings Research |
| Brain-training apps market (2031, projected) | $25.20B | Kings Research (CAGR 24.38%) |
| Cognitive assessment & training market (2024) | $6.4B | Emergen Research |
| People globally living with dementia (2024) | 55M | WHO |
| Projected by 2050 | 139M | WHO |
| Russian-speaking population worldwide | ~258M | Multiple sources (Russia + CIS + diaspora) |
| Russian/CIS population playing or familiar with shashki | ~50M+ | Implied from cultural research; shashki is national-level in RU, KZ, UA, BY |
| Kazakhstan internet users (Oct 2025) | 19.5M (93.4% penetration) | DataReportal 2026 |
| Kazakhstan adults using Kaspi Pay | ~13M (85%+ of adults) | Kaspi.kz IR |
| Adults 55+ in CIS (RU + KZ + UA + BY) | ~50M | UN population estimates |
| Adults 55+ in Russian-speaking diaspora globally | ~70M total | Composite estimate |

### 2.2 Serviceable Addressable Market (SAM)

**Definition**: Russian-speaking adults 45+ who use the internet and would consider a cognitive-wellness subscription.

- 70M Russian-speaking adults 45+ globally
- × 90% internet-using = 63M
- × 8% open to paying for digital wellness/learning (industry benchmark for mid-aged paid app adoption) = **~5M SAM**

### 2.3 Serviceable Obtainable Market (SOM, year 1)

Conservative funnel:
- Reach ~250,000 Russian-speaking adults 45+ via organic + paid + word-of-mouth in 12 months
- 4% sign up = 10,000 users (year-1 target)
- 3% of users convert to paying = 300 paying (year-1 target)

This is **0.006% of SAM**. Highly conservative. Even tripling penetration would mean we capture 0.02% of SAM, leaving 99.98% to go after in years 2–5.

### 2.4 Why this market is real (not hype)

- **Chess.com** scaled to 250M users and $150M revenue on a closely adjacent game (chess) with a remarkably similar product loop (play + AI Game Review + lessons). Bootstrapped. Profitable from day 1. Proves the unit economics.
- **ChessKid** built a 14.3M user kids-focused vertical inside Chess.com with B2B sales to schools. Proves the niche-within-board-game model.
- **Lumosity** sells subscriptions to adults 35–75 for general cognitive training. They have monthly, yearly, two-year, AND family plans for exactly this audience.
- **Peer-reviewed science**: 5+ studies (cited in IDEA.md) establish that strategic board games measurably slow cognitive decline. We get to sell a real benefit, not a placebo.
- **Kaspi.kz**: Kazakhstan has a unique digital-payments penetration (85%+ adults). This makes domestic monetization viable in a way few emerging markets are.

---

## 3. Competitive landscape

### 3.1 Direct competitors (checkers/draughts)

| Competitor | Users | Strength | Weakness | Why we win |
|---|---|---|---|---|
| Lidraughts.org | ~120K monthly mobile DLs | Free, open source, all variants, Scan engine | Volunteer-built; UI dated; **no AI coaching**; not optimized for non-tournament players | We have the warm coaching layer that turns the same engine output into learning |
| Draughts.io | small (151 reviews, 4.5★) | Modern web UI, 5 variants, multiplayer | No coaching, no improvement framework, no senior focus | We're a product, not a play surface |
| Checkers Online Elite | 10M+ downloads | Mobile-app polish, 14 variants, leaderboards | No coaching, mobile-only, ads-driven, no learning loop | Web + improvement loop + cognitive positioning |
| Shashki app (Google Play, mkisly) | hundreds of thousands | Native Russian rules, 12 AI levels, compositions | Mobile-only, mid-2010s UX, no AI coach, no learning loop | Modern web UX + AI coach + responsive |
| DraughtsNow.com | small | Tournaments | No coaching, complex UI for newcomers | Approachability + coaching |
| Draff Master | small | Modern look, ladder | Generic, no real differentiation | We have a wedge, they don't |

**Key insight**: Every direct competitor is either (a) free with no learning layer, or (b) a basic paid play app. Nobody offers post-game AI coaching. We are the only product with the wedge.

### 3.2 Adjacent competitors

| Competitor | What they do | Relevance to us |
|---|---|---|
| Chess.com / Chess.com Game Review | Premium chess + AI coaching | Validates the model. Different game; doesn't compete for our user. |
| Aimchess.com | AI coach for chess (Aimchess) | Direct inspiration. Proves people pay $15/mo for "AI coach for board game." Different game. |
| Lumosity | General cognitive training | Owns the cognitive-wellness brand for the senior segment. But generic mini-games, no narrative/depth. Our strategic-game framing is more engaging. |
| BrainHQ (Posit Science) | Clinical-grade cognitive training | Premium price ($96–144/yr), clinical positioning. Different distribution. Their existence proves price tolerance in our segment. |
| Peak Brain Training | Mobile cognitive games | Same as Lumosity. |
| Duolingo | Gamified learning | Inspirational for streak mechanics and habit-building. Different vertical. |

### 3.3 Strategic moats we build

1. **Coaching content** — every analysis we generate becomes proprietary signal: which positions confuse which level of player, what explanations land. Within 6 months we have a private dataset nobody can replicate without a similar user base.
2. **Russian shashki rules + Russian-language coaching** — competitors who try to expand into the CIS market will need 6+ months to get rules + localization + cultural feel right.
3. **Caregiver-purchase brand** — once a few hundred adult children buy Sharpki for their parents and we deliver the weekly cognitive-health summary, we become "the brand parents trust." Hard to dislodge.
4. **Payment-rail moat in Kazakhstan** — first checkers product on Kaspi Pay → 10× lower friction for KZ users.

---

## 4. Product & monetization

### 4.1 Product loop (the engine of growth)

```
Land → Sign up → Onboarding → First game vs AI → Hit "Get AI Analysis" CTA
  → Receive warm coaching → Sharpness Score updates → Streak starts
  → Daily puzzle email next morning → Return to play → Build habit
  → Hit free-tier limit → Upgrade or share-card-acquire → Pay
```

### 4.2 Pricing tiers

| Tier | Monthly | Annual | What you get | Target buyer |
|---|---|---|---|---|
| **Free** | $0 | $0 | 5 games/day, 1 AI analysis/day, 1 puzzle/day, basic stats | Trier, casual user |
| **Pro** | $4.99 | $39.99 (33% off) | Unlimited games, unlimited AI analyses, full puzzle library, detailed dashboard, themes, hints during play | Adult improver / engaged senior |
| **Family** | $9.99 | $79.99 (33% off) | 1 primary + 4 sub-accounts, weekly family-progress email | Adult children buying for parent(s) and themselves |
| **Lifetime** (week 8+) | $149 one-time | — | All Pro forever | Power users who hate subs |

### 4.3 Why $4.99/mo?

- **Lumosity** Family Plans average ~$8/mo; individual yearly equates to ~$11/mo
- **Chess.com Gold** is $4.17/mo billed yearly — proves the price point for adjacent product
- **ChessKid Gold** is similar
- $4.99 is the "no-brainer" psychological tier — equivalent of one coffee per month
- Yearly at $39.99 saves user $19.89/year (33%) and triples LTV at acquisition time

### 4.4 Unit economics (target)

| Metric | Value | Source / logic |
|---|---|---|
| Free user infra cost | ~$0.001/month | Supabase RLS reads, PostHog events — within free tiers |
| Free user variable cost (AI analyses) | ~$0.078/month | 30 analyses × $0.0026 (Qwen3.6 Plus with prompt caching), assumes max free abuse |
| Pro user variable cost | ~$0.26/month | ~100 analyses/month × $0.0026 |
| Pro user gross margin | $4.99 - $0.25 = **$4.74 / 95%** | Excellent SaaS margin |
| Stripe fee | ~3.9% + 30¢ per transaction | Real economics: ~$0.49 per $4.99 charge → net $4.50 |
| Net per Pro user/month | **~$4.25** | After all variable costs |

### 4.5 LTV & CAC

| Metric | Value | Assumption |
|---|---|---|
| Pro retention (months) | 4 | Industry benchmark for fitness/wellness apps targeted at older adults |
| LTV per Pro user | ~$17–20 | $4.25 × 4 months |
| LTV per Family user | ~$32 | Higher retention (multi-user lock-in) |
| Target blended LTV | **$22** | Mix of Pro + Family + small lifetime |
| Acceptable CAC | $7 (3:1 LTV:CAC) | Standard SaaS benchmark |

**CAC channels** (estimated):

| Channel | Est. CAC | Notes |
|---|---|---|
| Organic / SEO (long-tail Russian shashki queries) | $0–2 | Slow build; worth investing |
| Reddit (r/checkers, r/Kazakhstan, r/AskRussia) | $3–6 | Content marketing |
| Telegram channels (CIS-niche shashki groups) | $2–5 | Direct community access |
| Instagram (senior-targeted shorts about brain training) | $8–15 | Mid-cost, scalable |
| Facebook (CIS diaspora, 45+ demo) | $10–20 | Mid-cost |
| TikTok / Reels (AI coach reaction videos) | $5–15 | Lower CAC for younger audiences buying for parents |
| Referrals (share cards, family-plan invites) | $1–3 | Strongest channel once scaled |
| Partnerships (Kazakhstani senior centers, libraries) | $0 | High value, slow setup |

### 4.6 Caregiver-purchase amplification

The Family plan + "weekly cognitive-health summary email to family member" creates the unlock:

- Adult child (35–55, working professional, lives abroad or in capital city) is the buyer
- Parent (60–80, in smaller city) is the user
- The buyer has 5–10× the purchasing power of the user
- The buyer wants peace of mind, not just app access
- Existing playbook: ChessKid (parents buy for kids), hearing-aid apps, medication reminders, video-calling devices for grandparents

This is **the lever**. Pro:Family ratio target by month 12: **40:60** (more revenue from Family despite fewer accounts).

---

## 5. Go-to-market

### 5.1 Phase 1 — Launch (weeks 1–2 post-MVP)

Goal: 100 signups, 5 paying, find product–market signal.

- Personal network (Almaty, Astana, Russia, diaspora) — direct asks for feedback. Target: 30 signups.
- Reddit posts: r/Kazakhstan, r/Russia, r/checkers, r/EldercareTech, r/SideProject. Target: 40 signups.
- Telegram: post in 3 Russian-speaking shashki groups + 2 senior-tech groups. Target: 30 signups.
- nFactorial Demo Day pitch + post = bonus reach.

### 5.2 Phase 2 — Content + community (weeks 3–8)

Goal: 1,000 signups, 25 paying.

- Weekly blog post in Russian + English (e.g., "5 шашечных тактик, которые поддерживают мозг в форме")
- Daily Instagram reel of an AI coach explanation
- Partner with 2 senior shashki YouTube channels (CIS audience) for shoutouts/embed offers
- Run a "21-Day Brain Sharpness Challenge" PR stunt (free Pro for participants, measure cognitive metrics, publish results as case study)

### 5.3 Phase 3 — Paid (months 3–6)

Goal: 5,000 signups, 100 paying.

- Test paid social on Instagram and Facebook targeting Russian-speakers 45–70 in KZ, RU, EU
- Test Google Search ads on "тренажер для мозга", "шашки онлайн с обучением"
- Target CAC <$5; pause channels that exceed

### 5.4 Phase 4 — Caregiver channel (months 6–12)

Goal: 10,000 signups, 300 paying, $1,500+ MRR.

- Launch dedicated caregiver landing page: "A gift for your mom or dad"
- Influencer push to 35–50 demo (caregiver age) via Instagram + TikTok
- B2B pilot: 1 senior center in Almaty + 1 in Astana. License site-wide access for ~$200/mo each.
- Reach out to 3 Kazakhstani health-tech distributors

---

## 6. Financial projections

We model **two horizons**: (a) the **9-week incubator growth sprint** because nFactorial '26 explicitly targets $1,000 MRR by the end of the program; and (b) the **12-month outlook** post-Demo Day.

### 6.A Incubator sprint — Week-by-week (this is the one judges will benchmark against)

After the 1-week MVP build (Week 1), we have ~9 weeks of growth runway before Demo Day. Targets are aggressive but achievable for a Russian-speaking founder operating in the right Telegram/Reddit/Instagram communities, with a Family-plan caregiver angle live by Week 4.

Assumptions for the sprint:
- Avg revenue per paying user: ~$5 (blend of monthly Pro + annual Pro amortized + a slow ramp of Family at $9.99)
- Free→Pro conversion: 4% (slightly aggressive vs the 3% steady-state — early users are higher-intent)
- Net revenue per paying user (after Stripe fees & infra): ~$4.25

| Week | Phase | Signups (cum) | Paying (cum) | MRR | Channels active |
|---|---|---|---|---|---|
| W1 | Build MVP | 0 | 0 | $0 | — |
| W2 | Soft launch | 100 | 3 | ~$15 | Personal network, 1 Reddit post |
| W3 | Telegram + content | 250 | 9 | ~$45 | + 3 Telegram channels, weekly blog |
| W4 | Family plan launch | 500 | 20 | ~$110 | + Instagram reels, caregiver-targeted LP |
| W5 | First paid tests | 800 | 32 | ~$170 | + small Facebook/IG ad tests, $50/wk |
| W6 | Influencer push | 1,200 | 50 | ~$270 | + 2 senior shashki YouTube partnerships |
| W7 | PR moment | 1,700 | 75 | ~$400 | + "21-Day Brain Sharpness Challenge" launch |
| W8 | Paid scaling | 2,200 | 110 | ~$575 | Scale winning ad sets; $200/wk |
| W9 | Caregiver doubling | 2,800 | 150 | ~$770 | Heavy caregiver-channel content |
| **W10 (Demo Day)** | **Push** | **3,500** | **200** | **~$1,000** | Demo Day exposure, alumni network |

**The unit math behind hitting $1k MRR by Demo Day**:
- ~3,500 total signups in 9 growth weeks (~390/week average)
- ~5.7% paying rate (mix of free users who converted + new sign-ups buying immediately)
- ~50% of paying customers are on Family plan ($9.99) — caregiver angle delivers
- ARPU: ~$6.85 blended → 150 × $6.85 = $1,028 MRR

What needs to be true for this:
1. CAC stays under $5 average (organic + cheap-channel weighting)
2. The "21-Day Brain Sharpness Challenge" PR moment creates a viral signup spike
3. Caregiver-targeted Family-plan acquisition outperforms Pro 2:1 by W10
4. AI Coach satisfaction stays ≥85% thumbs-up (i.e., free-to-paid funnel doesn't leak)
5. We get at least one organic Telegram channel boost (≥10k followers reposting us)

If any 2 of those fail, we land closer to $500–700 MRR. Still a strong outcome and well-trajectoried for the $1k MRR steady-state by ~M3 post-Demo-Day.

### 6.B Post-Demo-Day 12-month outlook

Assumes Demo Day pulse → momentum decay → steady compounding.

| Month | Signups (delta) | Cumulative users | Paying | MRR | Notes |
|---|---|---|---|---|---|
| M3 (Demo Day month) | 3,500 | 3,500 | 200 | ~$1,000 | End of incubator |
| M4 | 1,800 | 5,300 | 250 | ~$1,300 | Post-program continuity |
| M5 | 1,800 | 7,100 | 320 | ~$1,650 | B2B pilots begin |
| M6 | 1,600 | 8,700 | 380 | ~$1,950 | First B2B contract |
| M7 | 1,500 | 10,200 | 440 | ~$2,250 | Pro→Family migrations |
| M8 | 1,400 | 11,600 | 490 | ~$2,500 | Iteration on AI Coach v2 |
| M9 | 1,400 | 13,000 | 540 | ~$2,750 | International (10×10) variant launches |
| M10 | 1,400 | 14,400 | 590 | ~$3,000 | Press/blog tour |
| M11 | 1,300 | 15,700 | 630 | ~$3,200 | |
| M12 | 1,300 | 17,000 | 670 | ~$3,400 | |

**12-month-from-launch EOP**: ~17,000 users, ~670 paying, ~$3,400 MRR, ~$41k ARR.

A 2× upside scenario (1 viral moment + faster B2B + better caregiver activation) takes us to ~$6–8k MRR by month 12.

These numbers are deliberately conservative. Chess.com hit 100M users in ~17 years and we are not Chess.com; but we are also operating with 2024 AI tools they didn't have and we're attacking a tighter, more underserved demographic.

### 6.1 Costs

| Item | Free tier (M1–M2) | Growing (M3–M6) | Steady (M7–M12) |
|---|---|---|---|
| Vercel | $0 | $20/mo (Pro) | $20/mo |
| Supabase | $0 | $25/mo (Pro) | $25/mo |
| Fireworks AI | $1–5/mo | $15–40/mo | $40–80/mo |
| PostHog | $0 (1M events free) | $0–25/mo | $25/mo |
| Stripe | 3.9% + $0.30 / txn | same | same |
| Domain + email | ~$3/mo | $3/mo | $3/mo |
| Marketing (paid) | $0 | $200–500/mo | $500–1500/mo |
| **Total fixed** | **<$10/mo** | **~$300/mo** | **~$700/mo** |

**Break-even on fixed costs**: month 3 (MRR > $300).

### 6.2 Funding strategy

- **Default**: bootstrap to $1k MRR. nFactorial provides runway via accelerator stipend if available.
- **Optional**: Pre-seed raise of $50–100k after demo day if we have >$500 MRR and 2k users. Use for: ads spend, 1 senior designer, 1 part-time growth contractor. Target investors: Kazakhstani early-stage funds + US/EU founders investing in CIS opportunities.

---

## 7. Key risks & mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Senior audience is hard to acquire | High | High | Lean into caregiver channel earlier; ChessKid playbook for B2B (senior centers) |
| R2 | LLM coaching quality is "meh" and fails to convert | Medium | High | A/B test prompts weekly; track AI Coach satisfaction (thumbs up/down); be ready to swap to GPT-4o-mini for some prompts if needed |
| R3 | LLM cost spirals if free abuse | Medium | Medium | Server-side rate limits (1/day free, 10/hr Pro); model fallback to Llama 3.1 8B; per-user spend cap with cutover |
| R4 | Chess.com or Lichess clones our wedge | Low | High | Move fast on Russian-speaking moat: localization + Kaspi + cultural fit; build 50K user base before they care |
| R5 | Russian shashki engine bugs | Medium | High | Comprehensive unit test suite (~200 positions covering rules edge cases); use Scan engine via Railway as oracle in week 2+ |
| R6 | Stripe blocks Kazakhstani entity | Medium | Medium | Form entity in friendly jurisdiction (Delaware C-corp via Stripe Atlas, $500); or use Stripe Estonia/Atlas-routed |
| R7 | Compliance: claiming "prevents dementia" | Low | High | Use careful copy: "associated with slower cognitive decline (per peer-reviewed research)" — never make medical claims. Disclaimers in T&Cs. |
| R8 | nFactorial '26 doesn't accept us | Low | Medium | Still ship — the product stands alone |
| R9 | Russian-speaking ad platforms turbulent (RU sanctions) | High | Low–Medium | Use Telegram + Instagram + organic; minimal exposure to Russian ad platforms |

---

## 8. Team & operations

For nFactorial submission, this is a solo build. Post-MVP roles to fill (in priority order):

1. **Designer (part-time)** — month 2. Senior-friendly UX is critical; needs polish beyond defaults.
2. **Growth marketer (part-time, Russian-language)** — month 3. Owns content + community + influencer outreach.
3. **Customer success (part-time)** — month 6. Replies to support; runs onboarding calls for caregiver Family-plan buyers.
4. **Native iOS/Android dev** — month 9. PWA can carry us to month 9; mobile apps unlock the next 5×.

---

## 9. Metrics dashboard (what we watch every week)

### North star
- **WAU who completed ≥1 game AND ≥1 AI analysis**

### Acquisition
- Signups by source (PostHog UTM tracking)
- Cost per signup by paid channel

### Activation
- % of signups who complete the first game (target: 60%)
- % who request first AI analysis (target: 40%)
- % who return on Day 2 (target: 25%)

### Retention
- D7 retention (target: 25%)
- D30 retention (target: 15%)
- 90-day retention for paying users (target: 60%)

### Revenue
- New paying customers per week
- MRR / ARR
- Free → Pro conversion rate (target: 3%)
- Pro → Family upgrade rate (target: 15%)
- Churn (target: <8% monthly)

### Engagement
- Games per active user per week
- AI analyses per active user per week
- Average session length
- Streak length distribution

### Quality
- AI Coach satisfaction (thumbs up/down post-analysis; target: 85% up)
- NPS at day 30 (target: 40+)

See METRICS.md for the PostHog event taxonomy.

---

## 10. Why we win

1. **Real differentiation** — no one in the checkers world has LLM-powered coaching. We will be the only product with this for at least 6–12 months.
2. **Real science** — we can cite 5+ peer-reviewed studies. This is a trust accelerator with senior audiences.
3. **Real market** — 50M+ Russian-speakers familiar with shashki + global brain-training market growing 24%/year.
4. **Real distribution** — local founder, local payment rails, local language and culture, local communities.
5. **Real economics** — 95% gross margin product. Cost per analysis is $0.0025. Modest user base can sustain operation.
6. **Real moat** — coaching data, caregiver brand, payment-rail integration, Russian-language localization. None of these are fast for a competitor to replicate.

We are not building a checkers website. We are building **the first AI-coached cognitive-wellness product where the daily exercise happens to be a game your grandmother taught you**.
