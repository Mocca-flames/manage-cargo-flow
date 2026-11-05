import { client } from "../api/client";
import type { components } from "../api/schema";
import { getDeviceToken, setDeviceToken, setToken } from "./token";
import type { AuthUser } from "./types";

type TokenOut = components["schemas"]["TokenOut"];

export type LoginResult = { otpRequired: false } | { otpRequired: true; message: string };

function storeTokens(tokens: TokenOut) {
  setToken(tokens.access_token);
  if (tokens.device_token) setDeviceToken(tokens.device_token);
}

export async function requestToken(email: string, password: string): Promise<LoginResult> {
  const { data, error } = await client.POST("/auth/login", {
    body: { email, password, device_token: getDeviceToken() ?? undefined },
  });
  if (error || !data) throw error ?? new Error("Login failed");
  // OTP step required (or a trusted device already got us straight tokens).
  if (data.otp_required || !data.tokens) {
    return { otpRequired: true, message: data.message ?? "Verification code sent to your email" };
  }
  storeTokens(data.tokens);
  return { otpRequired: false };
}

export async function verifyLoginOtp(email: string, code: string, rememberDevice: boolean): Promise<void> {
  const { data, error } = await client.POST("/auth/verify-otp", {
    body: { email, code, remember_device: rememberDevice },
  });
  if (error || !data) throw error ?? new Error("Verification failed");
  storeTokens(data);
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data, error } = await client.GET("/auth/me");
  if (error || !data) throw error ?? new Error("Could not load user");
  return data as AuthUser;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const { data, error } = await client.POST("/auth/change-password", {
    body: { current_password: oldPassword, new_password: newPassword },
  });
  if (error || !data) throw error ?? new Error("Password change failed");
  // The server bumps token_version here, killing the old token — store the fresh one.
  storeTokens(data);
}
