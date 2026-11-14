import { formatDateTime } from "../lib/format";
import { useLanguage } from "../i18n/LanguageContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { MutationError, Pagination } from "../components/ui/AsyncState";

export default function NotificationsPage() {
  const { tx, locale } = useLanguage();
  const { user, isLoggedIn, openLogin } = useAuth();
  const [page, setPage] = useState(0);
  const client = useQueryClient();
  const list = useQuery({ queryKey: ["notifications", user?.id, page], queryFn: () => getNotifications(page), enabled: isLoggedIn, refetchInterval: 30000 });
  const mark = useMutation({
    mutationFn: async (id?: number) => { if (id === undefined) await markAllNotificationsRead(); else await markNotificationRead(id); },
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["notifications"] }), client.invalidateQueries({ queryKey: ["unread-notifications"] })]); },
  });
  if (!isLoggedIn) return <Button onClick={openLogin}>{tx("Войти для просмотра уведомлений")}</Button>;
  return <section className="mx-auto max-w-3xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{tx("Уведомления")}</h1><Button variant="secondary" disabled={mark.isPending} onClick={() => mark.mutate(undefined)}>{tx("Прочитать все")}</Button></div>
    <MutationError error={mark.error} />
    {list.isLoading && <p>{tx("Загрузка…")}</p>}
    {list.error && <ErrorMessage error={list.error} onRetry={() => void list.refetch()} />}
    {list.data?.content.length === 0 && <p className="rounded-xl bg-surface p-5 text-sm">{tx("Уведомлений пока нет.")}</p>}
    {list.data?.content.map(item => <article key={item.id} className={`space-y-2 rounded-xl border p-4 ${item.readAt ? "" : "border-indigo-300 bg-indigo-50"}`}>
      <h2 className="font-semibold">{!item.readAt && <span className="mr-2 text-indigo-700">●<span className="sr-only">{tx("Не прочитано")}</span></span>}{item.title}</h2>
      <p className="whitespace-pre-wrap break-words text-sm">{item.body}</p>
      <p className="text-xs text-muted">{formatDateTime(item.createdAt, locale)}</p>
      <div className="flex flex-wrap items-center gap-4">{item.orderId && <Link to={`/orders/${item.orderId}`} className="text-sm underline">{tx("Открыть заказ")}</Link>}{!item.readAt && <Button variant="secondary" disabled={mark.isPending} onClick={() => mark.mutate(item.id)}>{tx("Прочитано")}</Button>}</div>
    </article>)}
    <Pagination page={page} totalPages={list.data?.totalPages ?? 0} onChange={setPage} />
  </section>;
}
