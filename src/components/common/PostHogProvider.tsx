"use client";

import { useEffect } from "react";
import { initPostHog, posthog } from "@/lib/posthog/client";
import { createClient } from "@/lib/supabase/client";

/**
 * Initializes PostHog and keeps the identified user in sync with Supabase auth.
 * Wraps the whole app in src/app/layout.tsx.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();

    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && posthog.__loaded) {
        posthog.identify(user.id, { email: user.email ?? undefined });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!posthog.__loaded) return;
      if (session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email ?? undefined,
        });
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
