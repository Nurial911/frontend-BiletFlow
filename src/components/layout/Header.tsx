import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../ui/Button";
import { useQuery } from "@tanstack/react-query";
import { getUnreadCount } from "../../api/notifications";
import { useLanguage } from "../../i18n/LanguageContext";
import { catalogParams, cities } from "../../lib/cities";

// Grey top bar: logo, city, search, languages, login.
export function Header() {
  const { user, isLoggedIn, openLogin, logout } = useAuth();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const unread = useQuery({ queryKey: ["unread-notifications", user?.id], queryFn: getUnreadCount, enabled: isLoggedIn, refetchInterval: 30000 });

  // Keep the box in sync when the URL changes (e.g. back button)
  useEffect(() => setQuery(params.get("q") ?? ""), [params]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    updateSearch(query);
  };

  const updateSearch = (value: string) => {
    setQuery(value);
    const next = pathname === "/" ? catalogParams(params) : new URLSearchParams();
    next.set("lang", language);
    if (value.trim()) next.set("q", value);
    else next.delete("q");
    navigate(`/?${next}`, { replace: true });
  };
  const selectedCity = params.get("city") ?? "";
  const updateCity = (city: string) => {
    const next = pathname === "/" ? catalogParams(params) : new URLSearchParams();
    next.set("lang", language);
    if (city) next.set("city", city); else next.delete("city");
    navigate(`/?${next}`);
  };
  const role = user?.role.trim().toUpperCase().replace(/^ROLE_/, "");

  return (
    <header className="bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4">
        <Link to="/" className="text-xl font-bold">
          BiletFlow
        </Link>

        <label className="text-sm"><span className="sr-only">{t("city")}</span>
          <select value={cities.some(city => city.id === selectedCity) || selectedCity === "unknown" ? selectedCity : ""} onChange={e => updateCity(e.target.value)} className="max-w-48 rounded-lg border border-gray-400 bg-white px-2 py-2 text-sm">
            <option value="">{t("allCities")}</option>
            {cities.map(city => <option key={city.id} value={city.id}>{city[language]}</option>)}
            <option value="unknown">{t("unknownCity")}</option>
          </select>
        </label>

        <form onSubmit={onSearch} role="search" className="order-last w-full min-w-0 md:order-none md:min-w-[220px] md:flex-1">
          <label htmlFor="search" className="sr-only">
            {t("search")}
          </label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="block w-full min-w-0 rounded-lg border border-gray-400 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
          />
        </form>

        <div className="ml-auto flex flex-wrap items-center gap-4 md:ml-0">
          {isLoggedIn && <><Link to="/notifications" className="text-sm font-semibold">{t("notifications")}{unread.data && unread.data.unread > 0 ? ` (${unread.data.unread})` : ""}</Link><Link to="/support" className="text-sm font-semibold">{t("support")}</Link></>}
          {isLoggedIn && role === "ORGANIZER" && (
            <Link to="/organizer/events" className="whitespace-nowrap text-sm font-semibold hover:underline">
              {t("organizer")}
            </Link>
          )}
          {isLoggedIn && role && ["EVENT_ADMIN", "EVENT_STAFF", "CHECK_IN_STAFF"].includes(role) && (
            <Link to="/staff" className="whitespace-nowrap text-sm font-semibold hover:underline">{t("checkIn")}</Link>
          )}
          {isLoggedIn && role && ["PLATFORM_ADMIN", "ADMIN"].includes(role) && (
            <>
              <Link to="/admin/dashboard" className="whitespace-nowrap text-sm font-semibold hover:underline">{t("platform")}</Link>
              <Link to="/admin/users" className="whitespace-nowrap text-sm font-semibold hover:underline">{t("users")}</Link>
            </>
          )}
          {isLoggedIn && (
            <Link to="/account" className="whitespace-nowrap text-sm font-semibold hover:underline">{t("myTickets")}</Link>
          )}
          {isLoggedIn && (
            <Link to="/account/settings" className="whitespace-nowrap text-sm font-semibold hover:underline">{t("profile")}</Link>
          )}
          <div role="group" aria-label={t("language")} className="flex gap-1 text-xs">
            {([ ["kk", "KZ"], ["ru", "RU"], ["en", "ENG"] ] as const).map(([code, label]) => <button key={code} type="button" lang={code} aria-pressed={language === code} onClick={() => setLanguage(code)} className={`rounded px-2 py-1 ${language === code ? "bg-black font-bold text-white" : "text-muted hover:bg-gray-200"}`}>{label}</button>)}
          </div>

          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="max-w-40 truncate text-sm" title={user?.email}>
                {user?.email ?? "…"}
              </span>
              <Button variant="secondary" onClick={logout}>
                {t("logout")}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={openLogin} className="min-w-28 bg-gray-300">
              {t("login")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
