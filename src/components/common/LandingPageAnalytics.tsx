"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { posthog } from "@/lib/posthog/client";

export function LandingPageAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!posthog.__loaded) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    posthog.capture("lp_viewed", {
      path: pathname,
      referrer: document.referrer || undefined,
      utm_source: searchParams.get("utm_source") ?? undefined,
      utm_campaign: searchParams.get("utm_campaign") ?? undefined,
      utm_medium: searchParams.get("utm_medium") ?? undefined,
    });
  }, [pathname]);

  return null;
}
