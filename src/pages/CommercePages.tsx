import { useLanguage } from "../i18n/LanguageContext";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activationAction, createCampaign, getActivation, getActivations, getCampaignQr, getCampaigns, getPayoutAccount, getVerificationRequests, requestVerification, reviewVerification, savePayoutAccount, setCampaignEnabled, type Activation, type Campaign, type CampaignInput, type DiscountType, type VerificationRequest } from "../api/commerce";
import { getOrganizerProfile, getTicketTypes } from "../api/events";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/Button";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { MutationError, Pagination } from "../components/ui/AsyncState";
import { formatPrice } from "../lib/format";
import { downloadBlob } from "../lib/download";

const inputClass = "mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm";
const activationLabels = { IN_PROGRESS: "Подготовка", ACTIVE: "Активны", SUSPENDED: "Приостановлены" };
const checklistLabels: Record<string, string> = { PAID_TICKET_TYPE: "Создать платный тип билета", IDENTITY_VERIFIED: "Подтвердить организатора", PAYOUT_ACCOUNT: "Указать платёжные реквизиты", FEE_PAID: "Оплатить сбор", TERMS_ACCEPTED: "Принять условия платных продаж" };

export function OrganizerProfileSettings() {
  const { tx } = useLanguage();
  const client = useQueryClient();
  const profile = useQuery({ queryKey: ["organizer-profile"], queryFn: getOrganizerProfile, refetchInterval: query => query.state.data?.verificationStatus === "PENDING" ? 15000 : false });
  const payout = useQuery({ queryKey: ["payout-account"], queryFn: async () => { try { return await getPayoutAccount(); } catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; } }, retry: false });
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const verify = useMutation({ mutationFn: requestVerification, onSuccess: async () => { await client.invalidateQueries({ queryKey: ["organizer-profile"] }); } });
  const save = useMutation({ mutationFn: () => savePayoutAccount({ bankName: bankName.trim(), accountHolder: accountHolder.trim(), iban: iban.replace(/\s/g, "").toUpperCase() }), onSuccess: async updated => { setIban(""); client.setQueryData(["payout-account"], updated); await client.invalidateQueries({ queryKey: ["activation"] }); } });
  return <section className="space-y-5 rounded-xl border p-5">
    <h2 className="text-lg font-semibold">{tx("Верификация и реквизиты организатора")}</h2>
    <p className="text-sm text-amber-900">{tx("Демонстрационная проверка и реквизиты. Реальные выплаты пока не выполняются.")}</p>
    {profile.isLoading && <p>{tx("Загрузка профиля…")}</p>}
    {profile.error && <ErrorMessage error={profile.error} onRetry={() => void profile.refetch()} />}
    {profile.data && <><p className="text-sm">{tx("Статус проверки: ")}{({ VERIFIED: tx("Подтверждён"), PENDING: tx("На проверке"), REJECTED: tx("Отклонён"), UNVERIFIED: tx("Не подтверждён") } as Record<string, string>)[profile.data.verificationStatus] ?? profile.data.verificationStatus}</p><Button variant="secondary" disabled={verify.isPending || ["VERIFIED", "PENDING"].includes(profile.data.verificationStatus)} onClick={() => verify.mutate()}>{tx("Подать заявку на верификацию")}</Button></>}
    <MutationError error={verify.error} />
    {verify.isSuccess && <p role="status" className="text-sm text-green-800">{tx("Заявка отправлена администратору.")}</p>}
    {payout.isLoading && <p>{tx("Загрузка реквизитов…")}</p>}
    {payout.error && <ErrorMessage error={payout.error} onRetry={() => void payout.refetch()} />}
    {payout.data && <p className="rounded-lg bg-surface p-3 text-sm">{tx("Сохранено: ")}{payout.data.bankName} · {payout.data.accountHolder} · IBAN •••• {payout.data.ibanLast4}</p>}
    <form onSubmit={e => { e.preventDefault(); if (bankName.trim() && accountHolder.trim()) save.mutate(); }} className="space-y-3 border-t pt-4">
      <label className="block text-sm">{tx("Банк")}<input required maxLength={120} value={bankName} onChange={e => setBankName(e.target.value)} className={inputClass} /></label>
      <label className="block text-sm">{tx("Владелец счёта")}<input required maxLength={200} value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className={inputClass} /></label>
      <label className="block text-sm">{tx("IBAN Казахстана")}<input required pattern="KZ[0-9]{2}[0-9A-Z]{16}" maxLength={20} value={iban} onChange={e => setIban(e.target.value.replace(/\s/g, "").toUpperCase())} placeholder={tx("KZ… (20 символов)")} autoComplete="off" className={inputClass} /></label>
      <p className="text-xs text-muted">{tx("Сохраняются только последние четыре символа IBAN. Для изменения счёта введите полный номер заново.")}</p>
      <MutationError error={save.error} />{save.isSuccess && <p role="status" className="text-sm text-green-800">{tx("Реквизиты сохранены.")}</p>}
      <Button type="submit" disabled={save.isPending}>{save.isPending ? tx("Сохраняем…") : tx("Сохранить реквизиты")}</Button>
    </form>
  </section>;
}

export function CampaignsPage() {
  const { tx } = useLanguage();
  const eventId = Number(useParams().eventId);
  const client = useQueryClient();
  const validId = Number.isSafeInteger(eventId) && eventId > 0;
  const campaigns = useQuery({ queryKey: ["campaigns", eventId], queryFn: () => getCampaigns(eventId), enabled: validId, refetchInterval: 30000 });
  const types = useQuery({ queryKey: ["ticket-types", eventId], queryFn: () => getTicketTypes(eventId), enabled: validId });
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENT");
  const [discountValue, setDiscountValue] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [ticketTypeIds, setTicketTypeIds] = useState<number[]>([]);
  const [validation, setValidation] = useState("");
  const create = useMutation({ mutationFn: (body: CampaignInput) => createCampaign(eventId, body), onSuccess: async () => { setName(""); await client.invalidateQueries({ queryKey: ["campaigns", eventId] }); } });
  if (!validId) return <p role="alert">{tx("Некорректный ID события.")}</p>;
  const submit = (e: FormEvent) => {
    e.preventDefault(); setValidation("");
    if (!name.trim()) { setValidation(tx("Введите название кампании.")); return; }
    if (validFrom && validUntil && validFrom >= validUntil) { setValidation(tx("Окончание кампании должно быть позже начала.")); return; }
    create.mutate({ name: name.trim(), discountType, discountValue: Number(discountValue), ...(maxRedemptions ? { maxRedemptions: Number(maxRedemptions) } : {}), validFrom: validFrom || undefined, validUntil: validUntil || undefined, ticketTypeIds });
  };
  return <section className="max-w-4xl space-y-5">
    <Link to="/organizer/events" className="text-sm underline">{tx("← Мои события")}</Link><h2 className="text-xl font-bold">{tx("Промокоды и кампании · событие №")}{eventId}</h2>
    <form onSubmit={submit} className="space-y-3 rounded-xl border p-5">
      <h3 className="font-semibold">{tx("Создать кампанию")}</h3>
      <label className="block text-sm">{tx("Название")}<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} className={inputClass} /></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">{tx("Тип скидки")}<select value={discountType} onChange={e => setDiscountType(e.target.value as DiscountType)} className={inputClass}><option value="PERCENT">{tx("Процент")}</option><option value="FIXED">{tx("Фиксированная сумма, ₸")}</option></select></label>
        <label className="text-sm">{tx("Размер скидки")}<input type="number" required min="0.01" step="0.01" max={discountType === "PERCENT" ? 100 : 9999999999} value={discountValue} onChange={e => setDiscountValue(e.target.value)} className={inputClass} /></label>
        <label className="text-sm">{tx("Лимит применений (необязательно)")}<input type="number" min={1} step={1} value={maxRedemptions} onChange={e => setMaxRedemptions(e.target.value)} className={inputClass} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">{tx("Начало (необязательно)")}<input type="datetime-local" value={validFrom} onChange={e => setValidFrom(e.target.value)} className={inputClass} /></label><label className="text-sm">{tx("Окончание (необязательно)")}<input type="datetime-local" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={inputClass} /></label></div>
      <fieldset className="space-y-2 text-sm"><legend>{tx("Типы билетов (ничего не выбрано — все)")}</legend>
        {types.isLoading && <p>{tx("Загрузка типов билетов…")}</p>}{types.error && <ErrorMessage error={types.error} onRetry={() => void types.refetch()} />}
        {types.data?.map(type => <label key={type.id} className="mr-4 inline-flex items-center gap-2"><input type="checkbox" checked={ticketTypeIds.includes(type.id)} onChange={e => setTicketTypeIds(ids => e.target.checked ? [...ids, type.id] : ids.filter(id => id !== type.id))} />{type.name}</label>)}
      </fieldset>
      {validation && <p role="alert" className="text-sm text-red-700">{tx(validation)}</p>}<MutationError error={create.error} />
      <Button type="submit" disabled={create.isPending || types.isLoading || !!types.error}>{tx("Создать кампанию")}</Button>
    </form>
    {campaigns.isLoading && <p>{tx("Загрузка кампаний…")}</p>}{campaigns.error && <ErrorMessage error={campaigns.error} onRetry={() => void campaigns.refetch()} />}
    {campaigns.data?.length === 0 && <p className="text-sm text-muted">{tx("Кампаний пока нет.")}</p>}
    {campaigns.data?.map(campaign => <CampaignCard key={campaign.id} campaign={campaign} />)}
  </section>;
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const { tx, locale } = useLanguage();
  const client = useQueryClient();
  const toggle = useMutation({ mutationFn: () => setCampaignEnabled(campaign.eventId, campaign.id, !campaign.enabled), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["campaigns", campaign.eventId] }); } });
  const qr = useMutation({ mutationFn: async () => downloadBlob(await getCampaignQr(campaign.eventId, campaign.id), `campaign-${campaign.id}.png`) });
  return <article className="space-y-3 rounded-xl border border-indigo-300 p-5">
    <h3 className="font-semibold">{campaign.name} · {campaign.enabled ? tx("Включена") : tx("Выключена")}</h3>
    <p className="text-sm">{tx("Код: ")}<strong>{campaign.code}</strong> {tx(" · Скидка: ")}{campaign.discountValue}{campaign.discountType === "PERCENT" ? "%" : " ₸"}</p>
    <a href={campaign.campaignUrl} className="block break-all text-sm text-indigo-700 underline">{campaign.campaignUrl}</a>
    <p className="text-sm">{tx("Применений: ")}{campaign.redemptions} {tx(" · В резерве: ")}{campaign.pendingRedemptions} {tx(" · Осталось: ")}{campaign.remainingRedemptions ?? tx("без лимита")} {tx(" · Продано билетов: ")}{campaign.ticketsSold}</p>
    <p className="text-sm">{tx("До скидки: ")}{formatPrice(campaign.grossRevenue, locale)} {tx(" · Скидки: ")}{formatPrice(campaign.discountAmount, locale)} {tx(" · После скидки: ")}{formatPrice(campaign.netRevenue, locale)}</p>
    <div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={toggle.isPending} onClick={() => toggle.mutate()}>{campaign.enabled ? tx("Выключить") : tx("Включить")}</Button><Button variant="secondary" disabled={qr.isPending} onClick={() => qr.mutate()}>{tx("Скачать Campaign QR")}</Button></div>
    <p className="text-xs text-indigo-800">{tx("Campaign QR открывает событие с промокодом. Для входа нужен отдельный QR билета.")}</p>
    <MutationError error={toggle.error ?? qr.error} />
  </article>;
}

export function ActivationPage() {
  const { tx } = useLanguage();
  const eventId = Number(useParams().eventId);
  const validId = Number.isSafeInteger(eventId) && eventId > 0;
  const activation = useQuery({ queryKey: ["activation", eventId], queryFn: () => getActivation(eventId), enabled: validId, refetchInterval: 15000 });
  if (!validId) return <p role="alert">{tx("Некорректный ID события.")}</p>;
  return <section className="max-w-3xl space-y-4"><Link to="/organizer/events" className="text-sm underline">{tx("← Мои события")}</Link><h2 className="text-xl font-bold">{tx("Активация платных продаж")}</h2>
    {activation.isLoading && <p>{tx("Загрузка…")}</p>}{activation.error && <ErrorMessage error={activation.error} onRetry={() => void activation.refetch()} />}
    {activation.data && <ActivationCard activation={activation.data} />}
  </section>;
}

function ActivationCard({ activation, admin = false }: { activation: Activation; admin?: boolean }) {
  const { tx, locale } = useLanguage();
  const client = useQueryClient();
  const [terms, setTerms] = useState(false);
  const [reason, setReason] = useState("");
  const action = useMutation({
    mutationFn: (name: "pay-fee" | "accept-terms" | "activate" | "suspend" | "unsuspend") => activationAction(activation.eventId, name, name === "suspend" ? reason.trim() : undefined),
    onSettled: async () => { await Promise.all(["activation", "admin-activations", "event", "events", "organizer-events"].map(key => client.invalidateQueries({ queryKey: [key] }))); },
  });
  return <article className="space-y-4 rounded-xl border p-5">
    <h3 className="font-semibold">{activation.eventTitle} · {tx(activationLabels[activation.status])}</h3>
    {activation.simulated && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{tx("Демонстрационная активация. Сбор ")}{formatPrice(activation.feeAmount, locale)} {tx(" оплачивается в симуляторе.")}</p>}
    <ul className="space-y-2 text-sm">{activation.checklist.map(item => <li key={item.key}>{item.done ? "✓" : "○"} {tx(checklistLabels[item.key] ?? item.label)}</li>)}</ul>
    {activation.feeReference && <p className="break-all text-xs text-muted">{tx("Сбор: ")}{activation.feeReference}</p>}
    {activation.suspensionReason && <p className="text-sm text-red-700">{tx("Причина приостановки: ")}{activation.suspensionReason}</p>}
    {admin ? <div className="space-y-3">
      <p className="text-sm">{tx("Приостановка блокирует только новые платные заказы и оплаты. Бесплатные и уже проданные билеты продолжают работать.")}</p>
      {activation.status === "ACTIVE" && <><label className="block text-sm">{tx("Причина приостановки")}<textarea maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className={inputClass} /></label><Button variant="secondary" disabled={action.isPending || !reason.trim()} onClick={() => action.mutate("suspend")}>{tx("Приостановить платные продажи")}</Button></>}
      {activation.status === "SUSPENDED" && <Button disabled={action.isPending} onClick={() => action.mutate("unsuspend")}>{tx("Возобновить платные продажи")}</Button>}
    </div> : activation.status === "IN_PROGRESS" ? <div className="space-y-3">
      <Link to="/account/settings" className="text-sm underline">{tx("Верификация и реквизиты в профиле")}</Link>
      {!activation.termsAcceptedAt && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />{tx("Принимаю условия демонстрационной активации платных продаж: сбор и реквизиты используются в симуляторе, реальные выплаты не производятся.")}</label>}
      <div className="flex flex-wrap gap-3">
        {!activation.feePaidAt && <Button variant="secondary" disabled={action.isPending} onClick={() => action.mutate("pay-fee")}>{tx("Оплатить сбор ")}{formatPrice(activation.feeAmount, locale)} {tx(" (симуляция)")}</Button>}
        {!activation.termsAcceptedAt && <Button variant="secondary" disabled={action.isPending || !terms} onClick={() => action.mutate("accept-terms")}>{tx("Принять условия")}</Button>}
        <Button disabled={action.isPending || !activation.readyToActivate} onClick={() => action.mutate("activate")}>{tx("Активировать продажи")}</Button>
      </div>
      {!activation.readyToActivate && <p className="text-sm text-muted">{tx("Для активации выполните все пункты чек-листа.")}</p>}
    </div> : <p className="text-sm">{activation.status === "ACTIVE" ? tx("Платные продажи активны.") : tx("Платные продажи приостановлены администратором.")} {tx(" Бесплатные билеты этим ограничением не блокируются.")}</p>}
    <MutationError error={action.error} />
  </article>;
}

export function AdminActivationsPage() {
  const { tx } = useLanguage();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const list = useQuery({ queryKey: ["admin-activations", status, page], queryFn: () => getActivations(status, page), refetchInterval: 15000 });
  return <section className="space-y-4"><h2 className="text-xl font-bold">{tx("Платные продажи")}</h2>
    <label className="block text-sm">{tx("Статус")}<select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }} className="ml-3 rounded-lg border p-2"><option value="">{tx("Все")}</option>{Object.entries(activationLabels).map(([key, label]) => <option key={key} value={key}>{tx(label)}</option>)}</select></label>
    {list.isLoading && <p>{tx("Загрузка…")}</p>}{list.error && <ErrorMessage error={list.error} onRetry={() => void list.refetch()} />}
    {list.data?.content.length === 0 && <p className="text-sm">{tx("Событий с таким статусом нет.")}</p>}
    {list.data?.content.map(item => <ActivationCard key={item.eventId} activation={item} admin />)}
    <Pagination page={page} totalPages={list.data?.totalPages ?? 0} onChange={setPage} />
  </section>;
}

export function AdminVerificationPage() {
  const { tx } = useLanguage();
  const [page, setPage] = useState(0);
  const requests = useQuery({ queryKey: ["verification-requests", page], queryFn: () => getVerificationRequests(page), refetchInterval: 15000 });
  return <section className="max-w-3xl space-y-4"><h2 className="text-xl font-bold">{tx("Заявки организаторов")}</h2>
    {requests.isLoading && <p>{tx("Загрузка…")}</p>}{requests.error && <ErrorMessage error={requests.error} onRetry={() => void requests.refetch()} />}
    {requests.data?.content.length === 0 && <p className="text-sm">{tx("Новых заявок нет.")}</p>}
    {requests.data?.content.map(request => <VerificationCard key={request.id} request={request} />)}
    <Pagination page={page} totalPages={requests.data?.totalPages ?? 0} onChange={setPage} />
  </section>;
}

function VerificationCard({ request }: { request: VerificationRequest }) {
  const { tx, statusLabel } = useLanguage();
  const client = useQueryClient();
  const [note, setNote] = useState("");
  const review = useMutation({ mutationFn: (approved: boolean) => reviewVerification(request.id, approved, note.trim()), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["verification-requests"] }); } });
  return <article className="space-y-3 rounded-xl border p-5">
    <h3 className="font-semibold">{request.email}</h3><p className="break-words text-sm">{request.contactInformation}</p><p className="text-xs text-muted">{tx("Профиль №")}{request.id} · {statusLabel(request.verificationStatus)}</p>
    <label className="block text-sm">{tx("Комментарий к решению")}<textarea maxLength={500} value={note} onChange={e => setNote(e.target.value)} className={inputClass} /></label>
    <div className="flex gap-3"><Button disabled={review.isPending} onClick={() => review.mutate(true)}>{tx("Подтвердить")}</Button><Button variant="secondary" disabled={review.isPending} onClick={() => review.mutate(false)}>{tx("Отклонить")}</Button></div><MutationError error={review.error} />
  </article>;
}
