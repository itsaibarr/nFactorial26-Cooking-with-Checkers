"use client";

import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { initPostHog, posthog } from "@/lib/posthog/client";
import { buildPostHogPersonProperties } from "@/lib/posthog/shared";
import { createClient } from "@/lib/supabase/client";
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

async function identifyUser(user: User) {
  if (!posthog.__loaded) {
    return;
  }

  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "accessibility_mode, goal, language, level, subscription_status, subscription_tier, theme",
    )
    .eq("id", user.id)
    .maybeSingle<PostHogProfile>();

  if (error) {
    posthog.captureException(error, { stage: "posthog_profile_sync" });
  }

  posthog.identify(
    user.id,
    buildPostHogPersonProperties(user, profile),
    document.referrer ? { initial_referrer: document.referrer } : undefined,
  );
}

/**
 * Initializes PostHog and keeps the identified user in sync with Supabase auth.
 * Wraps the whole app in src/app/layout.tsx.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();

    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error && posthog.__loaded) {
        posthog.captureException(error, { stage: "posthog_get_user" });
      }

      if (user) {
        void identifyUser(user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!posthog.__loaded) return;
      if (session?.user) {
        void identifyUser(session.user);
      } else {
        posthog.reset();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
