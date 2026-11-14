import { api, apiBlob } from "./client";
import type { OrganizerProfile, Page } from "./types";

export interface PaymentSession {
  provider: "SIMULATED" | "HALYK";
  simulated: boolean;
  scriptUrl: string | null;
  payment: Record<string, unknown> | null;
}
export interface Payment {
  id: number;
  reference: string;
  status: "SUCCEEDED" | "FAILED";
  amount: number;
  processingFee: number;
  simulated: boolean;
  provider: string;
  failureReason?: string;
  createdAt: string;
}
export interface OrderQuote {
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  promoCode: string | null;
}
export type DiscountType = "PERCENT" | "FIXED";
export interface PromoPreview {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  validUntil?: string;
  ticketTypeIds: number[];
}
export interface CampaignInput {
  name: string;
  discountType: DiscountType;
  discountValue: number;
  validFrom?: string;
  validUntil?: string;
  maxRedemptions?: number;
  ticketTypeIds?: number[];
}
export interface Campaign extends CampaignInput {
  id: number;
  eventId: number;
  code: string;
  campaignUrl: string;
  enabled: boolean;
  redemptions: number;
  pendingRedemptions: number;
  remainingRedemptions: number | null;
  ticketsSold: number;
  grossRevenue: number;
  discountAmount: number;
  netRevenue: number;
}
export const previewPromo = (eventId: number, value: string, token = false) =>
  api<PromoPreview>(`/api/events/${eventId}/promo?${new URLSearchParams({ [token ? "token" : "code"]: value })}`);
export const getCampaigns = (eventId: number) => api<Campaign[]>(`/api/events/${eventId}/campaigns`);
export const createCampaign = (eventId: number, body: CampaignInput) =>
  api<Campaign>(`/api/events/${eventId}/campaigns`, { method: "POST", body });
export const setCampaignEnabled = (eventId: number, id: number, enabled: boolean) =>
  api<Campaign>(`/api/events/${eventId}/campaigns/${id}/${enabled ? "enable" : "disable"}`, { method: "POST" });
export const getCampaignQr = (eventId: number, id: number) => apiBlob(`/api/events/${eventId}/campaigns/${id}/qr`);

export type ActivationStatus = "IN_PROGRESS" | "ACTIVE" | "SUSPENDED";
export interface Activation {
  eventId: number;
  eventTitle: string;
  status: ActivationStatus;
  simulated: boolean;
  feeAmount: number;
  feeReference?: string;
  feePaidAt?: string;
  termsAcceptedAt?: string;
  activatedAt?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  checklist: { key: string; label: string; done: boolean }[];
  readyToActivate: boolean;
}
export const getActivation = (eventId: number) => api<Activation>(`/api/events/${eventId}/activation`);
export const activationAction = (eventId: number, action: "pay-fee" | "accept-terms" | "activate" | "suspend" | "unsuspend", reason?: string) =>
  api<Activation>(`/api/events/${eventId}/activation/${action}`, { method: "POST", ...(reason ? { body: { reason } } : {}) });
export const getActivations = (status = "", page = 0) => {
  const params = new URLSearchParams({ page: String(page), size: "20" });
  if (status) params.set("status", status);
  return api<Page<Activation>>(`/api/admin/paid-sales-activations?${params}`);
};
export interface PayoutAccount {
  bankName: string;
  accountHolder: string;
  ibanLast4: string;
  simulated: boolean;
  createdAt: string;
}
export interface VerificationRequest extends OrganizerProfile { email: string }
export const requestVerification = () => api<OrganizerProfile>("/api/organizers/profile/verification", { method: "POST" });
export const getPayoutAccount = () => api<PayoutAccount | null>("/api/organizers/profile/payout-account");
export const savePayoutAccount = (body: { bankName: string; accountHolder: string; iban: string }) =>
  api<PayoutAccount>("/api/organizers/profile/payout-account", { method: "PUT", body });
export const getVerificationRequests = (page = 0) =>
  api<Page<VerificationRequest>>(`/api/organizers/verification-requests?page=${page}&size=20`);
export const reviewVerification = (profileId: number, approved: boolean, note: string) =>
  api<OrganizerProfile>(`/api/organizers/${profileId}/verification`, { method: "POST", body: { approved, note } });
