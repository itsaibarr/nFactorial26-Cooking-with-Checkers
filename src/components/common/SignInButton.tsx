"use client";

import { Button } from "@/components/ui/button";
import { posthog } from "@/lib/posthog/client";
import { createClient } from "@/lib/supabase/client";

export function SignInButton({
  className,
  ctaLocation = "hero",
}: {
  className?: string;
  ctaLocation?: string;
}) {
  async function handleSignIn() {
    if (posthog.__loaded) {
      posthog.capture("cta_signup_clicked", { cta_location: ctaLocation });
      posthog.capture("signup_started", { method: "google" });
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error && posthog.__loaded) {
      posthog.captureException(error, {
        provider: "google",
        stage: "sign_in_with_oauth",
      });
    }
  }

  return (
    <Button size="lg" onClick={handleSignIn} className={className}>
      Войти через Google
    </Button>
  );
}
