# Technical Documentation: Tone-Based Article Summarizer

## 1. Technology Stack

*   **Runtime:** Deno (v2.x recommended)
*   **Language:** TypeScript
*   **Key Deno Modules:**
    *   `deno.land/std/dotenv`: For loading `.env` files.
    *   `deno.land/std/http/server`: For the temporary OAuth callback server.
    *   `deno.land/std/async/delay`: For adding delays between requests.
    *   `deno.land/x/deno_dom`: For parsing HTML content extracted by the scraper.
*   **External APIs:**
    *   Google Drive API v3: Used for creating Google Docs.
    *   Google Docs API v1: Used for fetching content from native Google Docs.
    *   Google Gemini API (v1beta): Used for AI summarization and tone application.
    *   ScrapingBee API v1: Used as a fallback for web scraping difficult sites.
*   **Authentication:** Google OAuth 2.0 (Web Application flow)

## 2. Setup Details

*   **`.env` File:** Essential for storing sensitive credentials (Google Client ID/Secret, Google Refresh Token, Gemini API Key, ScrapingBee API Key) and configuration IDs (Drive Folder ID, Context Doc IDs). See `README.md` for structure.
*   **Google Cloud Credentials:** Requires **Web application** type OAuth 2.0 credentials with `http://localhost:8000/oauth/callback` added as an authorized redirect URI.
*   **Deno Permissions:** The script requires the following permissions when run:
    *   `--allow-read`: To read the `.env` file.
    *   `--allow-env`: To access environment variables (including those loaded from `.env`).
    *   `--allow-net`: To make calls to Google APIs, ScrapingBee API, and target article URLs, and to run the temporary OAuth server.

## 3. Module Breakdown

*   **`config.ts`:** Loads environment variables using `std/dotenv`'s `load({ export: true })` method, making them available via `Deno.env.get()`. Exports a structured `config` object.
*   **`auth.ts`:**
    *   Implements the OAuth 2.0 Web Application flow.
    *   `getAuthorizationUrl`: Constructs the URL for user consent, including necessary scopes (`drive.readonly`, `documents.readonly`, `drive.file`) and `access_type=offline` to request a refresh token.
    *   `startLocalServerForCode`: Uses `std/http`'s `serve` function to create a temporary server on port 8000. It listens for the callback to `/oauth/callback`, extracts the `code` parameter, resolves a promise with the code, and shuts down the server using an `AbortController`.
    *   `exchangeCodeForTokens`: Sends a POST request to Google's token endpoint with the code, client ID/secret, and redirect URI to get access and refresh tokens. Stores tokens in memory (`currentTokens`). Warns the user to save the refresh token manually to `.env`.
    *   `refreshAccessToken`: Uses the stored refresh token to get a new access token when the current one expires.
    *   `getValidAccessToken`: The main entry point for authentication. Checks for existing refresh token in config/memory, initiates the `startLocalServerForCode` flow if needed, handles token refreshing, and returns a valid access token.
*   **`google_apis.ts`:**
    *   Uses `fetch` with the `Authorization: Bearer {accessToken}` header for all Google API calls.
    *   `fetchNativeGoogleDocText`: Calls the Docs API (`/v1/documents/{docId}`) and parses the structured JSON response to concatenate text content from `paragraph.elements.textRun.content`.
    *   `createGoogleDoc`: Uses the Drive API multipart upload endpoint (`/upload/drive/v3/files?uploadType=multipart`). Constructs the multipart body manually with JSON metadata and plain text content parts.
*   **`context_builder.ts`:** Orchestrates calls to `fetchNativeGoogleDocText` to retrieve content for context documents specified in `config.ts`. Combines results into a single string.
*   **`scraper.ts`:**
    *   `parseAndExtract`: Helper function using `deno-dom` to parse HTML, extract `<title>`, find main content (`article`, `main`, `body`), remove unwanted tags, and return `{ title, content }`.
    *   `scrapeWithDirectFetch`: Uses `fetch` with custom browser-like headers. Returns `null` on non-2xx response or non-HTML content type.
    *   `scrapeWithScrapingBee`: Constructs the ScrapingBee API URL with parameters (`api_key`, `url`). Calls the API via `fetch`. Returns `null` on non-2xx response.
    *   `scrapeUrlContent`: Main exported function. Calls `scrapeWithDirectFetch`, then `scrapeWithScrapingBee` if the first fails. Returns the result object or `null`.
*   **`gemini.ts`:**
    *   Constructs the API endpoint URL dynamically using the model name from `config.ts`.
    *   Builds a detailed prompt string incorporating the tone context, article content, and specific instructions (audience, tone, "My Take", British English).
    *   Sends a POST request to the Gemini API with the prompt in the expected JSON structure.
    *   Parses the response to extract the generated text.
*   **`main.ts`:**
    *   Calls `getValidAccessToken` to handle auth.
    *   Calls `buildToneContext`.
    *   Reads `targetUrls` from `config.ts`.
    *   Loops through URLs, adding a delay using `std/async/delay`.
    *   Calls `scrapeUrlContent`.
    *   Calls `generateSummary`.
    *   Constructs the final document title and content (prepending source URL).
    *   Calls `createGoogleDoc`.
    *   Includes basic `try...catch` for error logging.

## 4. Potential Issues & Debugging Notes

*   **Google Sheet 404:** The persistent 404 error when accessing Google Sheets API remains unresolved. Potential causes include project configuration issues, API propagation delays, or specific account/sheet restrictions not visible via standard checks.
*   **Scraping Blocks:** Direct scraping may fail (403 errors) for many sites. ScrapingBee fallback helps but might also fail or incur costs/rate limits.
*   **PDF/DOCX Parsing:** Currently relies on context documents being native Google Docs. If PDF/DOCX parsing is needed, integrating a robust external API like PDF.co (handling file uploads, not just URLs) or exploring more complex local solutions (like running a WASM PDF library if a stable one exists) would be required.
*   **Rate Limits:** Both Gemini and ScrapingBee APIs have rate limits, especially on free tiers. The delay in `main.ts` helps mitigate this for scraping, but large context or frequent runs could hit Gemini limits.
*   **Token Storage:** The refresh token is currently handled manually (user copies from console to `.env`). A more robust solution would store it securely in a file (e.g., `token.json` protected by `.gitignore`). The Python test script uses `pickle` for this, but a similar JSON approach could be added to the Deno `auth.ts`.
