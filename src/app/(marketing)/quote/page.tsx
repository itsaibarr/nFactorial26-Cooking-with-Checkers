import Link from "next/link";
import { Fragment } from "react";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { getAppTranslator } from "@/lib/i18n";
import { resolveLocaleFromCookie } from "@/lib/i18n/server";

/**
 * Highlights substrings in a translated string by wrapping them in <span>.
 * Safe for Server Components — no functions in the output, only plain JSX.
 */
function RichText({
  text,
  highlight,
  highlights,
  className,
}: {
  text: string;
  highlight?: string;
  highlights?: Array<{ text: string; className: string }>;
  className?: string;
}) {
  if (highlight) {
    const idx = text.indexOf(highlight);
    if (idx === -1) return text;
    return (
      <Fragment>
        {idx > 0 ? text.slice(0, idx) : null}
        <span className={className}>{highlight}</span>
        {idx + highlight.length < text.length ? text.slice(idx + highlight.length) : null}
      </Fragment>
    );
  }

  if (highlights && highlights.length > 0) {
    let remaining = text;
    const parts: React.ReactNode[] = [];

    for (const h of highlights) {
      const idx = remaining.indexOf(h.text);
      if (idx === -1) continue;
      if (idx > 0) parts.push(remaining.slice(0, idx));
      parts.push(<span key={h.text} className={h.className}>{h.text}</span>);
      remaining = remaining.slice(idx + h.text.length);
    }

    if (remaining) parts.push(remaining);
    return <>{parts}</>;
  }

  return text;
}

export default async function QuotePage() {
  const locale = await resolveLocaleFromCookie();
  const { t } = getAppTranslator(locale);

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col px-6 py-12">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Sharpki
        </Link>
        <nav className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link
            href="/quote"
            className="rounded-full border border-border px-4 py-2 text-foreground transition-colors"
            aria-current="page"
          >
            {t("quote.navLabel")}
          </Link>
          <LanguageToggle locale={locale} />
        </nav>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center py-16">
        <article className="relative w-full max-w-2xl">
          {/* Decorative quote mark */}
          <span
            aria-hidden="true"
            className="absolute -top-8 -left-2 text-7xl font-serif leading-none text-primary/20 select-none sm:-top-10 sm:-left-4 sm:text-8xl"
          >
            &ldquo;
          </span>

          <blockquote className="space-y-6 text-lg leading-relaxed text-foreground sm:text-xl sm:leading-8">
            <p>
              <RichText
                text={t("quote.p1", { hours: "12" })}
                highlight="12"
                className="font-semibold text-primary"
              />
            </p>
            <p>
              <RichText
                text={t("quote.p2", { school: "Zerdeli School", prize: "200,000" })}
                highlights={[
                  { text: "Zerdeli School", className: "font-medium" },
                  { text: "200,000", className: "font-semibold text-primary" },
                ]}
              />
            </p>
            <p>
              <RichText
                text={t("quote.p3", { hours: "12" })}
                highlight="12"
                className="font-semibold text-primary"
              />
            </p>
          </blockquote>

          {/* Divider + attribution */}
          <div className="mt-10 flex items-center gap-4">
            <span className="h-px flex-1 bg-primary/30" />
            <span className="text-sm font-medium tracking-wide text-muted-foreground">
              {t("quote.attributionPrefix")}{" "}
              <a
                href="https://tryscout.study/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
              >
                Scout
              </a>
            </span>
            <span className="h-px flex-1 bg-primary/30" />
          </div>
        </article>
      </div>

      <footer className="text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Sharpki. Phase 1 &mdash; Foundation.
      </footer>
    </main>
  );
}
