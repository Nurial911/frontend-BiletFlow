import type { PaymentSession } from "../api/commerce";
declare global {
  interface Window { halyk?: { pay: (payment: Record<string, unknown>) => void } }
}
let loading: Promise<void> | undefined;
let loadedUrl: string | undefined;
// Official payment-page URLs: https://epayment.kz/ru/docs/platezhnaya-stranica
const SCRIPT_URLS = new Set([
  "https://test-epay.epayment.kz/payform/payment-api.js",
  "https://epay.homebank.kz/payform/payment-api.js",
]);
export async function launchHalyk(session: PaymentSession) {
  if (!session.scriptUrl || !session.payment) throw new Error("Не удалось получить данные платёжной сессии.");
  const url = new URL(session.scriptUrl);
  if (!SCRIPT_URLS.has(url.href)) throw new Error("Адрес платёжного скрипта не разрешён.");
  if (!loading || loadedUrl !== url.href) {
    loadedUrl = url.href;
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url.href;
      script.async = true;
      const timeout = window.setTimeout(() => fail(), 20000);
      function fail() {
        window.clearTimeout(timeout);
        script.remove();
        loading = undefined;
        reject(new Error("Не удалось загрузить страницу банка. Попробуйте ещё раз."));
      }
      script.onload = () => { window.clearTimeout(timeout); resolve(); };
      script.onerror = fail;
      document.head.append(script);
    });
  }
  await loading;
  if (!window.halyk?.pay) {
    loading = undefined;
    throw new Error("Платёжный сервис банка недоступен. Попробуйте ещё раз.");
  }
  window.halyk.pay(session.payment);
}
