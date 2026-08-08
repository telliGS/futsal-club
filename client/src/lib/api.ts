// En desarrollo usa el proxy de Vite (/api -> localhost:4000).
// En producción usa VITE_API_URL (la URL del backend desplegado).
export const API = import.meta.env.VITE_API_URL ?? "/api";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = "Error de red";
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      /* noop */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function getToken(): string | null {
  return localStorage.getItem("jh_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("jh_token", token);
  else localStorage.removeItem("jh_token");
}