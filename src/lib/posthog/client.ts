"use client";

import posthog from "posthog-js";

/**
 * Initialize the PostHog browser SDK once. Idempotent.
 * Phase 1 only sets up identify-on-auth — `posthog.capture` calls land in Phase 8.
 */
export function initPostHog() {
  if (typeof window === "undefined") return;
  if (posthog.__loaded) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return; // env not configured yet (e.g. local dev without keys); silently no-op

  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    capture_pageview: false,
    person_profiles: "identified_only",
  });
}

export { posthog };
