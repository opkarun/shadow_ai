/**
 * Gmail OAuth Service
 *
 * Handles Google OAuth 2.0 flow for Gmail integration.
 * Manages authorization URL generation, token exchange, and token storage.
 */

import { URL } from "url";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  expiresAt: number;
  scopes: string[];
}

// In-memory token storage (mock - in production, use secure database)
const tokenStore = new Map<string, OAuthTokens>();

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export function getGmailOAuthConfig(): OAuthConfig {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Gmail OAuth configuration missing: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI required"
    );
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Generate Google OAuth authorization URL
 */
export function generateAuthorizationUrl(state: string): string {
  const config = getGmailOAuthConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    state: state,
    access_type: "offline",
    prompt: "consent",
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  state: string
): Promise<{ tokens: OAuthTokens; userId: string }> {
  const config = getGmailOAuthConfig();

  const tokenParams = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(
        `Token exchange failed: ${errorData.error || tokenResponse.statusText}`
      );
    }

    const data = await tokenResponse.json();

    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresIn: data.expires_in || 3600,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      scopes: GMAIL_SCOPES,
    };

    // Generate a user ID (in production, fetch from Gmail API or use authenticated user ID)
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store tokens in mock storage
    tokenStore.set(userId, tokens);

    return { tokens, userId };
  } catch (error) {
    throw new Error(
      `Failed to exchange code for tokens: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<OAuthTokens> {
  const config = getGmailOAuthConfig();

  const tokenParams = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(
        `Token refresh failed: ${errorData.error || tokenResponse.statusText}`
      );
    }

    const data = await tokenResponse.json();

    return {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Keep the original refresh token
      expiresIn: data.expires_in || 3600,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      scopes: GMAIL_SCOPES,
    };
  } catch (error) {
    throw new Error(
      `Failed to refresh access token: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Store tokens for a user (mock implementation)
 */
export function storeTokens(userId: string, tokens: OAuthTokens): void {
  tokenStore.set(userId, tokens);
}

/**
 * Get stored tokens for a user (mock implementation)
 */
export function getStoredTokens(userId: string): OAuthTokens | null {
  return tokenStore.get(userId) || null;
}

/**
 * Check if tokens are still valid
 */
export function areTokensValid(tokens: OAuthTokens): boolean {
  return Date.now() < tokens.expiresAt;
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  userId: string
): Promise<string | null> {
  const tokens = getStoredTokens(userId);

  if (!tokens) {
    return null;
  }

  if (areTokensValid(tokens)) {
    return tokens.accessToken;
  }

  if (!tokens.refreshToken) {
    return null;
  }

  try {
    const refreshedTokens = await refreshAccessToken(tokens.refreshToken);
    storeTokens(userId, refreshedTokens);
    return refreshedTokens.accessToken;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}
