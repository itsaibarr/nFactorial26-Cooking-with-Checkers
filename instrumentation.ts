import { captureServerException } from "@/lib/posthog/server";
import { getPostHogDistinctIdFromCookie } from "@/lib/posthog/shared";

export function register() {}

export async function onRequestError(error: unknown, request: Request) {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    await captureServerException(
      error,
      getPostHogDistinctIdFromCookie(request.headers.get("cookie")),
      { path: new URL(request.url).pathname },
    );
  } catch {}
}
