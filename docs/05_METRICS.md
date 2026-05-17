# Sharpki — Metrics & PostHog Event Taxonomy

> One source of truth for what we track and why.  
> Every event below should fire from day 1 of MVP. Anything not in this list either doesn't get tracked or gets added with a PR + this doc update.

---

## North-star metric

**WAU-coached** = unique weekly active users who completed ≥1 game **AND** received ≥1 AI Coach analysis.

Why this and not "DAU" or "MAU":
- DAU is too granular for a low-frequency wellness habit; senior users won't play daily for weeks.
- MAU is too lagging.
- Including "received AI Coach analysis" forces us to measure whether the wedge is actually engaging, not just plays.

PostHog implementation: weekly SQL insight on `events` table:
```sql
SELECT count(distinct user_id) AS wau_coached
FROM events
WHERE event IN ('game_completed', 'ai_analysis_completed')
  AND timestamp >= now() - interval '7 day'
GROUP BY user_id
HAVING count(distinct event) = 2;
```

---

## Funnel hierarchy

Track these 4 funnels in PostHog from day 1:

### 1. Signup funnel
| Step | Event | Target rate (D7+) |
|---|---|---|
| Visit | `lp_viewed` | 100% |
| Click CTA | `cta_signup_clicked` | 12% |
| Open signup modal | `signup_started` | 10% |
| Complete signup | `signup_completed` | 8% |

### 2. Activation funnel
| Step | Event | Target rate |
|---|---|---|
| Sign up | `signup_completed` | 100% |
| Complete onboarding | `onboarding_completed` | 90% |
| Start first game | `game_started` (first) | 75% |
| Complete first game | `game_completed` (first) | 60% |
| Request first analysis | `ai_analysis_requested` (first) | 40% |
| Read first analysis | `ai_analysis_viewed` | 38% |
| Return on D2 | `app_opened` on user's D2 | 25% |

### 3. Monetization funnel
| Step | Event | Target rate |
|---|---|---|
| Paywall shown | `paywall_shown` | base |
| Pricing viewed | `pricing_viewed` | 60% |
| Checkout started | `checkout_started` | 18% |
| Checkout completed | `checkout_completed` | 12% |

Free→Pro conversion (overall): **3%** target.

### 4. Retention funnel (cohort)
| Day | Target |
|---|---|
| D1 | 35% |
| D3 | 28% |
| D7 | 22% |
| D14 | 15% |
| D30 | 12% |

For paying users specifically: D30 ≥ 65%, D90 ≥ 55%.

---

## Event taxonomy

### Convention
- Lower snake_case.
- Event names are verbs in past tense or descriptive nouns of state ("paywall_shown").
- Properties are JSON-friendly snake_case.
- Always include: `language`, `subscription_tier`, `accessibility_mode` from `$set` (PostHog person properties).

### Landing & marketing
| Event | Properties | Trigger |
|---|---|---|
| `lp_viewed` | `path`, `referrer`, `utm_source`, `utm_campaign`, `utm_medium` | On `/` mount |
| `cta_signup_clicked` | `cta_location` ("hero","pricing","footer") | Click on signup CTA |
| `pricing_viewed` | `source` | Pricing page or modal opened |
| `faq_expanded` | `question_id` | FAQ accordion opened |
| `lang_switched` | `from`, `to` | Manual language switch |

### Auth
| Event | Properties | Trigger |
|---|---|---|
| `signup_started` | `method` ("google","email") | Signup modal opens |
| `signup_completed` | `method` | Auth succeeds for first time |
| `login_completed` | `method` | Auth succeeds for returning user |
| `logout` | — | User logs out |

### Onboarding
| Event | Properties | Trigger |
|---|---|---|
| `onboarding_started` | — | First page render after signup |
| `onboarding_step_completed` | `step` ("level","goal","language") | Each step |
| `onboarding_completed` | `level`, `goal`, `language` | After last step |

### Gameplay
| Event | Properties | Trigger |
|---|---|---|
| `game_lobby_viewed` | — | Pre-game lobby loaded |
| `game_started` | `opponent_level`, `player_color`, `game_id` | "Start" button |
| `game_move_played` | `game_id`, `move_number`, `is_capture` | Each human move (sampled or full — TBD on cost) |
| `game_completed` | `game_id`, `result`, `end_reason`, `duration_seconds`, `moves_count`, `sharpness_score` | Game ends |
| `game_resigned` | `game_id`, `move_number` | User resigns |
| `game_offered_draw` | `game_id` | User offers draw (post-MVP) |

### AI Coach
| Event | Properties | Trigger |
|---|---|---|
| `ai_analysis_requested` | `game_id`, `is_first` (bool) | User clicks "Get AI Analysis" |
| `ai_analysis_completed` | `game_id`, `latency_ms`, `tokens_in`, `tokens_out`, `cost_usd` | Server returns analysis |
| `ai_analysis_viewed` | `game_id`, `time_to_view_ms` | Analysis page opens |
| `ai_analysis_feedback` | `game_id`, `feedback` ("up","down","report"), `reason` | Thumbs up/down on coach output |
| `ai_analysis_shared` | `game_id`, `channel` ("link","wa","tg","story") | Share button used |

### Puzzles
| Event | Properties | Trigger |
|---|---|---|
| `puzzle_viewed` | `puzzle_id`, `theme`, `difficulty` | Puzzle page opens |
| `puzzle_attempted` | `puzzle_id`, `correct` (bool), `attempts_used`, `time_taken_seconds` | User submits move |
| `puzzle_solved` | `puzzle_id`, `attempts_used`, `time_taken_seconds` | Correct on any attempt |
| `puzzle_skipped` | `puzzle_id` | "Skip" button |

### Monetization
| Event | Properties | Trigger |
|---|---|---|
| `paywall_shown` | `trigger_reason` ("analysis_limit","game_limit","puzzle_limit","manual"), `current_tier` | Modal opens |
| `paywall_dismissed` | `trigger_reason` | User closes paywall |
| `pricing_plan_clicked` | `plan` ("monthly","yearly","family") | User clicks a plan card |
| `checkout_started` | `plan`, `price_id` | Stripe Checkout opened |
| `checkout_completed` | `plan`, `price_id`, `amount_cents` | Stripe webhook returns success |
| `checkout_abandoned` | `plan`, `price_id` | User leaves checkout (Stripe redirect timeout or back) |
| `subscription_cancelled` | `at_period_end` (bool), `reason_if_provided` | Stripe webhook |
| `subscription_renewed` | `amount_cents` | Stripe webhook |
| `subscription_payment_failed` | `attempt_number` | Stripe webhook |

### Engagement / habit
| Event | Properties | Trigger |
|---|---|---|
| `app_opened` | `entry_path` | Authed session refresh |
| `streak_extended` | `streak_days` | Activity advances streak |
| `streak_broken` | `previous_length` | Activity in calendar day not present |
| `streak_freeze_used` | `streak_days_at_freeze` | Auto-applied for Pro user |
| `dashboard_viewed` | — | Dashboard mounts |
| `history_viewed` | — | History page mounts |
| `accessibility_toggled` | `enabled` (bool) | Toggle in settings |
| `theme_changed` | `theme` ("light","dark","system") | User changes theme |
| `language_changed` | `from`, `to` | User changes language in settings |

### Errors
| Event | Properties | Trigger |
|---|---|---|
| `error_engine` | `engine_state_hash`, `error_message` | Engine throws |
| `error_ai_coach` | `game_id`, `stage` ("call","parse","persist"), `error_message` | LLM call fails |
| `error_payment` | `stage`, `error_message`, `stripe_error_code` | Stripe error |

---

## Person properties (set on identify)

Set once on signup, update as state changes:

```ts
posthog.identify(user.id, {
  email: user.email,
  language: profile.language,
  level: profile.level,
  goal: profile.goal,
  subscription_tier: profile.subscription_tier,
  accessibility_mode: profile.accessibility_mode,
  signup_date: user.created_at,
  $set_once: {
    initial_referrer: document.referrer,
    initial_utm_source: utmSource,
  }
});
```

Update on subscription changes:
```ts
posthog.identify(user.id, {
  subscription_tier: newTier,
  subscription_status: newStatus,
});
```

---

## Dashboards to set up in PostHog

### Dashboard 1: "North Star + Funnels"
- WAU-coached (line chart, weekly, 12 weeks)
- Signup funnel (last 30d)
- Activation funnel (last 30d)
- Monetization funnel (last 30d)
- Retention curve (weekly cohorts)

### Dashboard 2: "Product Health"
- Games per active user (median, line)
- AI analyses per active user (median, line)
- Free→Pro conversion rate (line)
- Pro→Family upgrade rate (line)
- Churn rate (monthly, line)
- Avg AI Coach satisfaction (% thumbs up)
- AI Coach latency p50/p95 (line)
- AI Coach cost per analysis (line, $)

### Dashboard 3: "Acquisition"
- Signups by UTM source (stacked bar, daily)
- Signups by referrer (table)
- CAC by paid channel (computed)
- LP visit → signup rate by source

### Dashboard 4: "Engagement & Habit"
- Streak length distribution (histogram)
- % of users with streak ≥7 days
- % of users with streak ≥30 days
- Daily puzzle completion rate
- Accessibility mode adoption (%)

---

## Alerts (PostHog or external)

| Alert | Threshold | Action |
|---|---|---|
| AI Coach error rate | >5% in 1h | Page founder; check Fireworks status |
| Checkout completion rate | <60% in 24h | Investigate Stripe issues |
| D1 retention | <20% on rolling 7d | Triage onboarding |
| AI Coach cost | >$10/day | Verify rate limits + maybe model-switch |
| Engine error | any | Triage |
| Stripe webhook failure | any | Triage |

---

## "What does success look like in 8 weeks?"

End-of-week-8 numbers we'd be proud to put in a Demo Day pitch deck:

- ≥1,500 registered users
- ≥30 paying customers
- ≥$150 MRR
- AI Coach satisfaction ≥85% thumbs up
- D7 retention ≥22% (rolling 4-week)
- Free→Pro conversion ≥3%
- nFactorial '26 cohort visibility ✅
- At least 1 organic press mention (Telegram channel, KZ tech blog, Reddit post >500 upvotes)
- Public demo URL with public scoreboard / showcase positions

If we hit these, the trajectory to $1k MRR by month 6 is in line.
