import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingPageAnalytics } from "@/components/common/LandingPageAnalytics";
import { SignInButton } from "@/components/common/SignInButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col px-6 py-12">
      <LandingPageAnalytics />

      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Sharpki
        </Link>
        <nav className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link
            href="#quote"
            className="rounded-full border border-border px-4 py-2 transition-colors hover:text-foreground"
          >
            Quote
          </Link>
        </nav>
      </header>

      <div className="flex flex-1 flex-col justify-between">
        <section className="flex flex-col gap-8 py-16">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Шашки с тренером‑ИИ.
            <br />
            <span className="text-primary">Для острого ума.</span>
          </h1>
          <p className="max-w-xl text-balance text-lg text-muted-foreground">
            Сыграйте партию против бота, получите тёплый разбор каждой ошибки от
            ИИ‑тренера. Когнитивная зарядка для взрослых 45+, по 10 минут в день.
          </p>
          {error === "auth" ? (
            <Alert variant="destructive" className="max-w-xl">
              <AlertTitle>Не удалось войти через Google</AlertTitle>
              <AlertDescription>
                Проверьте настройки Google OAuth в Supabase и попробуйте ещё раз.
              </AlertDescription>
            </Alert>
          ) : null}
          <div>
            <SignInButton />
            <p className="mt-3 text-sm text-muted-foreground">
              Бесплатно. Регистрация занимает 30 секунд.
            </p>
          </div>
        </section>

        <section
          id="quote"
          className="scroll-mt-24 rounded-3xl border border-border bg-muted/30 p-6 sm:p-8"
        >
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Quote
          </p>
          <blockquote className="mt-4 space-y-4 text-base leading-7 text-foreground sm:text-lg">
            <p>
              This project was actually built in about 12 hours of pure coding.
            </p>
            <p>
              I knew that you had sent me the email about proceeding to the
              second stage of the application process around two days ago, but
              during that time I was participating in an event from Zerda Late
              International School, where our team won 2,200,000.
            </p>
            <p>
              Because of that competition, I genuinely did not have enough time
              to build so much earlier. That is not an excuse — just context.
              Today, after we finished the event, I finally started executing
              the project, and I would simply like you to remember that it was
              built in roughly 12 hours.
            </p>
          </blockquote>
        </section>
      </div>

      <footer className="text-sm text-muted-foreground">
        © {new Date().getFullYear()} Sharpki. Phase 1 — Foundation.
      </footer>
    </main>
  );
}
