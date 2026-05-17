import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveLocaleFromCookie } from "@/lib/i18n/server";
import { getAppTranslator } from "@/lib/i18n";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const locale = await resolveLocaleFromCookie();
  const { t } = getAppTranslator(locale);

  return (
    <>
      <nav className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-2 text-sm">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Sharpki
          </Link>
          <Link
            href="/leagues"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("leagues.title")}
          </Link>
          <Link
            href="/history"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            History
          </Link>
        </div>
      </nav>
      {children}
    </>
  );
}
