/**
 * TrueLayer Banking Service
 * Handles Open Banking integration with TrueLayer API
 */

import { Env } from '../types';

// TrueLayer API Configuration
const TRUELAYER_AUTH_URL = 'https://auth.truelayer-sandbox.com';
const TRUELAYER_API_URL = 'https://api.truelayer-sandbox.com';

// Types
export interface TrueLayerConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface AuthorizationResponse {
  code: string;
  scope: string;
  state?: string;
}

export interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
  scope: string;
}

export interface BankAccount {
  account_id: string;
  account_type: string;
  display_name: string;
  currency: string;
  account_number?: {
    iban?: string;
    number?: string;
    sort_code?: string;
  };
  provider: {
    provider_id: string;
    display_name: string;
    logo_uri: string;
  };
  update_timestamp: string;
}

export interface Transaction {
  transaction_id: string;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_category: string;
  merchant_name?: string;
  running_balance?: {
    amount: number;
    currency: string;
  };
  meta?: {
    provider_transaction_id: string;
  };
}

export interface TransactionsResponse {
  results: Transaction[];
  status: string;
}

/**
 * TrueLayer Banking Service Class
 */
export class TrueLayerService {
  private config: TrueLayerConfig;

  constructor(env: Env['Bindings']) {
    this.config = {
      clientId: env.TRUELAYER_CLIENT_ID,
      clientSecret: env.TRUELAYER_CLIENT_SECRET,
      redirectUri: env.TRUELAYER_REDIRECT_URI,
    };
  }

  /**
   * Generate authorization URL for user to connect their bank
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'info accounts balance transactions offline_access',
      providers: 'uk-ob-all', // UK Open Banking providers
      ...(state && { state }),
    });

    return `${TRUELAYER_AUTH_URL}/?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<AccessTokenResponse> {
    const response = await fetch(`${TRUELAYER_AUTH_URL}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AccessTokenResponse> {
    const response = await fetch(`${TRUELAYER_AUTH_URL}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    return response.json();
  }

  /**
   * Get all bank accounts for a connected user
   */
  async getAccounts(accessToken: string): Promise<BankAccount[]> {
    const response = await fetch(`${TRUELAYER_API_URL}/data/v1/accounts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch accounts: ${error}`);
    }

    const data = (await response.json()) as { results: BankAccount[] };
    return data.results || [];
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accessToken: string, accountId: string): Promise<number> {
    const response = await fetch(
      `${TRUELAYER_API_URL}/data/v1/accounts/${accountId}/balance`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch balance: ${error}`);
    }

    const data = (await response.json()) as { results: Array<{ current: number }> };
    return data.results[0]?.current || 0;
  }

  /**
   * Get transactions for an account
   * @param accessToken TrueLayer access token
   * @param accountId TrueLayer account ID
   * @param fromDate ISO date string (e.g., '2025-01-01')
   * @param toDate ISO date string (e.g., '2025-12-31')
   */
  async getTransactions(
    accessToken: string,
    accountId: string,
    fromDate: string,
    toDate: string
  ): Promise<Transaction[]> {
    const params = new URLSearchParams({
      from: fromDate,
      to: toDate,
    });

    const response = await fetch(
      `${TRUELAYER_API_URL}/data/v1/accounts/${accountId}/transactions?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch transactions: ${error}`);
    }

    const data: TransactionsResponse = await response.json();
    return data.results || [];
  }

  /**
   * Get pending transactions
   */
  async getPendingTransactions(
    accessToken: string,
    accountId: string
  ): Promise<Transaction[]> {
    const response = await fetch(
      `${TRUELAYER_API_URL}/data/v1/accounts/${accountId}/transactions/pending`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      // Not all providers support pending transactions
      return [];
    }

    const data: TransactionsResponse = await response.json();
    return data.results || [];
  }

  /**
   * Revoke access token (disconnect bank)
   */
  async revokeToken(accessToken: string): Promise<void> {
    const response = await fetch(`${TRUELAYER_AUTH_URL}/connect/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        token: accessToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to revoke token: ${error}`);
    }
  }
}
