import type { Env } from '../types';

const PROD_AUTH_BASE = 'https://auth.truelayer.com';
const PROD_API_BASE = 'https://api.truelayer.com/data/v1';
const SANDBOX_AUTH_BASE = 'https://auth.truelayer-sandbox.com';
const SANDBOX_API_BASE = 'https://api.truelayer-sandbox.com/data/v1';

export interface TrueLayerTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface TrueLayerAccountNumber {
  iban?: string;
  number?: string;
  sort_code?: string;
  swift_bic?: string;
}

export interface TrueLayerAccountProvider {
  display_name?: string;
  provider_id?: string;
  logo_uri?: string;
}

export interface TrueLayerAccount {
  account_id: string;
  account_type?: string;
  account_subtype?: string;
  currency?: string;
  display_name?: string;
  account_number?: TrueLayerAccountNumber;
  provider?: TrueLayerAccountProvider;
}

export interface TrueLayerBalance {
  currency: string;
  available?: number;
  current?: number;
  overdraft?: number;
  update_timestamp?: string;
}

export interface TrueLayerTransaction {
  transaction_id: string;
  amount: number;
  currency: string;
  description: string;
  timestamp?: string;
  booking_date?: string;
  merchant_name?: string;
  transaction_type?: 'DEBIT' | 'CREDIT';
  provider_transaction_category?: string;
  meta?: Record<string, unknown>;
}

export interface TrueLayerInfo {
  user_id?: string;
  consent_id?: string;
  expires_at?: string;
  scope?: string[];
  client_id?: string;
}

interface AuthorizationUrlOptions {
  scope?: string;
  state: string;
  nonce: string;
  enableMock?: boolean;
}

export class TrueLayerService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(env: Env['Bindings']) {
    this.clientId = env.TRUELAYER_CLIENT_ID;
    this.clientSecret = env.TRUELAYER_CLIENT_SECRET;
    this.redirectUri = env.TRUELAYER_REDIRECT_URI;
  }

  private get authBase(): string {
    const redirect = this.redirectUri.toLowerCase();
    if (redirect.includes('localhost') || redirect.includes('127.0.0.1')) {
      return SANDBOX_AUTH_BASE;
    }
    return PROD_AUTH_BASE;
  }

  private get apiBase(): string {
    const redirect = this.redirectUri.toLowerCase();
    if (redirect.includes('localhost') || redirect.includes('127.0.0.1')) {
      return SANDBOX_API_BASE;
    }
    return PROD_API_BASE;
  }

  createAuthorizationUrl({ state, nonce, scope = 'accounts balance transactions', enableMock }: AuthorizationUrlOptions): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope,
      providers: 'uk-ob-all',
      state,
      nonce,
    });

    if (enableMock) {
      params.set('enable_mock', 'true');
    }

    return `${this.authBase}/?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<TrueLayerTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
    });

    const response = await fetch(`${this.authBase}/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TrueLayer token exchange failed (${response.status}): ${text}`);
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<TrueLayerTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    const response = await fetch(`${this.authBase}/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TrueLayer token refresh failed (${response.status}): ${text}`);
    }

    return response.json();
  }

  async revokeToken(refreshToken: string): Promise<void> {
    const body = new URLSearchParams({
      token: refreshToken,
      token_type_hint: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(`${this.authBase}/connect/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TrueLayer token revocation failed (${response.status}): ${text}`);
    }
  }

  async getInfo(accessToken: string): Promise<TrueLayerInfo | null> {
    const response = await fetch(`${this.apiBase}/info`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TrueLayer info request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as any;
    const results: TrueLayerInfo[] = data.results || [];
    return results[0] ?? null;
  }

  async getAccounts(accessToken: string): Promise<TrueLayerAccount[]> {
    const response = await fetch(`${this.apiBase}/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TrueLayer accounts request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as any;
    return data.results || [];
  }

  async getAccountBalance(accessToken: string, accountId: string): Promise<TrueLayerBalance | null> {
    const response = await fetch(`${this.apiBase}/accounts/${accountId}/balance`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TrueLayer balance request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as any;
    const results: { currency: string; available: number; current: number }[] = data.results || [];
    if (results.length === 0) {
      return null;
    }

    const balance = results[0];
    return {
      currency: balance.currency,
      available: balance.available,
      current: balance.current,
    };
  }

  async getTransactions(accessToken: string, accountId: string, from: string, to: string): Promise<TrueLayerTransaction[]> {
    const results: TrueLayerTransaction[] = [];
    let nextUrl: string | null = `${this.apiBase}/accounts/${accountId}/transactions?from=${from}&to=${to}`;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`TrueLayer transactions request failed (${response.status}): ${text}`);
      }

      const data = (await response.json()) as any;
      const pageResults: TrueLayerTransaction[] = data.results || [];
      results.push(...pageResults);
      nextUrl = data.next_page ?? null;
    }

    return results;
  }
}
