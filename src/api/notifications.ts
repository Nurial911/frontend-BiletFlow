import { api } from "./client";
import type { Page } from "./types";
export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  orderId?: number;
  readAt?: string;
  createdAt: string;
}
export const getNotifications = (page = 0) => api<Page<Notification>>(`/api/notifications?page=${page}&size=20`);
export const getUnreadCount = () => api<{ unread: number }>("/api/notifications/unread-count");
export const markNotificationRead = (id: number) => api<Notification>(`/api/notifications/${id}/read`, { method: "POST" });
export const markAllNotificationsRead = () => api<void>("/api/notifications/read-all", { method: "POST" });
