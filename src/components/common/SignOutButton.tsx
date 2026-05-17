"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { posthog } from "@/lib/posthog/client";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      if (posthog.__loaded) {
        posthog.captureException(error, { stage: "sign_out" });
      }

      return;
    }

    if (posthog.__loaded) {
      posthog.capture("logout");
    }

    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleSignOut}>
      Выйти
    </Button>
  );
}
