import { redirect } from "next/navigation";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { createClient } from "@/lib/supabase/server";
import { resolveLocaleFromCookie } from "@/lib/i18n/server";

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

  return (
    <>
      <div className="fixed top-3 right-4 z-50">
        <LanguageToggle locale={locale} />
      </div>
      {children}
    </>
  );
}
