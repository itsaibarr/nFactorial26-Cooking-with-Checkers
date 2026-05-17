import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type PostHogProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "accessibility_mode"
  | "goal"
  | "language"
  | "level"
  | "subscription_status"
  | "subscription_tier"
  | "theme"
>;

export function getPostHogHost(
  host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
) {
  return host.replace(/\/$/, "");
}

export function getPostHogUiHost(host = getPostHogHost()) {
  return new URL(host).hostname.startsWith("eu.")
    ? "https://eu.posthog.com"
    : "https://us.posthog.com";
}

export function isFirstSignIn(
  user: Pick<User, "created_at" | "last_sign_in_at">,
) {
  if (!user.last_sign_in_at) {
    return true;
  }

  const createdAt = Date.parse(user.created_at);
  const lastSignInAt = Date.parse(user.last_sign_in_at);

  if (Number.isNaN(createdAt) || Number.isNaN(lastSignInAt)) {
    return false;
  }

  return Math.abs(lastSignInAt - createdAt) < 5_000;
}

export function buildPostHogPersonProperties(
  user: Pick<User, "created_at" | "email">,
  profile?: PostHogProfile | null,
) {
  const properties: Record<string, string | boolean> = {
    signup_date: user.created_at,
  };

  if (user.email) properties.email = user.email;
  if (profile?.language) properties.language = profile.language;
  if (profile?.level) properties.level = profile.level;
  if (profile?.goal) properties.goal = profile.goal;
  if (profile?.subscription_tier) {
    properties.subscription_tier = profile.subscription_tier;
  }
  if (profile?.subscription_status) {
    properties.subscription_status = profile.subscription_status;
  }
  if (typeof profile?.accessibility_mode === "boolean") {
    properties.accessibility_mode = profile.accessibility_mode;
  }
  if (profile?.theme) properties.theme = profile.theme;

  return properties;
}

export function getPostHogDistinctIdFromCookie(
  cookieHeader: string | null | undefined,
) {
  if (!cookieHeader) {
    return undefined;
  }

  const match = cookieHeader.match(/ph_phc_[^=]+=([^;]+)/);
  if (!match?.[1]) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as {
      distinct_id?: string;
    };

    return parsed.distinct_id;
  } catch {
    return undefined;
  }
}
