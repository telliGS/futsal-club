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
    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
      message = (body.error as string) ?? message;
    } catch {
      /* noop */
    }
    // arrastra code/playerId/equipoActual/etc. del server (ej. CAMBIO_PRIMERA)
    const err = new Error(message) as Error & Record<string, unknown>;
    Object.assign(err, body);
    err.status = res.status;
    throw err;
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