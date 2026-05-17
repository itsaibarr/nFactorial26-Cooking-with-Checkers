import { describe, expect, it } from "vitest";
import {
  buildPostHogPersonProperties,
  getPostHogDistinctIdFromCookie,
  getPostHogHost,
  getPostHogUiHost,
  isFirstSignIn,
} from "@/lib/posthog/shared";

describe("isFirstSignIn", () => {
  it("returns true when the first sign-in timestamps match", () => {
    expect(
      isFirstSignIn({
        created_at: "2026-05-17T09:00:00.000Z",
        last_sign_in_at: "2026-05-17T09:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("returns false when the last sign-in is later than account creation", () => {
    expect(
      isFirstSignIn({
        created_at: "2026-05-17T09:00:00.000Z",
        last_sign_in_at: "2026-05-17T10:00:00.000Z",
      }),
    ).toBe(false);
  });
});

describe("buildPostHogPersonProperties", () => {
  it("maps the supported profile fields for identify calls", () => {
    expect(
      buildPostHogPersonProperties(
        {
          created_at: "2026-05-17T09:00:00.000Z",
          email: "user@example.com",
        },
        {
          accessibility_mode: true,
          goal: "memory",
          language: "ru",
          level: "beginner",
          subscription_status: "active",
          subscription_tier: "pro",
          theme: "dark",
        },
      ),
    ).toMatchObject({
      accessibility_mode: true,
      email: "user@example.com",
      goal: "memory",
      language: "ru",
      level: "beginner",
      signup_date: "2026-05-17T09:00:00.000Z",
      subscription_status: "active",
      subscription_tier: "pro",
      theme: "dark",
    });
  });
});

describe("PostHog host helpers", () => {
  it("normalizes the ingest host", () => {
    expect(getPostHogHost("https://eu.i.posthog.com/")).toBe(
      "https://eu.i.posthog.com",
    );
  });

  it("maps the EU ingest host to the EU UI host", () => {
    expect(getPostHogUiHost("https://eu.i.posthog.com")).toBe(
      "https://eu.posthog.com",
    );
  });

  it("maps the US ingest host to the US UI host", () => {
    expect(getPostHogUiHost("https://us.i.posthog.com")).toBe(
      "https://us.posthog.com",
    );
  });
});

describe("getPostHogDistinctIdFromCookie", () => {
  it("extracts the distinct id from the PostHog cookie payload", () => {
    const payload = encodeURIComponent(
      JSON.stringify({ distinct_id: "user_123", session_id: "session_456" }),
    );

    expect(
      getPostHogDistinctIdFromCookie(
        `foo=bar; ph_phc_test_posthog=${payload}; theme=dark`,
      ),
    ).toBe("user_123");
  });

  it("returns undefined when the cookie payload cannot be parsed", () => {
    expect(
      getPostHogDistinctIdFromCookie("ph_phc_test_posthog=not-json"),
    ).toBeUndefined();
  });
});
