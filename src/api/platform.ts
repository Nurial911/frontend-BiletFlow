import { api, apiBlob } from "./client";
import type { Event, Page } from "./types";

export type Filters = Record<string, string | number | boolean | undefined>;
export function query(filters: Filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return params.size ? `?${params}` : "";
}
export interface CalendarLinks { cancelled: boolean; icsUrl: string; googleCalendarUrl?: string; outlookUrl?: string; office365Url?: string }
export const getCalendar = (id: number) => api<CalendarLinks>(`/api/events/${id}/calendar`);
export const downloadCalendar = (id: number) => apiBlob(`/api/events/${id}/calendar.ics`);
export type ReportReason = "FRAUD" | "MISLEADING" | "INAPPROPRIATE" | "SPAM" | "OTHER";
export interface EventReport { id: number; eventId: number; eventTitle: string; eventStatus: Event["status"]; eventSuspended: boolean; reporterEmail: string; reason: ReportReason; message?: string; status: "OPEN" | "DISMISSED" | "ACTIONED"; resolutionNote?: string }
export const reportEvent = (id: number, reason: ReportReason, message?: string) => api<EventReport>(`/api/events/${id}/reports`, { method: "POST", body: { reason, message } });
export const getReports = (filters: Filters = {}) => api<Page<EventReport>>(`/api/admin/event-reports${query(filters)}`);
export const getReport = (id: number) => api<EventReport>(`/api/admin/event-reports/${id}`);
export const reviewReport = (id: number, outcome: "DISMISSED" | "ACTIONED", note?: string) => api<EventReport>(`/api/admin/event-reports/${id}/review`, { method: "POST", body: { outcome, note } });
export interface PlatformSettings { activationFeeKzt: number; processingFeePercent: number }
export const getSettings = () => api<PlatformSettings>("/api/admin/settings");
export const updateSettings = (body: PlatformSettings) => api<PlatformSettings>("/api/admin/settings", { method: "PUT", body });
export const getOverview = () => api<Record<string, number | string>>("/api/admin/overview");
export type AdminResource = "events" | "orders" | "payments" | "refunds" | "campaigns";
export interface AdminRecord { id: number; eventId?: number; title?: string; eventTitle?: string; name?: string; buyerEmail?: string; status?: string; totalAmount?: number; amount?: number; provider?: string; failureReason?: string; suspended?: boolean; code?: string; discountValue?: number; usageCount?: number; enabled?: boolean }
export const searchAdmin = (resource: AdminResource, filters: Filters = {}) => api<Page<AdminRecord>>(`/api/admin/${resource}${query(filters)}`);
export const getAdminEvents = (filters: Filters = {}) => api<Page<Event>>(`/api/admin/events${query(filters)}`);
export const downloadCsv = (resource: "events" | "payments" | "payouts", filters: Filters = {}) => apiBlob(`/api/admin/reports/${resource}.csv${query(filters)}`);
export interface Payout { id: number; eventId: number; eventTitle: string; organizerEmail: string; status: "SCHEDULED" | "ON_HOLD" | "PAID" | "CANCELLED"; holdType?: string; statusReason?: string; grossRevenue: number; discounts: number; refunds: number; processingFees: number; amount: number; simulated: boolean; scheduledFor?: string; reference?: string; bankName?: string; ibanLast4?: string }
export const getPayouts = (admin: boolean, filters: Filters = {}) => api<Page<Payout>>(`/api/${admin ? "admin" : "organizer"}/payouts${query(filters)}`);
export const getPayout = (id: number) => api<Payout>(`/api/admin/payouts/${id}`);
export const getEventPayout = (id: number) => api<Payout>(`/api/organizer/events/${id}/payout`);
export const changePayout = (id: number, action: "hold" | "release" | "pay-now", reason?: string) => api<Payout>(`/api/admin/payouts/${id}/${action}`, { method: "POST", ...(action === "hold" ? { body: { reason } } : {}) });
