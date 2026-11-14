import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { isLanguage, languageLocales, translate, type Language, type TranslationKey } from "../lib/language";
import { translateStatus, translateText } from "./translateText";

const STORAGE_KEY = "bf_language";
interface LanguageContextValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string>) => string;
  tx: (source: string | number | null | undefined, values?: readonly unknown[]) => string;
  statusLabel: (value?: string | null) => string;
}
const LanguageContext = createContext<LanguageContextValue>({ language: "ru", locale: "ru-RU", setLanguage: () => {}, t: (key, values) => translate("ru", key, values), tx: (source, values) => translateText("ru", source, values), statusLabel: value => translateStatus("ru", value) });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const urlLanguage = params.get("lang");
  const [savedLanguage, setSavedLanguage] = useState<Language>(() => {
    try { const stored = localStorage.getItem(STORAGE_KEY); return isLanguage(stored) ? stored : "ru"; }
    catch { return "ru"; }
  });
  const language = isLanguage(urlLanguage) ? urlLanguage : savedLanguage;
  useEffect(() => {
    setSavedLanguage(language);
    document.documentElement.lang = language;
    try { localStorage.setItem(STORAGE_KEY, language); } catch { /* Browsing without persistent storage still works. */ }
  }, [language]);
  const setLanguage = (nextLanguage: Language) => {
    setSavedLanguage(nextLanguage);
    setParams(current => { const next = new URLSearchParams(current); next.set("lang", nextLanguage); return next; }, { replace: true });
  };
  return <LanguageContext.Provider value={{ language, locale: languageLocales[language], setLanguage, t: (key, values) => translate(language, key, values), tx: (source, values) => translateText(language, source, values), statusLabel: value => translateStatus(language, value) }}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
