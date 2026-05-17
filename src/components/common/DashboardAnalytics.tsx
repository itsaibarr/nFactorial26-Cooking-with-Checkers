"use client";

import { useEffect } from "react";
import { posthog } from "@/lib/posthog/client";

export function DashboardAnalytics() {
  useEffect(() => {
    if (!posthog.__loaded) {
      return;
    }

    posthog.capture("app_opened", { entry_path: "/dashboard" });
    posthog.capture("dashboard_viewed");
  }, []);

  return null;
}
