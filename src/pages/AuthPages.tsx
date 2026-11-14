import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { forgotPassword, resendVerification, resetPassword, verifyEmail } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { MutationError } from "../components/ui/AsyncState";
import { useLanguage } from "../i18n/LanguageContext";

export function EmailVerificationNotice() {
  
  const { user, refetchUser } = useAuth();
  const { t } = useLanguage();
  const [cooldown, setCooldown] = useState(false);
  const resend = useMutation({ mutationFn: () => resendVerification(user!.email), onSuccess: () => setCooldown(true) });
  useEffect(() => {
    if (!cooldown) return;
    const timeout = window.setTimeout(() => setCooldown(false), 60000);
    return () => window.clearTimeout(timeout);
  }, [cooldown]);
  if (!user || user.verificationStatus) return null;
  return <section className="my-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
    <p>{t("verifyNotice", { email: user.email })}</p>
    <div className="mt-2 flex flex-wrap gap-3"><Button variant="secondary" disabled={resend.isPending || cooldown} onClick={() => resend.mutate()}> {t("resendEmail")} </Button><button type="button" onClick={refetchUser} className="underline">{t("refreshStatus")}</button></div>
    {resend.isSuccess && <p role="status" className="mt-2">{t("emailSent")}</p>}
    <MutationError error={resend.error} />
  </section>;
}

export function AuthActionPage({ mode }: { mode: "forgot" | "reset" | "verify" }) {
  const { tx } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [token] = useState(params.get("token") ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validation, setValidation] = useState("");
  const { refetchUser, openLogin } = useAuth();
  const action = useMutation({
    mutationFn: () => mode === "verify" ? verifyEmail(token) : mode === "reset" ? resetPassword(token, password) : forgotPassword(email.trim()),
    onSuccess: () => {
      if (mode === "verify") refetchUser();
      if (mode !== "forgot") setParams({}, { replace: true });
      setPassword(""); setConfirmation("");
    },
  });
  const title = mode === "verify" ? tx("Подтверждение email") : mode === "reset" ? tx("Новый пароль") : tx("Восстановление пароля");
  const submit = (e: FormEvent) => {
    e.preventDefault(); setValidation("");
    if (mode === "reset" && password !== confirmation) { setValidation(tx("Пароли не совпадают.")); return; }
    action.mutate();
  };
  const missingToken = mode !== "forgot" && !token;
  return <section className="mx-auto max-w-md space-y-5 rounded-xl border p-6">
    <h1 className="text-2xl font-bold">{tx(title)}</h1>
    {missingToken ? <p role="alert">{tx("В ссылке нет токена. Откройте полную ссылку из письма или запросите новое письмо.")}</p> : action.isSuccess ? <div role="status" className="space-y-4">
      <p>{mode === "forgot" ? tx("Если для этого адреса существует аккаунт, письмо с инструкциями отправлено. Проверьте входящие и спам.") : mode === "verify" ? tx("Email подтверждён.") : tx("Пароль обновлён. Войдите с новым паролем.")}</p>
      <Button onClick={openLogin}>{tx("Войти")}</Button>
    </div> : <form onSubmit={submit} className="space-y-4">
      {mode === "forgot" && <label className="block text-sm">Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>}
      {mode === "reset" && <>
        <label className="block text-sm">{tx("Новый пароль")}<input type="password" minLength={6} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
        <label className="block text-sm">{tx("Повторите пароль")}<input type="password" minLength={6} required autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
      </>}
      {mode === "verify" && <p className="text-sm">{tx("Нажмите кнопку, чтобы подтвердить адрес электронной почты.")}</p>}
      {validation && <p role="alert" className="text-sm text-red-700">{tx(validation)}</p>}
      <MutationError error={action.error} />
      {action.error && mode !== "forgot" && <p className="text-sm text-muted">{tx("Ссылка могла истечь или уже использоваться. Запросите новую в профиле или на странице восстановления пароля.")}</p>}
      <Button type="submit" disabled={action.isPending}>{action.isPending ? tx("Подождите…") : mode === "verify" ? tx("Подтвердить email") : mode === "reset" ? tx("Сохранить пароль") : tx("Отправить инструкции")}</Button>
    </form>}
    <div className="flex flex-wrap gap-4 text-sm"><Link to="/" className="underline">{tx("На главную")}</Link><Link to="/account/settings" className="underline">{tx("Профиль")}</Link>{mode !== "forgot" && <Link to="/forgot-password" className="underline">{tx("Запросить сброс пароля")}</Link>}</div>
  </section>;
}
