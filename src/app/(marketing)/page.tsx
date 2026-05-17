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
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-between px-6 py-12">
      <LandingPageAnalytics />

      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Sharpki
        </Link>
      </header>

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

      <footer className="text-sm text-muted-foreground">
        © {new Date().getFullYear()} Sharpki. Phase 1 — Foundation.
      </footer>
    </main>
  );
}
