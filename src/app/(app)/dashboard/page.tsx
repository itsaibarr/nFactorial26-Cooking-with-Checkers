import { DashboardAnalytics } from "@/components/common/DashboardAnalytics";
import { SignOutButton } from "@/components/common/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // (app)/layout already redirects

  // Read the profile row that was auto-created by the handle_new_user trigger.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, current_sharpness, streak_days")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-6 py-12">
      <DashboardAnalytics />

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Sharpki</h1>
        <SignOutButton />
      </header>

      <section className="flex flex-col gap-2 rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Вы вошли как</p>
        <p className="font-medium">{profile?.display_name ?? user.email}</p>
        <p className="font-mono text-xs text-muted-foreground">{user.id}</p>
      </section>

      <section className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          Phase 1 — Foundation готов.
        </p>
        <p className="mt-2">
          Следующая фаза: движок русских шашек. Скоро вы сможете сыграть
          партию.
        </p>
      </section>
    </main>
  );
}
