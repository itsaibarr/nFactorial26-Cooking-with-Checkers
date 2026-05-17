import posthog from "posthog-js";

const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const uiHost = apiHost
  .replace("://eu.i.", "://eu.")
  .replace("://us.i.", "://us.");

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: uiHost,
    defaults: "2026-01-30",
    capture_pageview: "history_change",
    capture_exceptions: true,
    person_profiles: "identified_only",
    debug: process.env.NODE_ENV === "development",
  });
}
