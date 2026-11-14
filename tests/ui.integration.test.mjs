import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import ts from "typescript";

const outfile = path.resolve("node_modules/.cache/biletflow-ui-test.mjs");
await build({ stdin: { contents: `
  import React from 'react';
  import { renderToString } from 'react-dom/server';
  import { MemoryRouter } from 'react-router-dom';
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  import { AuthProvider } from './src/auth/AuthContext';
  import App from './src/App';
  import { EventSalesDetail } from './src/pages/OrganizerInsightsPage';
  import { EventSuspensionDialog } from './src/components/events/EventSuspensionDialog';
  export function renderSuspensionDialog(pending = false, error = null) {
    return renderToString(React.createElement(EventSuspensionDialog, { event: { id: 1, title: 'Free Java Workshop' }, pending, error, onConfirm() {}, onClose() {} }));
  }
  export function renderSalesDetail(sales) {
    return renderToString(React.createElement(EventSalesDetail, { sales }));
  }
  export function renderRoute(url, user, seeds = [], storedLanguage) {
    const storage = new Map(user ? [['bf_token', 'ui-test-token']] : []);
    if (storedLanguage) storage.set('bf_language', storedLanguage);
    globalThis.localStorage = { getItem: key => storage.get(key) ?? null };
    globalThis.sessionStorage = { getItem: () => null };
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    if (user) client.setQueryData(['me', 'ui-test-token'], user);
    for (const [key, value] of seeds) client.setQueryData(key, value);
    const html = renderToString(React.createElement(QueryClientProvider, { client },
      React.createElement(MemoryRouter, { initialEntries: [url] },
        React.createElement(AuthProvider, null, React.createElement(App)))));
    client.clear();
    return html;
  }
`, resolveDir: process.cwd() }, bundle: true, packages: "external", platform: "node", format: "esm", outfile });
const { renderRoute, renderSalesDetail, renderSuspensionDialog } = await import(pathToFileURL(outfile));
const attendee = { id: 2, email: "attendee@test.invalid", role: "ATTENDEE", verificationStatus: true };
const organizer = { ...attendee, id: 1, role: "ORGANIZER" };
const admin = { ...attendee, id: 9, role: "PLATFORM_ADMIN" };
const page = content => ({ content, totalPages: 1, number: 0 });
const order = { id: 42, eventId: 7, eventTitle: "Jazz", status: "PENDING", totalAmount: 8000, attendeeName: "Алия", items: [] };
const event = { id: 7, title: "Jazz", category: "MUSIC", status: "PUBLISHED", startTime: "2027-12-10T18:00:00", paidSalesActive: false };
const activation = { eventId: 7, eventTitle: "Jazz", status: "SUSPENDED", simulated: true, feeAmount: 5000, checklist: [{ key: "FEE_PAID", done: true }], readyToActivate: false, suspensionReason: "Проверка" };
const detail = { supportCase: { id: 3, subject: "Помощь с билетом", type: "ATTENDEE", category: "PAYMENT", status: "OPEN", requesterId: 2, eventId: 7 }, messages: [{ id: 1, authorName: "Алия", body: "Нет билета", fromStaff: false, createdAt: "2026-11-13T12:00:00" }] };

test("success return URL never renders pending backend order as paid", () => {
  const html = renderRoute("/orders/42/payment-result?status=success", attendee, [[["order", 42], order], [["order-payments", 42], []]]);
  assert.match(html, /Проверяем оплату/);
  assert.doesNotMatch(html, /Оплата подтверждена/);
  assert.match(html, /Алия/);
});
test("paid confirmation no longer claims every payment was simulated", () => {
  const html = renderRoute("/orders/42", attendee, [[["order", 42], { ...order, status: "PAID" }], [["order-payments", 42], []]]);
  assert.match(html, /Оплата подтверждена/);
  assert.doesNotMatch(html, /Симулированная оплата прошла успешно/);
  assert.doesNotMatch(html, />Оплатить заказ</);
});
test("PDF download and attendee name appear on the ticket", () => {
  const html = renderRoute("/account", attendee, [[["my-orders", 0], page([])], [["my-tickets", 0], page([{ id: 5, eventTitle: "Jazz", ticketTypeName: "Standard", status: "VALID", attendeeName: "Алия", attendeeEmail: attendee.email, orderId: 42 }])]]);
  assert.match(html, /Скачать билет PDF/);
  assert.match(html, /Алия/);
  assert.match(html, /support\/new\?ticketId=5/);
});
test("unactivated paid sales disable paid ticket choice while free tickets remain selectable", () => {
  const html = renderRoute("/events/7", attendee, [[["event", 7], event], [["ticket-types", 7], [{ id: 3, name: "Paid", price: 5000, available: 10, hidden: false }, { id: 4, name: "Free", price: 0, available: 10, hidden: false }]]]);
  assert.match(html, /Платные продажи ещё не активированы/);
  assert.match(html, /disabled="" aria-label="Добавить билет Paid"/);
  assert.doesNotMatch(html, /disabled="" aria-label="Добавить билет Free"/);
  assert.match(html, /Имя посетителя/);
  assert.match(html, /Промокод/);
});
test("requesters see a support thread without staff assignment, status or escalation controls", () => {
  const html = renderRoute("/support/3", attendee, [[["support-case", 2, 3], detail]]);
  assert.match(html, /Нет билета/);
  assert.match(html, /Ваш ответ/);
  assert.doesNotMatch(html, /Email исполнителя|Изменить статус|Передать платформе/);
});
test("organizer handling another person's case sees staff controls", () => {
  const html = renderRoute("/support/3", organizer, [[["support-case", 1, 3], detail]]);
  assert.match(html, /Email исполнителя/);
  assert.match(html, /Изменить статус/);
  assert.match(html, /Передать платформе/);
});
test("organizer requester of a platform case has no staff controls", () => {
  const html = renderRoute("/support/3", organizer, [[["support-case", 1, 3], { ...detail, supportCase: { ...detail.supportCase, type: "PLATFORM", requesterId: 1 } }]]);
  assert.doesNotMatch(html, /Email исполнителя|Изменить статус|Передать платформе/);
});
test("resolved support threads prevent staff replies until status changes", () => {
  const html = renderRoute("/support/3", organizer, [[["support-case", 1, 3], { ...detail, supportCase: { ...detail.supportCase, status: "RESOLVED" } }]]);
  assert.match(html, /сначала измените статус/);
  assert.doesNotMatch(html, /Ваш ответ/);
});
test("admin event list omits unsupported ticket and event editing actions", () => {
  const html = renderRoute("/admin/dashboard/events", admin, [[["organizer-events", "all", 0], page([event])]]);
  assert.doesNotMatch(html, /href="\/admin\/dashboard\/events\/7\/(edit|tickets)"/);
  assert.match(html, /href="\/admin\/dashboard\/events\/7\/staff"/);
});
test("organizers see campaigns and activation links for their event", () => {
  const html = renderRoute("/organizer/events", organizer, [[["organizer-profile", "ORGANIZER"], { userId: 1 }], [["organizer-events", 1, 0], page([event])]]);
  assert.match(html, /\/organizer\/events\/7\/campaigns/);
  assert.match(html, /\/organizer\/events\/7\/activation/);
});
test("admin activation moderation explicitly preserves free and already sold tickets", () => {
  const html = renderRoute("/admin/dashboard/activations", admin, [[["admin-activations", "", 0], page([activation])]]);
  assert.match(html, /Бесплатные и уже проданные билеты продолжают работать/);
  assert.match(html, /Возобновить платные продажи/);
  assert.doesNotMatch(html, /Принять условия/);
});
test("unverified profiles show the verification notice and reset links require a token", () => {
  const html = renderRoute("/reset-password", { ...attendee, verificationStatus: false });
  assert.match(html, /Подтвердите email/);
  assert.match(html, /В ссылке нет токена/);
  assert.doesNotMatch(html, /autoComplete="new-password"/);
});
test("attendee cannot open organizer or admin-only pages", () => {
  assert.match(renderRoute("/organizer/events/7/campaigns", attendee), /Нет доступа/);
  assert.match(renderRoute("/admin/dashboard/verification", attendee), /Недостаточно прав/);
});
test("sales details render populated LocalDate daily statistics without a blank page", () => {
  const html = renderSalesDetail({ revenue: 10000, paidOrders: 2, cancelledOrders: 0, expiredOrders: 0, discounts: 2000, netRevenue: 8000, processingFees: 200, estimatedPayout: 7800, salesByDay: [{ date: "2026-11-12", revenue: 5000, ticketsSold: 1 }, { date: "2026-11-13", revenue: 5000, ticketsSold: 1 }] });
  assert.match(html, /12 ноября 2026/);
  assert.match(html, /13 ноября 2026/);
  assert.match(html, /Продажи по дням/);
});
test("event suspension has an in-page reason form, length limit and explicit confirmation", () => {
  const html = renderSuspensionDialog();
  assert.match(html, /role="dialog"/);
  assert.match(html, /Free Java Workshop/);
  assert.match(html, /Причина приостановки/);
  assert.match(html, /required="" maxLength="500"/);
  assert.match(html, /disabled=""[^>]*>Подтвердить приостановку/);
  assert.match(html, /неоплаченные заказы отменятся/);
  assert.match(html, /Отмена/);
});
test("moderation failures stay visible in the dialog and pending submissions are disabled", () => {
  assert.match(renderSuspensionDialog(false, new Error("Сервер временно недоступен")), /role="alert"[^>]*>Сервер временно недоступен/);
  const pending = renderSuspensionDialog(true);
  assert.match(pending, /disabled=""[^>]*>Приостанавливаем/);
  assert.match(pending, /disabled=""[^>]*>Отмена/);
});
test("cancelled events cannot be suspended through the management page", () => {
  const html = renderRoute("/admin/dashboard/manage", admin, [[["organizer-events", "all", 0], page([{ ...event, status: "CANCELLED" }])]]);
  assert.match(html, /disabled="" title="Отменённое событие нельзя приостановить"/);
});
const catalogEvents = [
  { ...event, id: 7, title: "Astana jazz", venue: { name: "Hall A", address: "Demo street, Astana" } },
  { ...event, id: 8, title: "Almaty jazz", venue: { name: "Hall B", address: "Алматы, Абая 1" } },
  { ...event, id: 9, title: "Unspecified jazz", venue: { name: "Hall C", address: "тестовый адрес, 1" } },
];
const catalogSeeds = [[["events"], page(catalogEvents)], ...catalogEvents.map(item => [["ticket-types", item.id], [{ id: item.id, price: 5000, hidden: false }]])];
test("English and Kazakh home routes translate navigation, dates, categories and ticket labels", () => {
  const en = renderRoute("/?lang=en", null, catalogSeeds);
  assert.match(en, /Popular events/);
  assert.match(en, /Search events/);
  assert.match(en, /All cities/);
  assert.match(en, /Music/);
  assert.match(en, /December/);
  assert.match(en, /Buy tickets/);
  const kk = renderRoute("/?lang=kk", null, catalogSeeds);
  assert.match(kk, /Танымал іс-шаралар/);
  assert.match(kk, /Барлық қалалар/);
  assert.match(kk, /Бүгін/);
  assert.match(kk, /Билет сатып алу/);
  assert.match(kk, /желтоқсан/);
});
test("city, search, category and date filters combine and category links retain the city", () => {
  const html = renderRoute("/?city=astana&lang=en&q=astana&category=MUSIC&date=2027-12-10", null, catalogSeeds);
  assert.match(html, /Astana jazz/);
  assert.doesNotMatch(html, /Almaty jazz|Unspecified jazz/);
  assert.match(html, /city=astana/);
  assert.match(html, /Clear filters/);
  assert.match(html, /value="astana" selected=""/);
});
test("all cities includes unrecognized addresses and missing cities have their own filter", () => {
  const all = renderRoute("/?lang=en", null, catalogSeeds);
  assert.match(all, /Astana jazz/); assert.match(all, /Almaty jazz/); assert.match(all, /Unspecified jazz/);
  const unknown = renderRoute("/?city=unknown&lang=en", null, catalogSeeds);
  assert.match(unknown, /Unspecified jazz/);
  assert.doesNotMatch(unknown, /Astana jazz|Almaty jazz/);
  const empty = renderRoute("/?city=shymkent&lang=en", null, catalogSeeds);
  assert.match(empty, /No events found/);
  assert.doesNotMatch(empty, /Astana jazz|Almaty jazz|Unspecified jazz/);
});
test("saved language survives navigation and an explicit URL language overrides it", () => {
  assert.match(renderRoute("/", null, catalogSeeds, "en"), /Popular events/);
  assert.match(renderRoute("/?lang=ru", null, catalogSeeds, "en"), /Популярные события/);
});

const translatedPageSeeds = [
  [["event", 7], { ...event, description: "Авторское описание события", capacity: 100, venue: { id: 1, name: "Original venue", address: "Astana", capacity: 100 } }],
  [["ticket-types", 7], [{ id: 3, eventId: 7, name: "Авторский билет", description: "Авторское описание билета", price: 5000, available: 10, sold: 0, quantity: 10, hidden: false }]],
  [["order", 42], order], [["order-payments", 42], []],
  [["my-orders", 0], page([])], [["my-tickets", 0], page([{ id: 5, eventTitle: "Название события", ticketTypeName: "Название билета", status: "VALID", attendeeName: "Имя посетителя", orderId: 42 }])],
  [["organizer-profile"], { id: 4, userId: 1, verificationStatus: "UNVERIFIED", contactInformation: "Original contact" }],
  [["organizer-profile", "ORGANIZER"], { id: 4, userId: 1 }], [["payout-account"], null],
  [["organizer-events", 1, 0], page([event])], [["organizer-events", "all", 0], page([event])],
  [["venues"], page([{ id: 1, name: "Original venue", address: "Astana", capacity: 100 }])],
  [["support-cases", 2, "", false, 0], page([])], [["support-cases", 9, "", true, 0], page([])],
  [["support-case", 2, 3], detail], [["support-case", 1, 3], detail],
  [["notifications", 2, 0], page([])], [["assigned-events"], page([])], [["admin-users", 0], page([])], [["admin-events"], page([])],
  [["event-staff", 7], []], [["admin-sales-events", 0], page([event])], [["campaigns", 7], []],
  [["activation", 7], activation], [["admin-activations", "", 0], page([activation])], [["verification-requests", 0], page([])],
  [["organizer-sales-summary"], { events: [], totals: {} }],
];
const translatedPages = [
  ["/events/7", attendee, "About the event", "Іс-шара туралы"],
  ["/orders/42", attendee, "Order confirmation", "Тапсырысты растау"],
  ["/orders/42/payment-result", attendee, "Checking payment.", "Төлем тексерілуде."],
  ["/account", attendee, "My orders", "Менің тапсырыстарым"],
  ["/account/settings", attendee, "Profile and account settings", "Профиль және аккаунт баптаулары"],
  ["/account/settings", organizer, "Organizer verification and payout details", "Ұйымдастырушыны растау және төлем деректемелері"],
  ["/forgot-password", null, "Password recovery", "Құпиясөзді қалпына келтіру"],
  ["/reset-password?token=demo", null, "New password", "Жаңа құпиясөз"],
  ["/verify-email?token=demo", null, "Email verification", "Email растау"],
  ["/notifications", attendee, "No notifications yet.", "Әзірге хабарландыру жоқ."],
  ["/support", attendee, "Create case", "Өтініш жасау"],
  ["/support/new?eventId=7", attendee, "New support case", "Жаңа қолдау өтініші"],
  ["/support/3", attendee, "Your reply", "Сіздің жауабыңыз"],
  ["/support/3", organizer, "Assignee email", "Жауапты қызметкердің email мекенжайы"],
  ["/staff", organizer, "Event check-in", "Іс-шараға кіруді тексеру"],
  ["/organizer/events", organizer, "My events", "Менің іс-шараларым"],
  ["/organizer/create", organizer, "Create event", "Іс-шара жасау"],
  ["/organizer/events/7/edit", organizer, "Edit event", "Іс-шараны өзгерту"],
  ["/organizer/events/7/tickets", organizer, "Ticket types", "Жасалған билет түрлері"],
  ["/organizer/events/7/staff", organizer, "Event staff", "Іс-шара қызметкерлері"],
  ["/organizer/events/7/campaigns", organizer, "Create campaign", "Науқан жасау"],
  ["/organizer/events/7/activation", organizer, "Paid-sales activation", "Ақылы сатылымды белсендіру"],
  ["/organizer/manage", organizer, "Event management", "Іс-шараларды басқару"],
  ["/organizer/sales", organizer, "Event sales", "Іс-шара сатылымдары"],
  ["/admin/users", admin, "Platform users", "Платформа пайдаланушылары"],
  ["/admin/dashboard/events", admin, "All platform events", "Платформаның барлық іс-шаралары"],
  ["/admin/dashboard/manage", admin, "Event management", "Іс-шараларды басқару"],
  ["/admin/dashboard/sales", admin, "Sales and orders by event", "Іс-шара бойынша сатылымдар мен тапсырыстар"],
  ["/admin/dashboard/verification", admin, "Organizer verification requests", "Ұйымдастырушылардың өтінімдері"],
  ["/admin/dashboard/activations", admin, "Paid sales", "Ақылы сатылым"],
  ["/admin/dashboard/support", admin, "Escalated cases", "Платформаға берілген өтініштер"],
  ["/missing-page", null, "Page not found", "Бет табылмады"],
];
for (const [url, user, en, kk] of translatedPages) {
  test(`English and Kazakh content on ${url} (${user?.role ?? "guest"})`, () => {
    for (const [language, expected] of [["en", en], ["kk", kk]]) {
      const params = new URL(url, "http://test.invalid"); params.searchParams.set("lang", language);
      const html = renderRoute(params.pathname + params.search, user, translatedPageSeeds);
      assert.ok(html.includes(expected), `Missing ${language} text: ${expected}`);
    }
  });
}
test("event localization keeps organizer content, attendee names and ticket names unchanged", () => {
  const html = renderRoute("/events/7?lang=en", attendee, translatedPageSeeds);
  assert.match(html, /Авторское описание события/);
  assert.match(html, /Авторский билет/);
  assert.match(html, /Attendee name/);
  const tickets = renderRoute("/account?lang=kk", attendee, translatedPageSeeds);
  assert.match(tickets, /Имя посетителя/);
  assert.match(tickets, /Жарамды/);
});
test("translated support statuses retain raw API enum values in form controls", () => {
  const html = renderRoute("/support/3?lang=en", organizer, translatedPageSeeds);
  assert.match(html, /value="OPEN" selected=""/);
  assert.match(html, />Open<\/option>/);
  assert.match(html, /value="WAITING_FOR_CUSTOMER"/);
  assert.doesNotMatch(html, /value="Open"/);
});
test("every static page phrase has English and Kazakh translations", () => {
  const messages = JSON.parse(fs.readFileSync("src/i18n/messages.json", "utf8"));
  for (const root of ["src/pages", "src/components"]) {
    for (const name of fs.readdirSync(root, { recursive: true }).filter(name => name.endsWith(".tsx"))) {
      const file = path.join(root, name);
      const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node) {
        if (ts.isCallExpression(node) && node.expression.getText(source) === "tx" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
          const key = node.arguments[0].text.trim().replace(/\s+/g, " ");
          assert.equal(messages[key]?.length, 2, `Missing translation in ${file}: ${key}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
});
