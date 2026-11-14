import { useLanguage } from "../i18n/LanguageContext";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  const { tx } = useLanguage();
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-bold">{tx("Страница не найдена")}</h1>
      <Link to="/" className="mt-3 inline-block underline">
        {tx("На главную")}</Link>
    </div>
  );
}
