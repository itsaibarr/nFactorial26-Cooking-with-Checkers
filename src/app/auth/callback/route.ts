import { NextResponse } from "next/server";
import { captureServerEvent, captureServerException } from "@/lib/posthog/server";
import { isFirstSignIn } from "@/lib/posthog/shared";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/dashboard";
  }

  if (next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) {
        await captureServerEvent({
          distinctId: data.user.id,
          event: isFirstSignIn(data.user)
            ? "signup_completed"
            : "login_completed",
          properties: { method: "google" },
        }).catch(() => undefined);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    await captureServerException(error, undefined, {
      stage: "auth_callback_exchange",
    }).catch(() => undefined);
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
