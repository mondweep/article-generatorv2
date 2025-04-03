import { Handlers } from "$fresh/server.ts";
import { exchangeCodeForTokens } from "../../backend/auth.ts";

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      console.error(`OAuth callback error: ${error}`);
      // Redirect back to home page with error status
      return new Response(null, {
        status: 302, // Found (Redirect)
        headers: { "Location": "/?auth_status=error" },
      });
    }

    if (!code) {
      console.error("OAuth callback: No authorization code received.");
      // Redirect back to home page with error status
      return new Response(null, {
        status: 302,
        headers: { "Location": "/?auth_status=error" },
      });
    }

    try {
      console.log("OAuth callback: Exchanging code for tokens...");
      const tokens = await exchangeCodeForTokens(code);

      if (tokens.refreshToken) {
        // IMPORTANT: Log the refresh token securely on the server console
        // The user needs to manually add this to the .env file
        console.log("\n***********************************************************");
        console.log(" NEW REFRESH TOKEN OBTAINED - ADD TO .env FILE:");
        console.log(` GOOGLE_REFRESH_TOKEN=${tokens.refreshToken}`);
        console.log("***********************************************************\n");
      } else {
        console.warn("OAuth callback: Token exchange successful, but no refresh token received (might happen on subsequent authorizations).");
      }

      // Redirect back to home page with success status
      return new Response(null, {
        status: 302,
        headers: { "Location": "/?auth_status=success" },
      });

    } catch (exchangeError) {
      console.error("OAuth callback: Error exchanging code for tokens:", exchangeError);
      // Redirect back to home page with error status
      return new Response(null, {
        status: 302,
        headers: { "Location": "/?auth_status=error" },
      });
    }
  },
};
