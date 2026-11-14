import { Link, useLocation, useSearchParams } from "react-router-dom";
import { usePublicEvents } from "../../hooks/useEvents";
import { categoryLabel } from "../../lib/format";
import { useLanguage } from "../../i18n/LanguageContext";
import { catalogParams } from "../../lib/cities";

// Category menu (Кино, Театры, Концерты…).
// The backend has no list of categories yet, so we show the categories
// that the loaded events actually have.
export function CategoryNav() {
  const { data: events } = usePublicEvents();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const active = params.get("category");
  const { t, locale } = useLanguage();
  const categoryUrl = (category?: string) => {
    const next = catalogParams(params);
    if (category) next.set("category", category); else next.delete("category");
    return `/?${next}`;
  };

  if (pathname.startsWith("/organizer")) return null;

  const categories = Array.from(new Set((events ?? []).map((e) => e.category).filter(Boolean)));
  if (categories.length === 0) return null;

  const link = (to: string, label: string, isActive: boolean) => (
    <Link
      key={to}
      to={to}
      aria-current={isActive ? "page" : undefined}
      className={`whitespace-nowrap py-2 text-sm ${isActive ? "border-b-2 border-black font-semibold" : "hover:underline"}`}
    >
      {label}
    </Link>
  );

  return (
    <nav aria-label={t("categories")} className="border-b">
      <div className="mx-auto flex max-w-6xl gap-8 overflow-x-auto px-4">
        {link(categoryUrl(), t("all"), !active)}
        {categories.map((c) => link(categoryUrl(c), categoryLabel(c, locale), active === c))}
      </div>
    </nav>
  );
}
