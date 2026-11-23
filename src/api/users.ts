import { api } from "./client";
import type { Page, User } from "./types";

export interface UpdateUserRequest {
  email?: string;
  password?: string;
}

export const changeUserRole = (userId: number, role: string) =>
  api<User>(`/api/users/${userId}/role`, { method: "PUT", body: { role } });

export const getUsers = (page = 0, size = 20, filters: { q?: string; role?: string; suspended?: string } = {}) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  Object.entries(filters).forEach(([key,value]) => { if (value) params.set(key,value); });
  return api<Page<User>>(`/api/users?${params}`);
};
export const setUserSuspended = (id: number, suspended: boolean, reason?: string) =>
  api<User>(`/api/users/${id}/${suspended ? "suspend" : "unsuspend"}`, { method: "POST", ...(suspended ? { body: { reason } } : {}) });

export const updateUser = (userId: number, request: UpdateUserRequest) =>
  api<User>(`/api/users/${userId}`, { method: "PUT", body: request });

export const updateMyCredentials = (request: UpdateUserRequest) =>
  api<User>("/api/users/me/credentials", { method: "PUT", body: request });

export const deleteMyAccount = () =>
  api<void>("/api/users/me", { method: "DELETE" });

export const deleteUser = (userId: number) =>
  api<void>(`/api/users/${userId}`, { method: "DELETE" });
