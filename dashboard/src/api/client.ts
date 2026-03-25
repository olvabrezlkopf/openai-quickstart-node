const BASE_URL = "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || error.error?.message || "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request("/admin/auth/logout", { method: "POST" }),

  // Teams
  getTeams: () => request<any[]>("/admin/teams"),
  createTeam: (data: { name: string; budget_eur: number }) =>
    request("/admin/teams", { method: "POST", body: JSON.stringify(data) }),
  updateTeam: (id: string, data: any) =>
    request(`/admin/teams/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTeam: (id: string) =>
    request(`/admin/teams/${id}`, { method: "DELETE" }),

  // API Keys
  getKeys: (teamId: string) => request<any[]>(`/admin/teams/${teamId}/keys`),
  createKey: (teamId: string, data: { label: string }) =>
    request(`/admin/teams/${teamId}/keys`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  revokeKey: (teamId: string, keyId: string) =>
    request(`/admin/teams/${teamId}/keys/${keyId}`, { method: "DELETE" }),

  // Usage
  getUsage: (params?: { team_id?: string; days?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.team_id) searchParams.set("team_id", params.team_id);
    if (params?.days) searchParams.set("days", String(params.days));
    const qs = searchParams.toString();
    return request<any>(`/admin/usage${qs ? `?${qs}` : ""}`);
  },

  // Logs
  getLogs: (params?: { team_id?: string; model_alias?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.team_id) searchParams.set("team_id", params.team_id);
    if (params?.model_alias) searchParams.set("model_alias", params.model_alias);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const qs = searchParams.toString();
    return request<any[]>(`/admin/logs${qs ? `?${qs}` : ""}`);
  },

  // Budgets
  getBudgets: () => request<any[]>("/admin/budgets"),

  // Models
  getModels: () => request<any[]>("/admin/models"),
  createModel: (data: any) =>
    request("/admin/models", { method: "POST", body: JSON.stringify(data) }),
  updateModel: (id: number, data: any) =>
    request(`/admin/models/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteModel: (id: number) =>
    request(`/admin/models/${id}`, { method: "DELETE" }),

  // Health
  getHealth: () => request<{ status: string; version: string }>("/health"),
};
