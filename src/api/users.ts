import { api } from "./client";
import type { Page, User } from "./types";

export interface UpdateUserRequest {
  email?: string;
  password?: string;
}

export const changeUserRole = (userId: number, role: string) =>
  api<User>(`/api/users/${userId}/role`, { method: "PUT", body: { role } });

export const getUsers = (page = 0, size = 20) =>
  api<Page<User>>(`/api/users?page=${page}&size=${size}`);

export const updateUser = (userId: number, request: UpdateUserRequest) =>
  api<User>(`/api/users/${userId}`, { method: "PUT", body: request });

export const updateMyCredentials = (request: UpdateUserRequest) =>
  api<User>("/api/users/me/credentials", { method: "PUT", body: request });

export const deleteMyAccount = () =>
  api<void>("/api/users/me", { method: "DELETE" });

export const deleteUser = (userId: number) =>
  api<void>(`/api/users/${userId}`, { method: "DELETE" });
