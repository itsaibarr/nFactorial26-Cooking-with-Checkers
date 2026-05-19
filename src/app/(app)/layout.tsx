import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveLocaleFromCookie } from "@/lib/i18n/server";
import { BottomNav } from "@/components/common/BottomNav";

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
      <div className="pb-16 md:pb-0">{children}</div>
      <BottomNav locale={locale} />
    </>
  );
}
