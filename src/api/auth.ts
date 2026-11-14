import { api } from "./client";
import type { AuthResponse, User } from "./types";

// POST /api/auth/login  body: { email, password }
export const login = (email: string, password: string) =>
  api<AuthResponse>("/api/auth/login", { method: "POST", body: { email, password } });

// POST /api/auth/register  body: { email, password }  (password: 6+ characters)
export const register = (email: string, password: string) =>
  api<AuthResponse>("/api/auth/register", { method: "POST", body: { email, password } });

// GET /api/users/me — who is logged in (needs the token)
export const getMe = () => api<User>("/api/users/me");

export const verifyEmail = (token: string) => api<void>("/api/auth/verify-email", { method: "POST", body: { token } });
export const resendVerification = (email: string) => api<void>("/api/auth/resend-verification", { method: "POST", body: { email } });
export const forgotPassword = (email: string) => api<void>("/api/auth/forgot-password", { method: "POST", body: { email } });
export const resetPassword = (token: string, newPassword: string) => api<void>("/api/auth/reset-password", { method: "POST", body: { token, newPassword } });
