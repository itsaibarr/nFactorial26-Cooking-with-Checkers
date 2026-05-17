import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingPageAnalytics } from "@/components/common/LandingPageAnalytics";
import { SignInButton } from "@/components/common/SignInButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";
import { getAppTranslator } from "@/lib/i18n";
import { resolveLocaleFromCookie } from "@/lib/i18n/server";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  const { error } = await searchParams;

  const locale = await resolveLocaleFromCookie();
  const { t } = getAppTranslator(locale);

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col px-6 py-12">
      <LandingPageAnalytics />

      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {t("landing.brand")}
        </Link>
        <nav className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link
            href="/quote"
            className="rounded-full border border-border px-4 py-2 transition-colors hover:text-foreground"
          >
            {t("landing.quoteNav")}
          </Link>
        </nav>
      </header>

      <div className="flex flex-1 flex-col justify-between">
        <section className="flex flex-col gap-8 py-16">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {t("landing.heroTitle1")}
            <br />
            <span className="text-primary">{t("landing.heroTitle2")}</span>
          </h1>
          <p className="max-w-xl text-balance text-lg text-muted-foreground">
            {t("landing.heroDescription")}
          </p>
          {error === "auth" ? (
            <Alert variant="destructive" className="max-w-xl">
              <AlertTitle>{t("landing.authErrorTitle")}</AlertTitle>
              <AlertDescription>
                {t("landing.authErrorDescription")}
              </AlertDescription>
            </Alert>
          ) : null}
          <div>
            <SignInButton />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("landing.freeNote")}
            </p>
          </div>
        </section>
      </div>

      <footer className="text-sm text-muted-foreground">
        {t("landing.footer", { year: new Date().getFullYear() })}
      </footer>
    </main>
  );
}
