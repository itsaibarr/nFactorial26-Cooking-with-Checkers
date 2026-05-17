"use client";

import posthog from "posthog-js";
import { getPostHogUiHost } from "@/lib/posthog/shared";

/**
 * Initialize the PostHog browser SDK once as a fallback for auth-driven client sync.
 */
export function initPostHog() {
  if (typeof window === "undefined") return;
  if (posthog.__loaded) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return; // env not configured yet (e.g. local dev without keys); silently no-op

  posthog.init(key, {
    api_host: "/ingest",
    ui_host: getPostHogUiHost(),
    defaults: "2026-01-30",
    capture_pageview: "history_change",
    capture_exceptions: true,
    person_profiles: "identified_only",
  });
}

export { posthog };
