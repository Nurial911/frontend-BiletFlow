import { api } from "./client";
import type { Page } from "./types";
export type SupportStatus = "OPEN" | "IN_PROGRESS" | "WAITING_FOR_CUSTOMER" | "RESOLVED";
export type SupportCategory = "TICKET_DELIVERY" | "PAYMENT" | "REFUND" | "SEATING" | "EVENT_INFORMATION" | "CHECK_IN" | "ACCOUNT" | "ACTIVATION" | "TECHNICAL" | "OTHER";
export interface SupportCase {
  id: number;
  type: "ATTENDEE" | "PLATFORM";
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  escalated: boolean;
  requesterId: number;
  requesterEmail: string;
  assigneeId?: number;
  assigneeEmail?: string;
  eventId?: number;
  eventTitle?: string;
  orderId?: number;
  ticketId?: number;
  createdAt: string;
  updatedAt: string;
}
export interface SupportDetail {
  supportCase: SupportCase;
  messages: { id: number; authorName: string; fromStaff: boolean; body: string; createdAt: string }[];
}
export interface SupportInput {
  type: "ATTENDEE" | "PLATFORM";
  category: SupportCategory;
  subject: string;
  message: string;
  eventId?: number;
  orderId?: number;
  ticketId?: number;
}
export const openSupportCase = (body: SupportInput) => api<SupportDetail>("/api/support/cases", { method: "POST", body });
export const getSupportCases = (status = "", escalated = false, page = 0) => {
  const query = new URLSearchParams({ page: String(page), size: "20" });
  if (status) query.set("status", status);
  if (escalated) query.set("escalated", "true");
  return api<Page<SupportCase>>(`/api/support/cases?${query}`);
};
export const getSupportCase = (id: number) => api<SupportDetail>(`/api/support/cases/${id}`);
export const replyToCase = (id: number, body: string) => api<SupportDetail>(`/api/support/cases/${id}/messages`, { method: "POST", body: { body } });
export const assignCase = (id: number, email: string) => api<SupportDetail>(`/api/support/cases/${id}/assign`, { method: "POST", body: { email } });
export const setCaseStatus = (id: number, status: SupportStatus) => api<SupportDetail>(`/api/support/cases/${id}/status`, { method: "POST", body: { status } });
export const escalateCase = (id: number) => api<SupportDetail>(`/api/support/cases/${id}/escalate`, { method: "POST" });
