import { useAuthStore } from "../store/auth";

// VITE_API_URL is the API ORIGIN (e.g. https://xxx.awsapprunner.com); "/api" is always appended.
// Dev: unset → "" + "/api" = "/api" (Vite proxy). Prod: origin + "/api".
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "").replace(/\/api$/, "") + "/api";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error ?? "Request failed") as Error & {
      status: number;
      body: unknown;
    };
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return res.json() as Promise<T>;
}

async function uploadFile<T>(path: string, file: File, field = "image"): Promise<T> {
  const token = useAuthStore.getState().token;
  const fd = new FormData();
  fd.append(field, file);
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(typeof body.error === "string" ? body.error : "Upload failed") as Error & {
      status: number;
      body: unknown;
    };
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json() as Promise<T>;
}

/** Human-readable message from an api error, expanding Zod field errors. */
export function apiErrorMessage(err: unknown): string {
  const e = err as { message?: string; body?: { error?: { fieldErrors?: Record<string, string[]> } | string } };
  const fe = typeof e?.body?.error === "object" ? e.body?.error?.fieldErrors : undefined;
  if (fe && Object.keys(fe).length) {
    return Object.entries(fe)
      .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
      .join(" · ");
  }
  return e?.message && e.message !== "[object Object]" ? e.message : "Something went wrong";
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, file: File, field = "image") => uploadFile<T>(path, file, field),
};
