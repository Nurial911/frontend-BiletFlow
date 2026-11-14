import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

// Bundle the actual TypeScript modules; tests need no browser or live backend.
const bundle = await build({ stdin: { contents: `
  export * as orders from './src/api/orders';
  export * as auth from './src/api/auth';
  export * as commerce from './src/api/commerce';
  export * as support from './src/api/support';
  export * as notifications from './src/api/notifications';
  export * as events from './src/api/events';
  export * as catalog from './src/lib/cities';
  export * as languageUtils from './src/lib/language';
  export * as pageLanguage from './src/i18n/translateText';
  export * as client from './src/api/client';
  export { startOrderPayment } from './src/lib/checkout';
  export { formatPrice, parseDate, formatLongDate, formatShortDate, weekdayShort } from './src/lib/format';
`, resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", write: false });
const { orders, auth, commerce, support, notifications, events, catalog, languageUtils, pageLanguage, client, startOrderPayment, formatPrice, parseDate, formatLongDate, formatShortDate, weekdayShort } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

let expected;
let requests;
let scripts;
let bankPayments;
const order = { id: 42, eventId: 7, status: "PENDING", totalAmount: 8000, attendeeName: "Алия", items: [] };
function request(path, method, body, response, status = 200) { expected.push({ path, method, body, response, status }); }

beforeEach(() => {
  expected = []; requests = []; scripts = []; bankPayments = [];
  const storage = new Map([["bf_token", "test-token"]]);
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  globalThis.fetch = async (path, options = {}) => {
    const next = expected.shift();
    requests.push(String(path));
    assert.ok(next, `Unexpected request: ${path}`);
    assert.equal(String(path), next.path);
    assert.equal(options.method ?? "GET", next.method);
    assert.equal(options.headers.Authorization, "Bearer test-token");
    assert.deepEqual(options.body === undefined ? undefined : JSON.parse(options.body), next.body);
    return new Response(next.response === undefined ? null : next.response instanceof Blob ? next.response : JSON.stringify(next.response), { status: next.status, headers: { "Content-Type": next.response instanceof Blob ? next.response.type : "application/json" } });
  };
  globalThis.window = { setTimeout, clearTimeout, halyk: { pay: payment => bankPayments.push(payment) } };
  globalThis.document = {
    createElement: () => ({ remove() {} }),
    head: { append: script => { scripts.push(script); queueMicrotask(() => script.onload()); } },
  };
});
afterEach(() => assert.equal(expected.length, 0, "All expected requests must have been made"));

test("checkout sends attendee name and the server promo code; quote never creates an order", async () => {
  const items = [{ ticketTypeId: 3, quantity: 2 }];
  request("/api/orders/quote", "POST", { eventId: 7, items, promoCode: "JAZZ2026" }, { subtotalAmount: 10000, discountAmount: 2000, totalAmount: 8000, promoCode: "JAZZ2026" });
  assert.equal((await orders.quoteOrder(7, items, "JAZZ2026")).totalAmount, 8000);
  request("/api/orders", "POST", { eventId: 7, items, attendeeName: "Алия", promoCode: "JAZZ2026" }, order, 201);
  assert.equal((await orders.createOrder(7, items, { attendeeName: "Алия", promoCode: "JAZZ2026" })).attendeeName, "Алия");
});
test("server discount amounts retain fractional tenge", () => {
  assert.equal(formatPrice(999.5), "999,5 ₸");
});
test("daily sales dates and event timestamps both use Kazakhstan time", () => {
  assert.equal(parseDate("2026-11-13").toISOString(), "2026-11-12T19:00:00.000Z");
  assert.match(formatLongDate("2026-11-13"), /13 ноября 2026/);
  assert.equal(parseDate("2026-11-13T12:30:00").toISOString(), "2026-11-13T07:30:00.000Z");
  assert.equal(parseDate("2026-11-13T12:30:00Z").toISOString(), "2026-11-13T12:30:00.000Z");
  assert.equal(parseDate("2026-11-13T12:30:00+05:00").toISOString(), "2026-11-13T07:30:00.000Z");
});

test("Halyk checkout launches the bank script without calling /pay", async () => {
  const session = { provider: "HALYK", simulated: true, scriptUrl: "https://bank.example/payment-test.js", payment: { invoiceId: "invoice-42" } };
  request("/api/orders/42/payment-session", "POST", undefined, session);
  let received;
  assert.equal(await startOrderPayment(order, value => { received = value; }), undefined);
  assert.deepEqual(received, session);
  assert.equal(scripts[0].src, session.scriptUrl);
  assert.deepEqual(bankPayments, [session.payment]);
  assert.deepEqual(requests, ["/api/orders/42/payment-session"]);
});

test("simulated checkout opens a session before paying and returns only backend status", async () => {
  request("/api/orders/42/payment-session", "POST", undefined, { provider: "SIMULATED", simulated: true, scriptUrl: null, payment: null });
  request("/api/orders/42/pay", "POST", undefined, { ...order, status: "PAID" });
  assert.equal((await startOrderPayment(order, () => {})).status, "PAID");
  assert.equal(bankPayments.length, 0);
});

test("free pending orders confirm without opening a bank session", async () => {
  request("/api/orders/42/pay", "POST", undefined, { ...order, totalAmount: 0, status: "PAID" });
  assert.equal((await startOrderPayment({ ...order, totalAmount: 0 }, () => assert.fail("No paid session for free orders"))).status, "PAID");
});

test("a declined payment preserves the error and can be retried", async () => {
  request("/api/orders/42/pay", "POST", { simulatedOutcome: "DECLINED" }, { message: "Bank declined" }, 402);
  await assert.rejects(orders.payOrder(42, "DECLINED"), error => error instanceof client.ApiError && error.status === 402 && error.message === "Bank declined");
  request("/api/orders/42/pay", "POST", undefined, { ...order, status: "PAID" });
  assert.equal((await orders.payOrder(42)).status, "PAID");
});

test("bank result comes from payment-check and may remain pending", async () => {
  request("/api/orders/42/payment-check", "POST", undefined, order);
  assert.equal((await orders.checkPayment(42)).status, "PENDING");
  request("/api/orders/42/payment-check", "POST", undefined, { ...order, status: "PAID" });
  assert.equal((await orders.checkPayment(42)).status, "PAID");
  request("/api/orders/42/payments", "GET", undefined, [{ status: "FAILED", failureReason: "Declined", simulated: true }]);
  assert.equal((await orders.getPayments(42))[0].failureReason, "Declined");
});

test("unknown providers and malformed bank sessions never fall back to simulated pay", async () => {
  for (const session of [{ provider: "OTHER" }, { provider: "HALYK", scriptUrl: "http://bank.example/x.js", payment: {} }, { provider: "HALYK", scriptUrl: null, payment: null }]) {
    request("/api/orders/42/payment-session", "POST", undefined, session);
    await assert.rejects(startOrderPayment(order, () => {}));
  }
  assert.equal(bankPayments.length, 0);
});

test("bank script loading failure is recoverable", async () => {
  document.head.append = script => queueMicrotask(() => script.onerror());
  const session = { provider: "HALYK", scriptUrl: "https://bank.example/retry.js", payment: {} };
  request("/api/orders/42/payment-session", "POST", undefined, session);
  await assert.rejects(startOrderPayment(order, () => {}), /Не удалось загрузить/);
  document.head.append = script => queueMicrotask(() => script.onload());
  request("/api/orders/42/payment-session", "POST", undefined, session);
  await startOrderPayment(order, () => {});
  assert.equal(bankPayments.length, 1);
});

test("PDF and campaign QR use authenticated binary responses", async () => {
  request("/api/tickets/5/pdf", "GET", undefined, new Blob(["%PDF-test"], { type: "application/pdf" }));
  assert.equal(await (await orders.getTicketPdf(5)).text(), "%PDF-test");
  request("/api/events/7/campaigns/2/qr", "GET", undefined, new Blob(["png"], { type: "image/png" }));
  assert.equal((await commerce.getCampaignQr(7, 2)).type, "image/png");
});

test("promo tokens are encoded, and campaign creation uses the backend enum and restrictions", async () => {
  request("/api/events/7/promo?token=opaque%2Btoken", "GET", undefined, { code: "JAZZ2026" });
  assert.equal((await commerce.previewPromo(7, "opaque+token", true)).code, "JAZZ2026");
  const body = { name: "Jazz", discountType: "PERCENT", discountValue: 20, maxRedemptions: 10, ticketTypeIds: [3] };
  request("/api/events/7/campaigns", "POST", body, { id: 2 });
  await commerce.createCampaign(7, body);
  request("/api/events/7/campaigns/2/disable", "POST", undefined, {});
  await commerce.setCampaignEnabled(7, 2, false);
});

test("auth email flows handle empty 204 responses and reset uses newPassword", async () => {
  request("/api/auth/forgot-password", "POST", { email: "unknown@example.com" }, undefined, 204);
  assert.equal(await auth.forgotPassword("unknown@example.com"), undefined);
  request("/api/auth/resend-verification", "POST", { email: "person@example.com" }, undefined, 204);
  await auth.resendVerification("person@example.com");
  request("/api/auth/verify-email", "POST", { token: "one-use-token" }, undefined, 204);
  await auth.verifyEmail("one-use-token");
  request("/api/auth/reset-password", "POST", { token: "reset-token", newPassword: "NewPassword123" }, undefined, 204);
  await auth.resetPassword("reset-token", "NewPassword123");
});

test("notifications use the unread field and support one/all read operations", async () => {
  request("/api/notifications/unread-count", "GET", undefined, { unread: 3 });
  assert.equal((await notifications.getUnreadCount()).unread, 3);
  request("/api/notifications/8/read", "POST", undefined, { id: 8 });
  await notifications.markNotificationRead(8);
  request("/api/notifications/read-all", "POST", undefined, undefined, 204);
  await notifications.markAllNotificationsRead();
});

test("support sends thread body, assignment, status and escalation in their exact shapes", async () => {
  const body = { type: "ATTENDEE", category: "PAYMENT", subject: "Payment issue", message: "Help", orderId: 42 };
  request("/api/support/cases", "POST", body, { supportCase: { id: 3 }, messages: [] }, 201);
  assert.equal((await support.openSupportCase(body)).supportCase.id, 3);
  request("/api/support/cases/3/messages", "POST", { body: "Reply" }, {});
  await support.replyToCase(3, "Reply");
  request("/api/support/cases/3/assign", "POST", { email: "staff@example.com" }, {});
  await support.assignCase(3, "staff@example.com");
  request("/api/support/cases/3/status", "POST", { status: "WAITING_FOR_CUSTOMER" }, {});
  await support.setCaseStatus(3, "WAITING_FOR_CUSTOMER");
  request("/api/support/cases/3/escalate", "POST", undefined, {});
  await support.escalateCase(3);
  request("/api/support/cases?page=1&size=20&status=OPEN&escalated=true", "GET", undefined, { content: [] });
  await support.getSupportCases("OPEN", true, 1);
});

test("paid-sales suspension is distinct from whole-event suspension; optional status is omitted", async () => {
  request("/api/admin/paid-sales-activations?page=0&size=20", "GET", undefined, { content: [] });
  await commerce.getActivations();
  request("/api/events/7/activation/suspend", "POST", { reason: "Review required" }, { status: "SUSPENDED" });
  assert.equal((await commerce.activationAction(7, "suspend", "Review required")).status, "SUSPENDED");
  request("/api/events/7/activation/unsuspend", "POST", undefined, { status: "ACTIVE" });
  await commerce.activationAction(7, "unsuspend");
});

test("payout and verification requests match organizer/admin contracts", async () => {
  const body = { bankName: "Bank", accountHolder: "Organizer", iban: "KZ123456789012345678" };
  request("/api/organizers/profile/payout-account", "PUT", body, { ibanLast4: "5678", simulated: true });
  assert.equal((await commerce.savePayoutAccount(body)).ibanLast4, "5678");
  request("/api/organizers/profile/verification", "POST", undefined, { verificationStatus: "PENDING" });
  await commerce.requestVerification();
  request("/api/organizers/4/verification", "POST", { approved: false, note: "Need information" }, {});
  await commerce.reviewVerification(4, false, "Need information");
});
test("event moderation sends the reason and preserves errors for a retry", async () => {
  request("/api/events/1/suspend", "POST", { reason: "Проверка мероприятия" }, { message: "Нет доступа" }, 403);
  await assert.rejects(events.setEventSuspended(1, true, "Проверка мероприятия"), error => error instanceof client.ApiError && error.status === 403 && error.message === "Нет доступа");
  request("/api/events/1/suspend", "POST", { reason: "Проверка мероприятия" }, { id: 1, suspended: true, suspensionReason: "Проверка мероприятия" });
  assert.equal((await events.setEventSuspended(1, true, "Проверка мероприятия")).suspended, true);
  request("/api/events/1/unsuspend", "POST", undefined, { id: 1, suspended: false });
  assert.equal((await events.setEventSuspended(1, false)).suspended, false);
});
test("city recognition handles venue address languages without guessing missing cities", () => {
  assert.equal(catalog.venueCity({ address: "Demo street 1, Astana" }), "astana");
  assert.equal(catalog.venueCity({ address: "г. Алматы, пр. Абая, 1" }), "almaty");
  assert.equal(catalog.venueCity({ address: "Қазақстан, Қарағанды" }), "karaganda");
  assert.equal(catalog.venueCity({ address: "Nur-Sultan, test street" }), "astana");
  assert.equal(catalog.venueCity({ address: "Almatyland street, unknown city" }), null);
  assert.equal(catalog.venueCity({ address: "тестовый адрес, 1" }), null);
  assert.equal(catalog.venueCity(undefined), null);
  assert.equal(catalog.cityLabel("astana", "en"), "Astana");
});
test("catalog links preserve combined filters and language without auth tokens", () => {
  const params = catalog.catalogParams(new URLSearchParams("city=astana&lang=kk&q=jazz&date=2027-12-10&category=Music&promo=campaign&token=secret&status=success"));
  assert.equal(params.get("city"), "astana");
  assert.equal(params.get("lang"), "kk");
  assert.equal(params.get("q"), "jazz");
  assert.equal(params.get("promo"), "campaign");
  assert.equal(params.has("token"), false);
  assert.equal(params.has("status"), false);
});
test("all home language dictionaries have translations and interpolate search text", () => {
  for (const language of ["ru", "kk", "en"]) {
    assert.ok(Object.values(languageUtils.translations[language]).every(value => typeof value === "string" && value.length > 0));
    assert.match(languageUtils.translate(language, "searchResults", { query: "Jazz" }), /Jazz/);
  }
  assert.equal(languageUtils.translate("en", "allCities"), "All cities");
  assert.equal(languageUtils.translate("kk", "allCities"), "Барлық қалалар");
});
test("Kazakh month and weekday names are independent of browser locale support", () => {
  assert.equal(formatShortDate("2026-11-13T18:00:00", "kk-KZ"), "13 қараша");
  assert.equal(formatLongDate("2026-11-13", "kk-KZ"), "13 қараша 2026");
  assert.equal(weekdayShort(parseDate("2026-11-13"), "kk-KZ"), "Жм");
  assert.equal(formatPrice(5000.5, "kk-KZ"), "5\u00a0000,5 ₸");
});
test("page translations preserve substitutions, whitespace and unknown server messages", () => {
  assert.equal(pageLanguage.translateText("en", "Добавить билет {0}", ["VIP"]), "Add a VIP ticket");
  assert.equal(pageLanguage.translateText("kk", " Итого: "), " Барлығы: ");
  assert.equal(pageLanguage.translateText("en", "Вместимость события не может превышать вместимость площадки (100)."), "Event capacity cannot exceed venue capacity (100).");
  assert.equal(pageLanguage.translateText("kk", "Event capacity cannot exceed venue capacity (100)."), "Іс-шара сыйымдылығы өтетін орын сыйымдылығынан (100) аспауы керек.");
  assert.equal(pageLanguage.translateText("kk", "Unrecognized server message"), "Unrecognized server message");
  assert.equal(pageLanguage.translateStatus("en", "PUBLISHED"), "Published");
  assert.equal(pageLanguage.translateStatus("kk", "VALID"), "Жарамды");
});
