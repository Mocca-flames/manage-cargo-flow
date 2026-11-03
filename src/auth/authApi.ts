import { client } from "../api/client";
import type { AuthUser } from "./types";

export async function requestToken(email: string, password: string): Promise<string> {
  const res: any = await (client as any).POST("/auth/login", {
    body: new URLSearchParams({ username: email, password }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (res.error || !res.data) throw res.error ?? new Error("Login failed");
  const d: any = res.data;
  return d.access_token ?? d.token ?? d.accessToken;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res: any = await (client as any).GET("/auth/me");
  if (res.error || !res.data) throw res.error ?? new Error("Could not load user");
  return res.data as AuthUser;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const res: any = await (client as any).POST("/auth/change-password", {
    body: { old_password: oldPassword, new_password: newPassword },
  });
  if (res.error) throw res.error;
}
