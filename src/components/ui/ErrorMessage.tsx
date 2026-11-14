import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "./Button";
import { useLanguage } from "../../i18n/LanguageContext";

// Shown when a request fails. If the server says "log in first", offer the login button.
export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { openLogin, isLoggedIn } = useAuth();
  const { t, tx } = useLanguage();
  const needsLogin = error instanceof ApiError && (error.status === 401 || error.status === 403) && !isLoggedIn;
  const message = error instanceof Error ? tx(error.message) : t("genericError");

  return (
    <div className="rounded-xl bg-surface p-6 text-center">
      <p className="text-sm">{needsLogin ? t("loginToSeeEvents") : message}</p>
      <div className="mt-4 flex justify-center gap-3">
        {needsLogin && <Button onClick={openLogin}>{t("login")}</Button>}
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            {t("retry")}
          </Button>
        )}
      </div>
    </div>
  );
}
