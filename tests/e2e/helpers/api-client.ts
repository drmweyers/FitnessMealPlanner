/**
 * FORGE QA API Client — EvoFitMeals
 *
 * Typed HTTP client for API-level test operations (seeding, assertions).
 * Handles authentication, token refresh, and typed responses.
 */

import { BASE_URL, CREDENTIALS, API } from "./constants.js";

type Role = "trainer" | "customer" | "admin";

interface LoginResponse {
  // Direct format
  token?: string;
  accessToken?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
  // Wrapped format: { status, data: { accessToken, user } }
  status?: string;
  data?: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      role: string;
    };
  };
}

function extractToken(res: LoginResponse): string {
  // Handle wrapped format: { data: { accessToken } }
  if (res.data?.accessToken) return res.data.accessToken;
  // Handle direct format: { accessToken } or { token }
  if (res.accessToken) return res.accessToken;
  if (res.token) return res.token;
  throw new Error("No token found in login response: " + JSON.stringify(res));
}

interface ApiError {
  message: string;
  status: number;
}

export class ForgeApiClient {
  private baseUrl: string;
  private token: string | null;
  private role: Role | null;

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = baseUrl || BASE_URL;
    this.token = token || null;
    this.role = null;
  }

  /**
   * Create an authenticated client for a specific role.
   */
  static async loginAs(role: Role, baseUrl?: string): Promise<ForgeApiClient> {
    const client = new ForgeApiClient(baseUrl);
    client.role = role;
    const cred = CREDENTIALS[role];
    const res = await client.post<LoginResponse>(API.auth.login, {
      email: cred.email,
      password: cred.password,
    });
    client.token = extractToken(res);
    return client;
  }

  /**
   * Login with arbitrary credentials (for tier-specific accounts).
   */
  static async loginWith(
    email: string,
    password: string,
    baseUrl?: string,
  ): Promise<ForgeApiClient> {
    const client = new ForgeApiClient(baseUrl);
    const res = await client.post<LoginResponse>(API.auth.login, {
      email,
      password,
    });
    client.token = extractToken(res);
    return client;
  }

  get userId(): string {
    // Extracted during login — caller should read from seed-state.json instead
    throw new Error("Use loadSeedState() to get user IDs");
  }

  // ---------------------------------------------------------------------------
  // HTTP Methods
  // ---------------------------------------------------------------------------

  async get<T = unknown>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += `?${qs}`;
    }
    return this.request<T>("GET", url);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", `${this.baseUrl}${path}`, body);
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", `${this.baseUrl}${path}`, body);
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>("DELETE", `${this.baseUrl}${path}`);
  }

  /**
   * Raw fetch with status — for tests that need to assert on status codes.
   */
  async raw(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: unknown; headers: Headers }> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let responseBody: unknown;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      responseBody = await res.json();
    } else if (contentType.includes("application/pdf")) {
      responseBody = await res.arrayBuffer();
    } else {
      responseBody = await res.text();
    }

    return { status: res.status, body: responseBody, headers: res.headers };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && this.role) {
      // Try re-auth once
      const cred = CREDENTIALS[this.role];
      const loginRes = await fetch(`${this.baseUrl}${API.auth.login}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cred.email, password: cred.password }),
      });
      if (loginRes.ok) {
        const data = (await loginRes.json()) as LoginResponse;
        this.token = extractToken(data);
        headers["Authorization"] = `Bearer ${this.token}`;
        const retry = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!retry.ok) {
          throw await this.toError(retry);
        }
        return (await retry.json()) as T;
      }
    }

    if (!res.ok) {
      throw await this.toError(res);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }

  private async toError(res: Response): Promise<ApiError> {
    let message: string;
    try {
      const body = await res.json();
      message = body.message || body.error || JSON.stringify(body);
    } catch {
      message = await res.text();
    }
    return {
      message: `${res.status} ${res.statusText}: ${message}`,
      status: res.status,
    };
  }
}
