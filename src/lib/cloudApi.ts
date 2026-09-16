import type { AppState } from "../types";

const TOKEN_KEY = "lube-oil-cloud-token-v1";

/** Build-time hint — runtime probe via {@link probeCloudApi} is the primary signal. */
export function isCloudBuildFlag(): boolean {
  const v = String(import.meta.env.VITE_CLOUD_MODE ?? "").toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return false;
}

export function isCloudBuildDisabled(): boolean {
  return String(import.meta.env.VITE_CLOUD_MODE ?? "").toLowerCase() === "false";
}

/** Returns true when the Vercel `/api/ping` route is reachable. */
export async function probeCloudApi(): Promise<boolean> {
  try {
    const res = await fetch("/api/ping", { method: "GET" });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean; route?: string };
    return body.ok === true && body.route === "ping";
  } catch {
    return false;
  }
}

/** Returns server env readiness (no secrets exposed). */
export async function probeCloudHealth(): Promise<{
  ok: boolean;
  database: boolean;
  authSecret: boolean;
  teamPassword: boolean;
}> {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return { ok: false, database: false, authSecret: false, teamPassword: false };
    const body = (await res.json()) as {
      ok?: boolean;
      database?: boolean;
      authSecret?: boolean;
      teamPassword?: boolean;
    };
    return {
      ok: Boolean(body.ok),
      database: Boolean(body.database),
      authSecret: Boolean(body.authSecret),
      teamPassword: Boolean(body.teamPassword),
    };
  } catch {
    return { ok: false, database: false, authSecret: false, teamPassword: false };
  }
}

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getStoredToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }
  return { res, body: body as Record<string, unknown> };
}

export async function cloudLogin(
  identifier: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const { res, body } = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    return { ok: false, error: String(body.error ?? "Sign in failed.") };
  }
  const token = body.token as string | undefined;
  if (!token) return { ok: false, error: "No session token returned." };
  setStoredToken(token);
  return { ok: true };
}

export async function cloudLogout() {
  setStoredToken(null);
}

export async function cloudCheckSession(): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;
  const { res } = await apiFetch("/api/auth/session");
  if (!res.ok) {
    setStoredToken(null);
    return false;
  }
  return true;
}

export async function cloudLoadState(): Promise<{
  data: AppState | null;
  updatedAt: string | null;
  error?: string;
}> {
  const { res, body } = await apiFetch("/api/data");
  if (!res.ok) {
    return {
      data: null,
      updatedAt: null,
      error: String(body.error ?? "Failed to load data"),
    };
  }
  return {
    data: (body.data as AppState | null) ?? null,
    updatedAt: (body.updatedAt as string | null) ?? null,
  };
}

export async function cloudSaveState(
  data: AppState,
): Promise<{ ok: boolean; error?: string }> {
  const { res, body } = await apiFetch("/api/data", {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    return { ok: false, error: String(body.error ?? "Failed to save data") };
  }
  return { ok: true };
}

/** How often to check the server for updates from other users (milliseconds). */
export const CLOUD_POLL_MS = 20_000;
