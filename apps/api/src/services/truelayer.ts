/**
 * TrueLayer API Service
 * Handles OAuth flow, token management, and data fetching from TrueLayer
 */

interface TrueLayerTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface TrueLayerAccount {
  account_id: string;
  account_type: string;
  display_name?: string;
  currency: string;
  account_number?: {
    iban?: string;
    number?: string;
    sort_code?: string;
    swift_bic?: string;
  };
  provider?: {
    provider_id: string;
    display_name: string;
  };
  update_timestamp: string;
}

interface TrueLayerTransaction {
  transaction_id: string;
  timestamp: string;
  description: string;
  transaction_type: string;
  transaction_category: string;
  transaction_classification: string[];
  amount: number;
  currency: string;
  meta?: {
    provider_transaction_id?: string;
    provider_reference?: string;
    [key: string]: any;
  };
  running_balance?: {
    amount: number;
    currency: string;
  };
}

interface TrueLayerMetadata {
  credentials_id: string;
  provider?: {
    provider_id: string;
    display_name: string;
    logo_uri?: string;
  };
}

export class TrueLayerService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private baseUrl: string = 'https://api.truelayer.com';
  private authUrl: string = 'https://auth.truelayer.com';

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  /**
   * Generate TrueLayer authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'info accounts transactions balance offline_access',
      state,
      providers: 'uk-ob-all uk-oauth-all', // All UK banks
    });

    return `${this.authUrl}/?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<TrueLayerTokenResponse> {
    const response = await fetch(`${this.authUrl}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TrueLayerTokenResponse> {
    const response = await fetch(`${this.authUrl}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get account metadata (provider info, credentials ID)
   */
  async getAccountsMetadata(accessToken: string): Promise<TrueLayerMetadata> {
    const response = await fetch(`${this.baseUrl}/data/v1/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Metadata fetch failed: ${error}`);
    }

    const data = (await response.json()) as any;
    return {
      credentials_id: data.credentials_id || crypto.randomUUID(),
      provider: data.provider,
    };
  }

  /**
   * Fetch all accounts for the authenticated user
   */
  async getAccounts(accessToken: string): Promise<TrueLayerAccount[]> {
    const response = await fetch(`${this.baseUrl}/data/v1/accounts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Accounts fetch failed: ${error}`);
    }

    const data = (await response.json()) as any;
    return data.results || [];
  }

  /**
   * Fetch account balance
   */
  async getAccountBalance(accessToken: string, accountId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/data/v1/accounts/${accountId}/balance`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Balance fetch failed: ${error}`);
    }

    const data = (await response.json()) as any;
    return data.results?.[0];
  }

  /**
   * Fetch transactions for an account
   * @param from ISO date string (e.g., '2024-01-01')
   * @param to ISO date string (e.g., '2024-12-31')
   */
  async getTransactions(
    accessToken: string,
    accountId: string,
    from: string,
    to: string
  ): Promise<TrueLayerTransaction[]> {
    const url = `${this.baseUrl}/data/v1/accounts/${accountId}/transactions`;
    const params = new URLSearchParams({ from, to });

    const response = await fetch(`${url}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Transactions fetch failed: ${error}`);
    }

    const data = (await response.json()) as any;
    return data.results || [];
  }

  /**
   * Get all pending transactions
   */
  async getPendingTransactions(accessToken: string, accountId: string): Promise<TrueLayerTransaction[]> {
    const response = await fetch(
      `${this.baseUrl}/data/v1/accounts/${accountId}/transactions/pending`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      // Pending transactions may not be supported by all providers
      if (response.status === 404) {
        return [];
      }
      const error = await response.text();
      throw new Error(`Pending transactions fetch failed: ${error}`);
    }

    const data = (await response.json()) as any;
    return data.results || [];
  }
}
