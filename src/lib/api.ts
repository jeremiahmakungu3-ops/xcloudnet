/**
 * XCLOUD.NET — Frontend API Client
 * Automatically attaches JWT Bearer token and handles API requests
 */

export class ApiClient {
  private static token: string | null = localStorage.getItem('xcloud_token');

  public static setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('xcloud_token', token);
    } else {
      localStorage.removeItem('xcloud_token');
    }
  }

  public static getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('xcloud_token');
    }
    return this.token;
  }

  public static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.error) errorMessage = errorJson.error;
      } catch (_) {}
      throw new Error(errorMessage);
    }

    return res.json() as Promise<T>;
  }

  public static get<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public static post<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static put<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static patch<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
