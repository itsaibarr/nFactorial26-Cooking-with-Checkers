"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppLocale } from "@/lib/i18n";

export function LanguageToggle({ locale }: { locale: AppLocale }) {
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
      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      aria-label={locale === "ru" ? "Switch to English" : "Переключить на русский"}
    >
      {locale === "ru" ? "EN" : "RU"}
    </button>
  );
}
