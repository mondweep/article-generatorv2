
import { config } from "./config.ts";
import { serve } from "$std/http/server.ts";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string; // Only provided on initial authorization
  scope: string;
  token_type: string; // Typically "Bearer"
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string | null; // Store refresh token persistently
  expiresAt: number; // Timestamp when access token expires
}

// In-memory storage for the current access token details
let currentTokens: StoredTokens | null = null;

/**
 * Generates the Google OAuth 2.0 Authorization URL.
 * Users need to visit this URL to grant permissions.
 */
export function getAuthorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.googleScopes,
    access_type: "offline", // Request refresh token
    prompt: "consent", // Force consent screen even if previously approved
  });
  return `${config.googleAuthUrl}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access and refresh tokens.
 * @param code The authorization code obtained from the user redirect.
 */
export async function exchangeCodeForTokens(code: string): Promise<StoredTokens> {
  const tokenUrl = config.googleOauth2Url + "/token";
  const requestBody = new URLSearchParams({
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    code: code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });

  console.log(`DEBUG: Attempting to exchange code for tokens at: ${tokenUrl}`);
  console.log(`DEBUG: Request body: ${requestBody.toString()}`);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    // Use the requestBody variable defined earlier
    body: requestBody,
  });

  console.log(`DEBUG: Token exchange response status: ${response.status} ${response.statusText}`);
  const responseBodyText = await response.text(); // Read body text first
  console.log(`DEBUG: Token exchange response body: ${responseBodyText}`);

  if (!response.ok) {
    // Error already logged above, just throw
    throw new Error(
      `Failed to exchange code for tokens: ${response.status} ${response.statusText} - ${responseBodyText}`,
    );
  }

  // Try parsing the logged body text as JSON
  let tokenData: TokenResponse;
  try {
    tokenData = JSON.parse(responseBodyText);
  } catch (parseError) {
    console.error("DEBUG: Failed to parse token response body as JSON:", parseError);
    throw new Error(`Failed to parse token response JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }

  const tokens: StoredTokens = {
    accessToken: tokenData.access_token,
    // Refresh token is only sent the first time, store it if received
    refreshToken: tokenData.refresh_token ?? config.googleRefreshToken ?? null,
    expiresAt: Date.now() + (tokenData.expires_in * 1000),
  };

  // Store tokens (in memory for now, potentially save refresh token to .env or file)
  currentTokens = tokens;
  if (tokens.refreshToken) {
    // TODO: Implement secure storage/update of the refresh token (e.g., update .env or save to token.json)
    console.warn(
      `Received new refresh token. Store this securely: ${tokens.refreshToken}`,
    );
    // For now, we assume the user manually updates .env if a new one is issued.
  }

  console.log("Access token obtained successfully.");
  return tokens;
}

/**
 * Starts a temporary local HTTP server to listen for the OAuth callback,
 * extracts the authorization code, and returns it.
 * @returns A promise that resolves with the authorization code.
 */
async function startLocalServerForCode(): Promise<string> {
  console.log(`Starting temporary server on ${config.redirectUri}...`);

  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const { signal } = controller;

    serve(async (req) => {
        const url = new URL(req.url, `http://${req.headers.get("host")}`);
        console.log(`Received request: ${url.pathname}`);

        if (url.pathname === "/oauth/callback") {
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");

          if (error) {
            console.error(`OAuth Error received: ${error}`);
            reject(new Error(`OAuth failed: ${error}`));
            // Send a response to the browser
            return new Response(`Authorization failed: ${error}. You can close this tab.`, { status: 400 });
          }

          if (code) {
            console.log("Authorization code received successfully.");
            resolve(code); // Resolve the promise with the code
            // Send a response to the browser AFTER resolving
            const successResponse = new Response("Authorization successful! You can close this tab.", { status: 200 });
            // Attempt to gracefully shut down the server *after* resolving
            setTimeout(() => {
                if (!signal.aborted) {
                    console.log("DEBUG: Aborting server controller after successful code resolution.");
                    controller.abort();
                }
            }, 100); // Small delay to ensure promise resolution propagates
            return successResponse;
          } else {
            console.error("Callback received but no authorization code found.");
            reject(new Error("No authorization code received in callback."));
            return new Response("Callback received but no authorization code found. You can close this tab.", { status: 400 });
          }
        }
        // Handle other paths or favicon requests gracefully
        return new Response("Not Found", { status: 404 });
      }, {
        port: 8080, // Ensure this matches the port in config.redirectUri
        signal,
        onListen: ({ hostname, port }) => {
          console.log(`Listening on http://${hostname}:${port}`);
          // Now that the server is listening, prompt the user
          const authUrl = getAuthorizationUrl();
          console.log(`\nPlease visit this URL to authorize:\n${authUrl}`);
        },
      }
    ).finally(() => {
        console.log("Temporary server stopped.");
    });

    // Ensure the server stops once the code is resolved or rejected
    // Removed Promise.race as resolve/reject handle shutdown logic now
  });
}


/**
 * Refreshes the access token using the stored refresh token.
 */
export async function refreshAccessToken(): Promise<StoredTokens> {
  const refreshToken = currentTokens?.refreshToken ?? config.googleRefreshToken;
  if (!refreshToken) {
    throw new Error(
      "No refresh token available. Re-authorization required.",
    );
  }

  console.log("Refreshing access token...");
  const response = await fetch(config.googleOauth2Url + "/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    // If refresh fails (e.g., token revoked), re-authorization is needed.
    currentTokens = null; // Invalidate current tokens
    throw new Error(
      `Failed to refresh access token: ${response.status} ${response.statusText} - ${errorBody}. Re-authorization required.`,
    );
  }

  const tokenData: TokenResponse = await response.json();

  // Update stored tokens
  currentTokens = {
    accessToken: tokenData.access_token,
    refreshToken: refreshToken, // Refresh token remains the same
    expiresAt: Date.now() + (tokenData.expires_in * 1000),
  };

  console.log("Access token refreshed successfully.");
  return currentTokens;
}

/**
 * Gets a valid access token, refreshing if necessary.
 * This is the main function external modules should call.
 */
export async function getValidAccessToken(): Promise<string> {
  // Try loading refresh token from config if not in memory
  if (!currentTokens && config.googleRefreshToken) {
      currentTokens = {
          accessToken: "", // Will be refreshed immediately
          refreshToken: config.googleRefreshToken,
          expiresAt: 0, // Expired
      };
  }

  if (!currentTokens || !currentTokens.refreshToken) {
      // Initiate authorization flow if no tokens/refresh token exist
      console.log("Authorization required.");
      const authUrl = getAuthorizationUrl();
      console.log(`Please visit this URL to authorize:\n${authUrl}`);

      // In a real CLI app, you'd prompt the user here.
      // Start local server to wait for the authorization code
      try {
        const code = await startLocalServerForCode();
        console.log(`DEBUG: startLocalServerForCode returned code: ${code ? '******' : 'null/undefined'}`); // Log if code was received
        if (!code) throw new Error("startLocalServerForCode did not return a code.");

        await exchangeCodeForTokens(code);
        // After successful exchange, currentTokens should be populated
        if (!currentTokens) {
            throw new Error("Token exchange succeeded but tokens were not stored.");
        }
      } catch (error) {
          console.error("Authorization flow failed:", error);
          throw new Error(`Authorization failed: ${error instanceof Error ? error.message : String(error)}`);
      }
  }

  // Check if the current access token is expired or close to expiring (e.g., within 60 seconds)
  const buffer = 60 * 1000; // 60 seconds buffer
  if (Date.now() >= currentTokens.expiresAt - buffer) {
    await refreshAccessToken();
  }

  if (!currentTokens?.accessToken) {
      throw new Error("Failed to obtain a valid access token after refresh attempt.");
  }

  return currentTokens.accessToken;
}

// Example of how to initiate the flow manually if needed:
// async function runAuthFlow() {
//     const authUrl = getAuthorizationUrl();
//     console.log(`Please visit this URL to authorize:\n${authUrl}`);
//     const code = prompt("Enter the authorization code:");
//     if (code) {
//         try {
//             await exchangeCodeForTokens(code);
//             console.log("Authorization successful!");
//         } catch (error) {
//             console.error("Authorization failed:", error);
//         }
//     } else {
//         console.log("Authorization cancelled.");
//     }
// }
// Consider calling runAuthFlow() from main.ts if no refresh token exists.
