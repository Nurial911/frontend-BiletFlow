import { useLanguage } from "../i18n/LanguageContext";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button, buttonClass } from "../components/ui/Button";

export function RoleGuard({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { tx } = useLanguage();
  const { user, isLoggedIn, isUserLoading, userError, refetchUser, openLogin } = useAuth();

  if (!isLoggedIn) {
    return <AccessMessage title={tx("Войдите в аккаунт")} detail={tx("Для доступа к этому разделу нужно авторизоваться.")} action={<Button onClick={openLogin}>{tx("Войти")}</Button>} />;
  }
  if (isUserLoading || (!user && !userError)) {
    return <p className="rounded-xl bg-surface p-6 text-center text-sm">{tx("Проверяем аккаунт…")}</p>;
  }
  if (userError) {
    return <AccessMessage title={tx("Не удалось проверить аккаунт")} detail={userError instanceof Error ? tx(userError.message) : tx("Попробуйте ещё раз.")} action={<Button variant="secondary" onClick={refetchUser}>{tx("Повторить")}</Button>} />;
  }
  const role = user?.role.trim().toUpperCase().replace(/^ROLE_/, "");
  if (!role || !roles.includes(role)) {
    return <AccessMessage title={tx("Недостаточно прав")} detail={tx("Текущая роль: {0}.", [role ?? tx("не определена")])} action={<Link to="/" className={buttonClass("secondary")}>{tx("На главную")}</Link>} />;
  }
  return children;
}

function AccessMessage({ title, detail, action }: { title: string; detail: string; action: ReactNode }) {
  const { tx } = useLanguage();
  return <section className="mx-auto max-w-xl rounded-2xl border p-8 text-center"><h1 className="text-xl font-bold">{tx(title)}</h1><p className="mt-2 text-sm text-muted">{tx(detail)}</p><div className="mt-5">{action}</div></section>;
}
