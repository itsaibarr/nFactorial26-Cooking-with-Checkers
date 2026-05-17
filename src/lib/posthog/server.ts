import { PostHog } from "posthog-node";
import { getPostHogHost } from "@/lib/posthog/shared";

let posthogClient: PostHog | null = null;

function getPostHogKey() {
  return process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

export function getPostHogClient() {
  const posthogKey = getPostHogKey();
  if (!posthogKey) {
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(posthogKey, {
      host: getPostHogHost(),
      flushAt: 1,
      flushInterval: 0,
    });
    posthogClient.debug(process.env.NODE_ENV === "development");
  }

  return posthogClient;
}

export async function captureServerEvent({
  distinctId,
  event,
  properties,
}: {
  distinctId: string;
  event: string;
  properties?: Record<string, string | number | boolean | null | undefined>;
}) {
  const posthog = getPostHogClient();
  if (!posthog) {
    return;
  }

  await posthog.captureImmediate({
    distinctId,
    event,
    properties,
  });
}

export async function captureServerException(
  error: unknown,
  distinctId?: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
) {
  const posthog = getPostHogClient();
  if (!posthog) {
    return;
  }

  await posthog.captureExceptionImmediate(error, distinctId, properties);
}
