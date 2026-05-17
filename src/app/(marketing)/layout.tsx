import { LanguageToggle } from "@/components/common/LanguageToggle";
import { getAppTranslator, resolveLocaleFromCookie } from "@/lib/i18n";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
