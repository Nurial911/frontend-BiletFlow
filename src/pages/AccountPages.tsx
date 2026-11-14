import { useLanguage } from "../i18n/LanguageContext";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAssignedEvents,
  getEventAttendees,
  getEventCheckInStats,
  scanEventTicket,
  undoEventCheckIn,
} from "../api/checkIn";
import { cancelOrder, getMyOrders, getMyTickets, getTicketQr, getTicketPdf } from "../api/orders";
import { downloadBlob } from "../lib/download";
import { OrganizerProfileSettings } from "./CommercePages";
import { getEvents, getOrganizerProfile, setEventSuspended } from "../api/events";
import {
  changeUserRole,
  deleteMyAccount,
  deleteUser,
  getUsers,
  updateMyCredentials,
  updateUser,
  type UpdateUserRequest,
} from "../api/users";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { EventSuspensionDialog } from "../components/events/EventSuspensionDialog";
import { formatPrice, formatLongDate, formatDateTime } from "../lib/format";
import type { Order, Ticket, User } from "../api/types";

const PAGE_SIZE = 20;

export function MyAccountPage() {
  const { tx } = useLanguage();
  const { isLoggedIn, openLogin } = useAuth();
  const queryClient = useQueryClient();
  const [ordersPage, setOrdersPage] = useState(0);
  const [ticketsPage, setTicketsPage] = useState(0);
  const orders = useQuery({
    queryKey: ["my-orders", ordersPage],
    queryFn: () => getMyOrders(ordersPage, PAGE_SIZE),
    enabled: isLoggedIn,
  });
  const tickets = useQuery({
    queryKey: ["my-tickets", ticketsPage],
    queryFn: () => getMyTickets(ticketsPage, PAGE_SIZE),
    enabled: isLoggedIn,
  });
  const cancel = useMutation({
    mutationFn: (orderId: number) => cancelOrder(orderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
  });

  if (!isLoggedIn) {
    return <AccessPanel title={tx("Войдите в аккаунт")} detail={tx("Для просмотра заказов и билетов нужно войти.")} action={<Button onClick={openLogin}>{tx("Войти")}</Button>} />;
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{tx("Мои заказы")}</h1>
          <Link to="/account/settings" className="text-sm font-semibold underline">{tx("Настройки аккаунта")}</Link>
        </div>
        {orders.error ? <ErrorPanel error={orders.error} retry={() => { void orders.refetch(); }} /> : orders.isLoading ? <Loading /> : (
          <>
            {(orders.data?.content ?? []).length === 0 ? <Empty text={tx("У вас пока нет заказов.")} /> : (
              <div className="mt-4 space-y-3">
                {(orders.data?.content ?? []).map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    pending={cancel.isPending}
                    error={cancel.variables === order.id ? cancel.error : null}
                    onCancel={() => {
                      if (window.confirm(tx("Отменить заказ №{0}?", [order.id]))) cancel.mutate(order.id);
                    }}
                  />
                ))}
              </div>
            )}
            <Pagination page={ordersPage} totalPages={orders.data?.totalPages ?? 0} onChange={setOrdersPage} />
          </>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold">{tx("Мои билеты")}</h2>
        {tickets.error ? <ErrorPanel error={tickets.error} retry={() => { void tickets.refetch(); }} /> : tickets.isLoading ? <Loading /> : (
          <>
            {(tickets.data?.content ?? []).length === 0 ? <Empty text={tx("Билеты не найдены.")} /> : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(tickets.data?.content ?? []).map((ticket) => <MyTicketCard key={ticket.id} ticket={ticket} />)}
              </div>
            )}
            <Pagination page={ticketsPage} totalPages={tickets.data?.totalPages ?? 0} onChange={setTicketsPage} />
          </>
        )}
      </section>
    </div>
  );
}

export function AccountSettingsPage() {
  const { tx, locale, statusLabel } = useLanguage();
  const { user, isLoggedIn, openLogin, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = user?.role.trim().toUpperCase().replace(/^ROLE_/, "") ?? "";
  const organizerProfile = useQuery({
    queryKey: ["organizer-profile"],
    queryFn: getOrganizerProfile,
    enabled: isLoggedIn && role === "ORGANIZER",
  });
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [formError, setFormError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const updateCredentials = useMutation({
    mutationFn: (request: UpdateUserRequest) => updateMyCredentials(request),
    onSuccess: async (updatedUser) => {
      queryClient.setQueriesData<User>({ queryKey: ["me"] }, updatedUser);
      setEmail(updatedUser.email);
      setPassword("");
      setPasswordConfirmation("");
      setFormError("");
    },
  });
  const deleteAccount = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["my-orders"] });
      queryClient.removeQueries({ queryKey: ["my-tickets"] });
      queryClient.removeQueries({ queryKey: ["ticket-qr"] });
      logout();
      navigate("/");
    },
  });

  if (!isLoggedIn) {
    return <AccessPanel title={tx("Войдите в аккаунт")} detail={tx("Для изменения настроек нужно войти.")} action={<Button onClick={openLogin}>{tx("Войти")}</Button>} />;
  }

  const submitCredentials = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setFormError(tx("Введите корректный email."));
      return;
    }
    if (password && password.length < 6) {
      setFormError(tx("Новый пароль должен содержать не менее 6 символов."));
      return;
    }
    if (password !== passwordConfirmation) {
      setFormError(tx("Подтверждение пароля не совпадает."));
      return;
    }

    const request: UpdateUserRequest = {};
    if (normalizedEmail !== user?.email) request.email = normalizedEmail;
    if (password) request.password = password;
    if (!request.email && !request.password) {
      setFormError(tx("Изменений нет."));
      return;
    }
    updateCredentials.mutate(request);
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/account" className="text-sm underline">{tx("← К заказам и билетам")}</Link>
        <h1 className="mt-2 text-2xl font-bold">{tx("Профиль и настройки аккаунта")}</h1>
        <p className="mt-1 text-sm text-muted">{tx("Данные аккаунта, тип доступа и настройки входа.")}</p>
      </div>

      <section className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">{tx("Данные аккаунта")}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">{tx("ID аккаунта")}</dt>
            <dd className="mt-1 font-medium">{user?.id ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{tx("Email для входа")}</dt>
            <dd className="mt-1 break-all font-medium">{user?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{tx("Тип аккаунта")}</dt>
            <dd className="mt-1 font-medium">{statusLabel(role)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{tx("Статус верификации")}</dt>
            <dd className="mt-1 font-medium">{user?.verificationStatus ? tx("Подтверждён") : tx("Не подтверждён")}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{tx("Дата регистрации")}</dt>
            <dd className="mt-1 font-medium">
              {user?.createdAt ? formatLongDate(user.createdAt, locale) : "—"}
            </dd>
          </div>
          {role === "ORGANIZER" && organizerProfile.data && (
            <>
              <div>
                <dt className="text-sm text-muted">{tx("Контакт организатора")}</dt>
                <dd className="mt-1 break-words font-medium">{organizerProfile.data.contactInformation || tx("Не указан")}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{tx("Верификация организатора")}</dt>
                <dd className="mt-1 font-medium">{statusLabel(organizerProfile.data.verificationStatus)}</dd>
              </div>
            </>
          )}
        </dl>
        {role === "ORGANIZER" && organizerProfile.isLoading && (
          <p className="mt-4 text-sm text-muted">{tx("Загружаем данные профиля организатора…")}</p>
        )}
        {role === "ORGANIZER" && organizerProfile.error && (
          <div className="mt-4">
            <ApiErrorMessage error={organizerProfile.error} />
            <Button variant="secondary" className="mt-2" onClick={() => { void organizerProfile.refetch(); }}>
              {tx("Повторить загрузку")}</Button>
          </div>
        )}
      </section>

      {role === "ORGANIZER" && <OrganizerProfileSettings />}
      <section className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">{tx("Разделы для вашего аккаунта")}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {role === "ORGANIZER" && (
            <>
              <Link to="/organizer/events" className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold hover:bg-gray-200">
                {tx("Кабинет организатора")}</Link>
              <Link to="/organizer/sales" className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold hover:bg-gray-200">
                {tx("Продажи и заказы")}</Link>
            </>
          )}
          {["PLATFORM_ADMIN", "ADMIN"].includes(role) && (
            <>
              <Link to="/admin/dashboard" className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold hover:bg-gray-200">
                {tx("Панель платформы")}</Link>
              <Link to="/admin/users" className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold hover:bg-gray-200">
                {tx("Управление пользователями")}</Link>
            </>
          )}
          {["EVENT_ADMIN", "EVENT_STAFF", "CHECK_IN_STAFF"].includes(role) && (
            <Link to="/staff" className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold hover:bg-gray-200">
              {tx("Check-in мероприятий")}</Link>
          )}
          <Link to="/account" className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold hover:bg-gray-200">
            {tx("Мои заказы и билеты")}</Link>
        </div>
      </section>

      <form onSubmit={submitCredentials} className="space-y-4 rounded-xl border p-5">
        <div>
          <h2 className="text-lg font-semibold">{tx("Email и пароль")}</h2>
          <p className="mt-1 text-sm text-muted">{tx("Измените email для входа или задайте новый пароль.")}</p>
        </div>
        <label className="block space-y-1.5 text-sm font-medium">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          <span>{tx("Новый пароль ")}<span className="font-normal text-muted">{tx("(оставьте пустым, чтобы не менять)")}</span></span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        {password && (
          <label className="block space-y-1.5 text-sm font-medium">
            <span>{tx("Повторите новый пароль")}</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
        )}
        {(formError || updateCredentials.error) && (
          <ApiErrorMessage error={formError || updateCredentials.error} />
        )}
        {updateCredentials.isSuccess && (
          <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">{tx("Данные аккаунта обновлены.")}</p>
        )}
        <Button type="submit" disabled={updateCredentials.isPending}>
          {updateCredentials.isPending ? tx("Сохраняем…") : tx("Сохранить изменения")}
        </Button>
      </form>

      <section className="rounded-xl border border-red-200 p-5">
        <h2 className="font-semibold text-red-800">{tx("Удаление аккаунта")}</h2>
        <p className="mt-2 text-sm text-muted">
          {tx("Удаление необратимо. Доступ к заказам и билетам аккаунта будет потерян.")}</p>
        {deleteAccount.error && <ApiErrorMessage error={deleteAccount.error} />}
        <Button variant="secondary" className="mt-4 text-red-800" onClick={() => setShowDeleteDialog(true)}>
          {tx("Удалить аккаунт")}</Button>
      </section>

      <Modal
        open={showDeleteDialog}
        onClose={() => {
          if (!deleteAccount.isPending) {
            setShowDeleteDialog(false);
            setDeleteConfirmation("");
          }
        }}
        title={tx("Подтвердите удаление аккаунта")}
      >
        <h2 className="text-xl font-bold">{tx("Удалить аккаунт без возможности восстановления?")}</h2>
        <p className="mt-3 text-sm text-muted">
          {tx("Это действие завершит сессию и удалит аккаунт. Для подтверждения введите слово УДАЛИТЬ.")}</p>
        <input
          autoComplete="off"
          value={deleteConfirmation}
          onChange={(event) => setDeleteConfirmation(event.target.value)}
          className="mt-4 w-full rounded-lg border px-3 py-2 text-sm"
          aria-label={tx("Введите УДАЛИТЬ для подтверждения")}
        />
        {deleteAccount.error && <ApiErrorMessage error={deleteAccount.error} />}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={deleteAccount.isPending}
            onClick={() => {
              setShowDeleteDialog(false);
              setDeleteConfirmation("");
            }}
          >
            {tx("Не удалять")}</Button>
          <Button
            disabled={deleteConfirmation !== tx("УДАЛИТЬ") || deleteAccount.isPending}
            onClick={() => deleteAccount.mutate()}
            className="bg-red-700"
          >
            {deleteAccount.isPending ? tx("Удаляем…") : tx("Удалить аккаунт")}
          </Button>
        </div>
      </Modal>
    </section>
  );
}

function OrderCard({ order, pending, error, onCancel }: { order: Order; pending: boolean; error: unknown; onCancel: () => void }) {
  const { tx, locale, statusLabel } = useLanguage();
  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{order.eventTitle}</h3>
          <p className="mt-1 text-xs text-muted">{tx("Заказ №")}{order.id} · {formatDateTime(order.createdAt, locale)}</p>
        </div>
        <strong>{formatPrice(order.totalAmount, locale)}</strong>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-muted">
        {order.items.map((item) => <li key={item.ticketTypeId}>{item.ticketTypeName} × {item.quantity}</li>)}
      </ul>
      <p className="mt-3 text-sm">{tx("Статус: ")}{statusLabel(order.status)}</p>
      <Link to={`/orders/${order.id}`} className="mt-3 inline-block text-sm font-semibold underline">{tx("Открыть заказ")}</Link>
      {order.status === "PENDING" && <Button variant="secondary" className="ml-3" disabled={pending} onClick={onCancel}>{tx("Отменить заказ")}</Button>}
      {error != null && <ApiErrorMessage error={error} />}
    </article>
  );
}

function MyTicketCard({ ticket }: { ticket: Ticket }) {
  const { tx, statusLabel } = useLanguage();
  const pdf = useMutation({ mutationFn: async () => downloadBlob(await getTicketPdf(ticket.id), `biletflow-ticket-${ticket.id}.pdf`) });
  const [showQr, setShowQr] = useState(false);
  const qr = useQuery({
    queryKey: ["ticket-qr", ticket.id],
    queryFn: async () => {
      const blob = await getTicketQr(ticket.id);
      if (blob.type.startsWith("image/")) return blob;
      const raw = (await blob.text()).trim();
      let encoded = raw;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === "string") encoded = parsed;
      } catch {
        // The API may return a raw base64 string instead of JSON.
      }
      const data = encoded.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
      const binary = atob(data);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new Blob([bytes], { type: "image/png" });
    },
    enabled: showQr,
    staleTime: 5 * 60 * 1000,
  });
  const qrUrl = useObjectUrl(qr.data);

  return (
    <article className="rounded-xl border p-4">
      <p className="text-xs text-muted">{ticket.eventTitle}</p>
      <h3 className="mt-1 font-semibold">{ticket.ticketTypeName}</h3>
      <p className="mt-2 text-sm">{tx("Статус: ")}{statusLabel(ticket.status)}</p>
      <p className="mt-1 text-sm">{ticket.attendeeName ?? ticket.attendeeEmail}</p>
      <p className="mt-1 text-xs text-muted">{tx("Билет №")}{ticket.id} {tx(" · Заказ №")}{ticket.orderId}</p>
      <Button variant="secondary" className="mt-3" onClick={() => setShowQr((value) => !value)}>
        {showQr ? tx("Скрыть QR-код") : tx("Показать QR-код")}
      </Button>
      <Button variant="secondary" className="mt-3 ml-2" disabled={pdf.isPending || ticket.status === "CANCELLED"} onClick={() => pdf.mutate()}>{pdf.isPending ? tx("Загрузка…") : tx("Скачать билет PDF")}</Button>
      {pdf.error && <ApiErrorMessage error={pdf.error} />}
      <Link to={`/support/new?ticketId=${ticket.id}`} className="mt-3 block text-sm underline">{tx("Помощь с билетом")}</Link>
      {showQr && qr.isLoading && <p className="mt-3 text-sm text-muted">{tx("Загружаем QR-код…")}</p>}
      {showQr && qr.error && <ApiErrorMessage error={qr.error} />}
      {showQr && qrUrl && <img src={qrUrl} alt={tx("QR-код билета {0}", [ticket.id])} className="mt-3 h-48 w-48 rounded border bg-white p-2" />}
    </article>
  );
}

export function EventCheckInPage() {
  const { tx } = useLanguage();
  const assignedEvents = useQuery({
    queryKey: ["assigned-events"],
    queryFn: () => getAssignedEvents(),
  });
  const events = assignedEvents.data?.content ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const eventId = events.some((event) => event.id === selectedId) ? selectedId! : events[0]?.id ?? 0;
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [code, setCode] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const queryClient = useQueryClient();
  const stats = useQuery({
    queryKey: ["check-in-stats", eventId],
    queryFn: () => getEventCheckInStats(eventId),
    enabled: eventId > 0,
  });
  const attendees = useQuery({
    queryKey: ["event-attendees", eventId, search, page],
    queryFn: () => getEventAttendees(eventId, search, page, PAGE_SIZE),
    enabled: eventId > 0,
  });
  const scan = useMutation({
    mutationFn: (ticketCode: string) => scanEventTicket(eventId, ticketCode),
    onSuccess: async (result) => {
      setScanMessage(tx(result.message) || tx("Проверка завершена: {0}", [result.result]));
      setCode("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["check-in-stats", eventId] }),
        queryClient.invalidateQueries({ queryKey: ["event-attendees", eventId] }),
      ]);
    },
    onError: (error) => setScanMessage(error instanceof Error ? tx(error.message) : tx("Не удалось проверить билет.")),
  });
  const undo = useMutation({
    mutationFn: (ticketId: number) => undoEventCheckIn(eventId, ticketId),
    onSuccess: async (result) => {
      setScanMessage(tx(result.message) || tx("Отметка о проходе отменена."));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["check-in-stats", eventId] }),
        queryClient.invalidateQueries({ queryKey: ["event-attendees", eventId] }),
      ]);
    },
  });

  if (assignedEvents.isLoading) return <Loading />;
  if (assignedEvents.error) return <ErrorPanel error={assignedEvents.error} retry={() => { void assignedEvents.refetch(); }} />;

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };
  const submitScan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ticketCode = code.trim();
    if (!ticketCode || !eventId) return;
    setScanMessage("");
    scan.mutate(ticketCode);
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{tx("Check-in мероприятия")}</h1>
        <p className="mt-1 text-sm text-muted">{tx("Доступны только назначенные вам мероприятия.")}</p>
      </div>
      {events.length === 0 ? <Empty text={tx("Вам пока не назначили мероприятия.")} /> : (
        <>
          <label className="block max-w-xl text-sm font-medium">
            {tx("Мероприятие")}<select value={eventId} onChange={(event) => { setSelectedId(Number(event.target.value)); setPage(0); }} className="mt-1 block w-full rounded-lg border px-3 py-2">
              {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
            </select>
          </label>

          {stats.error ? <ErrorPanel error={stats.error} retry={() => { void stats.refetch(); }} /> : stats.data && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label={tx("Зарегистрировано")} value={stats.data.registered} />
              <Metric label={tx("Прошли check-in")} value={stats.data.checkedIn} />
              <Metric label={tx("Ещё не прошли")} value={stats.data.notCheckedIn} />
            </div>
          )}

          <form onSubmit={submitScan} className="rounded-xl border p-4">
            <h2 className="font-semibold">{tx("Проверить билет")}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <input autoComplete="off" value={code} onChange={(event) => setCode(event.target.value)} placeholder={tx("Код билета")} className="min-w-60 flex-1 rounded-lg border px-3 py-2 text-sm" />
              <Button type="submit" disabled={!code.trim() || scan.isPending}>{scan.isPending ? tx("Проверяем…") : tx("Проверить")}</Button>
            </div>
            {scanMessage && <p role="status" className="mt-3 rounded-md bg-surface p-3 text-sm">{tx(scanMessage)}</p>}
            {undo.error && <ApiErrorMessage error={undo.error} />}
          </form>

          <div>
            <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
              <input aria-label={tx("Поиск участника по имени, email или коду")} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={tx("Имя, email или код билета")} className="min-w-60 flex-1 rounded-lg border px-3 py-2 text-sm" />
              <Button type="submit">{tx("Найти участника")}</Button>
            </form>
            {attendees.error ? <ErrorPanel error={attendees.error} retry={() => { void attendees.refetch(); }} /> : attendees.isLoading ? <Loading /> : (
              <>
                {(attendees.data?.content ?? []).length === 0 ? <Empty text={tx("Участники не найдены.")} /> : (
                  <div className="mt-3 space-y-2">
                    {(attendees.data?.content ?? []).map((ticket) => (
                      <AttendeeRow key={ticket.id} ticket={ticket} pending={undo.isPending} onUndo={() => undo.mutate(ticket.id)} />
                    ))}
                  </div>
                )}
                <Pagination page={page} totalPages={attendees.data?.totalPages ?? 0} onChange={setPage} />
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function AttendeeRow({ ticket, pending, onUndo }: { ticket: Ticket; pending: boolean; onUndo: () => void }) {
  const { tx, locale, statusLabel } = useLanguage();
  return (
    <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
      <div>
        <p className="font-medium">{ticket.attendeeName ?? ticket.attendeeEmail}</p>
        <p className="text-xs text-muted">{ticket.attendeeEmail}</p>
        <p className="text-sm text-muted">{ticket.ticketTypeName} {tx(" · Билет №")}{ticket.id} · {statusLabel(ticket.status)}</p>
        {ticket.usedAt && <p className="text-xs text-muted">{tx("Отмечен: ")}{formatDateTime(ticket.usedAt, locale)}</p>}
      </div>
      {ticket.status === "USED" && <Button variant="secondary" disabled={pending} onClick={onUndo}>{tx("Отменить check-in")}</Button>}
    </article>
  );
}

export function PlatformAdminPage() {
  const { tx, statusLabel } = useLanguage();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [suspensionTarget, setSuspensionTarget] = useState<{ id: number; title: string } | null>(null);
  const users = useQuery({ queryKey: ["admin-users", page], queryFn: () => getUsers(page, PAGE_SIZE) });
  const events = useQuery({ queryKey: ["admin-events"], queryFn: () => getEvents(0, 100) });
  const remove = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
  });
  const moderation = useMutation({
    mutationFn: ({ eventId, suspended, reason }: { eventId: number; suspended: boolean; reason?: string }) =>
      setEventSuspended(eventId, suspended, reason),
    onSuccess: async () => {
      setSuspensionTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-events"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["event"] }),
        queryClient.invalidateQueries({ queryKey: ["organizer-events"] }),
        queryClient.invalidateQueries({ queryKey: ["organizer-sales-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-sales-events"] }),
      ]);
    },
  });

  if (users.isLoading) return <Loading />;
  if (users.error || events.error) return <ErrorPanel error={users.error ?? events.error} retry={() => { void users.refetch(); void events.refetch(); }} />;

  return (
    <section>
      {suspensionTarget && <EventSuspensionDialog
        key={suspensionTarget.id}
        event={suspensionTarget}
        pending={moderation.isPending}
        error={moderation.error}
        onClose={() => { setSuspensionTarget(null); moderation.reset(); }}
        onConfirm={reason => moderation.mutate({ eventId: suspensionTarget.id, suspended: true, reason })}
      />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{tx("Пользователи платформы")}</h1>
          <p className="mt-1 text-sm text-muted">{tx("Управление учетными записями и ролями.")}</p>
        </div>
        <Link to="/admin/dashboard" className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold hover:bg-gray-200">
          {tx("Панель всех мероприятий")}</Link>
      </div>
      {(users.data?.content ?? []).length === 0 ? <Empty text={tx("Пользователи не найдены.")} /> : (
        <div className="mt-4 space-y-3">
          {(users.data?.content ?? []).map((user) => (
            <AdminUserCard
              key={user.id}
              user={user}
              pending={remove.isPending}
              onDelete={() => {
                if (window.confirm(tx("Удалить пользователя {0}?", [user.email]))) remove.mutate(user.id);
              }}
            />
          ))}
        </div>
      )}
      {remove.error && <ApiErrorMessage error={remove.error} />}
      <Pagination page={page} totalPages={users.data?.totalPages ?? 0} onChange={setPage} />
      {moderation.error && <ApiErrorMessage error={moderation.error} />}
      <section className="mt-10">
        <h2 className="text-xl font-bold">{tx("Модерация мероприятий")}</h2>
        <p className="mt-1 text-sm text-muted">{tx("Для полного управления мероприятиями откройте ")}<Link to="/admin/dashboard" className="font-semibold underline">{tx("панель платформы")}</Link>.</p>
        {events.isLoading ? <Loading /> : (events.data?.content ?? []).length === 0 ? <Empty text={tx("Мероприятия не найдены.")} /> : (
          <div className="mt-4 space-y-3">
            {(events.data?.content ?? []).map((event) => (
              <article key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <div>
                  <p className="font-semibold">{event.title}</p>
                  <p className="mt-1 text-xs text-muted">ID {event.id} · {statusLabel(event.status)}{event.suspended ? tx(" · Приостановлено") : ""}</p>
                  {event.suspensionReason && <p className="mt-1 text-sm text-red-700">{tx("Причина: ")}{event.suspensionReason}</p>}
                </div>
                {event.suspended ? (
                  <Button
                    variant="secondary"
                    disabled={moderation.isPending}
                    onClick={() => moderation.mutate({ eventId: event.id, suspended: false })}
                  >
                    {moderation.isPending && moderation.variables?.eventId === event.id ? tx("Возобновляем…") : tx("Возобновить")}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={moderation.isPending || event.status === "CANCELLED"}
                    title={event.status === "CANCELLED" ? tx("Отменённое событие нельзя приостановить") : undefined}
                    onClick={() => { moderation.reset(); setSuspensionTarget(event); }}
                  >
                    {tx("Приостановить")}</Button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function AdminUserCard({ user, pending, onDelete }: { user: User; pending: boolean; onDelete: () => void }) {
  const { tx, statusLabel } = useLanguage();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user.role.replace(/^ROLE_/, ""));
  const [formError, setFormError] = useState("");
  const update = useMutation({
    mutationFn: (request: UpdateUserRequest) => updateUser(user.id, request),
    onSuccess: async () => {
      setEditing(false);
      setPassword("");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
  const updateRole = useMutation({
    mutationFn: (nextRole: string) => changeUserRole(user.id, nextRole),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]);
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFormError(tx("Введите корректный email."));
      return;
    }
    if (password && password.length < 6) {
      setFormError(tx("Пароль должен содержать не менее 6 символов."));
      return;
    }
    const request: UpdateUserRequest = {};
    if (email.trim() !== user.email) request.email = email.trim();
    if (password) request.password = password;
    if (!request.email && !request.password) {
      setFormError(tx("Изменений нет."));
      return;
    }
    setFormError("");
    update.mutate(request);
  };

  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-medium">{user.email}</p><p className="text-xs text-muted">ID {user.id} {tx(" · Роль: ")}{statusLabel(user.role)}</p></div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((value) => !value)}>{editing ? tx("Закрыть") : tx("Изменить")}</Button>
          <Button variant="secondary" disabled={pending} onClick={onDelete}>{tx("Удалить")}</Button>
        </div>
      </div>
      {editing && (
        <form onSubmit={submit} className="mt-4 space-y-3 border-t pt-4">
          <label className="block text-sm">{tx("Роль")}<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2">
              <option value="USER">{tx("Посетитель (USER)")}</option>
              <option value="ORGANIZER">{tx("Организатор (ORGANIZER)")}</option>
              <option value="EVENT_ADMIN">{tx("Администратор события (EVENT_ADMIN)")}</option>
              <option value="PLATFORM_ADMIN">{tx("Администратор платформы (PLATFORM_ADMIN)")}</option>
            </select>
          </label>
          {role !== user.role.replace(/^ROLE_/, "") && (
            <Button
              type="button"
              variant="secondary"
              disabled={updateRole.isPending}
              onClick={() => {
                if (window.confirm(tx("Назначить пользователю {0} роль {1}?", [user.email, role]))) updateRole.mutate(role);
              }}
            >
              {updateRole.isPending ? tx("Сохраняем роль…") : tx("Изменить роль")}
            </Button>
          )}
          <label className="block text-sm">Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2" /></label>
          <label className="block text-sm">{tx("Новый пароль (необязательно)")}<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2" /></label>
          {(formError || update.error) && <ApiErrorMessage error={formError || update.error} />}
          {updateRole.error && <ApiErrorMessage error={updateRole.error} />}
          <Button type="submit" disabled={update.isPending}>{update.isPending ? tx("Сохраняем…") : tx("Сохранить изменения")}</Button>
        </form>
      )}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const { tx, locale } = useLanguage();
  return <div className="rounded-xl bg-surface p-4"><p className="text-xs text-muted">{tx(label)}</p><p className="mt-1 text-xl font-bold">{value.toLocaleString(locale)}</p></div>;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  const { tx } = useLanguage();
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={tx("Страницы")} className="mt-4 flex items-center justify-center gap-3">
      <Button variant="secondary" disabled={page <= 0} onClick={() => onChange(page - 1)}>{tx("Назад")}</Button>
      <span className="text-sm">{page + 1} / {totalPages}</span>
      <Button variant="secondary" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>{tx("Далее")}</Button>
    </nav>
  );
}

function Empty({ text }: { text: string }) {

  return <p className="mt-4 rounded-xl bg-surface p-5 text-center text-sm text-muted">{text}</p>;
}

function Loading() {
  const { tx } = useLanguage();
  return <p className="mt-4 rounded-xl bg-surface p-5 text-center text-sm">{tx("Загрузка…")}</p>;
}

function ErrorPanel({ error, retry }: { error: unknown; retry: () => void }) {
  const { tx } = useLanguage();
  return (
    <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
      <p>{error instanceof Error ? tx(error.message) : tx("Не удалось загрузить данные.")}</p>
      <Button variant="secondary" className="mt-3" onClick={retry}>{tx("Повторить")}</Button>
    </div>
  );
}

function ApiErrorMessage({ error }: { error: unknown }) {
  const { tx } = useLanguage();
  const message = error instanceof Error ? tx(error.message) : tx("Запрос не выполнен.");
  return <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{tx(message)}</p>;
}

function AccessPanel({ title, detail, action }: { title: string; detail: string; action: ReactNode }) {
  const { tx } = useLanguage();
  return <div className="mx-auto max-w-xl rounded-xl border p-8 text-center"><h1 className="text-xl font-bold">{tx(title)}</h1><p className="mt-2 text-sm text-muted">{tx(detail)}</p><div className="mt-4">{action}</div></div>;
}

function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);
  return url;
}
