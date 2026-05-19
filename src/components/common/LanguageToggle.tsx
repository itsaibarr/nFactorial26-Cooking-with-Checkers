"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppLocale } from "@/lib/i18n";

export function LanguageToggle({
  locale,
  label,
  ariaLabel,
}: {
  locale: AppLocale;
  label?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = locale === "ru" ? "en" : "ru";
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="min-h-[40px] rounded-full border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      aria-label={ariaLabel ?? (locale === "ru" ? "Switch to English" : "Переключить на русский")}
    >
      {label ?? (locale === "ru" ? "EN" : "RU")}
    </button>
  );
}
