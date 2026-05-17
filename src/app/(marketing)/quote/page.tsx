import Link from "next/link";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { getAppTranslator } from "@/lib/i18n";
import { resolveLocaleFromCookie } from "@/lib/i18n/server";

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
          <LanguageToggle locale={locale} />
          <Link
            href="/quote"
            className="rounded-full border border-border px-4 py-2 text-foreground transition-colors"
            aria-current="page"
          >
            {t("quote.navLabel")}
          </Link>
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
              {t.rich("quote.p1", {
                hours: () => (
                  <span className="font-semibold text-primary">12</span>
                ),
              })}
            </p>
            <p>
              {t.rich("quote.p2", {
                school: () => (
                  <span className="font-medium">
                    Zerda Late International School
                  </span>
                ),
                prize: () => (
                  <span className="font-semibold text-primary">2,200,000</span>
                ),
              })}
            </p>
            <p>
              {t.rich("quote.p3", {
                hours: () => (
                  <span className="font-semibold text-primary">12</span>
                ),
              })}
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
