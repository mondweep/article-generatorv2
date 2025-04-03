# Technical Documentation: Article Summarizer (Fresh App)

## 1. Technology Stack

*   **Runtime:** Deno (v2.x recommended)
*   **Framework:** Fresh (v1.x)
*   **Language:** TypeScript, TSX (for frontend components)
*   **UI Library:** Preact
*   **Styling:** Tailwind CSS (via Fresh plugin)
*   **State Management (Frontend):** Preact Signals
*   **Key Deno Modules:**
    *   `$std/dotenv/load.ts`: For loading `.env` files server-side.
    *   `$std/http/server.ts`: Used by `auth.ts` for the temporary OAuth callback server.
    *   `$std/async/delay.ts`: Used in the API route for delays between processing URLs.
    *   `deno_dom`: (`https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts`) Used by `scraper.ts` for parsing HTML.
*   **External APIs:**
    *   Google Drive API v3: Used for creating Google Docs (`createGoogleDoc` in `google_apis.ts`).
    *   Google Docs API v1: Used for fetching content from native Google Docs (`fetchNativeGoogleDocText` in `google_apis.ts`).
    *   Google Gemini API (v1beta): Used for AI summarization (`generateSummary` in `gemini.ts`).
    *   ScrapingBee API v1: Used as a fallback for web scraping (`scrapeWithScrapingBee` in `scraper.ts`).
*   **Authentication:** Google OAuth 2.0 (Web Application flow).

## 2. Setup & Configuration

*   **`.env` File:** Located in the project root (`article_summarizer_app/.env`). Stores `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_CV_DOC_ID`, `GOOGLE_STORIES_DOC_ID`, `GEMINI_API_KEY`, `GEMINI_MODEL_NAME`, `SCRAPING_API_KEY`. **Must not be committed to Git.**
*   **`deno.json`:** Configures Deno tasks (`start`, `build`, etc.) and manages dependencies via the `imports` map. Key imports include `$fresh/`, `preact`, `@preact/signals`, `$std/`, and `deno_dom`.
*   **Google Cloud Credentials:** Requires **Web application** type OAuth 2.0 credentials. `http://localhost:8000/oauth/callback` and `http://localhost:8000/` must be added as authorized redirect URIs.
*   **Deno Permissions:** Running `deno task start` requires:
    *   `--allow-read`: To read `.env` and project files.
    *   `--allow-env`: To access environment variables.
    *   `--allow-net`: For API calls, serving the app, and the OAuth server.
    *   `--watch`: (Included in `deno task start`) For auto-reloading during development.

## 3. Backend Module Details (`backend/`)

*   **`config.ts`:** Uses `$std/dotenv/load.ts` to load `.env`. Exports a `config` object containing secrets and fixed values read via `Deno.env.get()`. Throws an error if required environment variables are missing.
*   **`auth.ts`:**
    *   Uses `config` values for client ID/secret, scopes, etc.
    *   `startLocalServerForCode` uses `$std/http/server.ts`'s `serve` with an `AbortController` to manage the temporary server lifecycle. It resolves a promise with the code upon successful callback.
    *   `exchangeCodeForTokens` and `refreshAccessToken` use `fetch` to interact with Google's token endpoint.
    *   `getValidAccessToken` orchestrates checking/refreshing/fetching tokens, triggering `startLocalServerForCode` if necessary.
*   **`google_apis.ts`:**
    *   All functions use `getValidAccessToken` to get a token before making `fetch` requests to Google APIs.
    *   `fetchNativeGoogleDocText` parses the JSON response from the Docs API, iterating through `body.content` to extract text from `textRun` elements.
    *   `createGoogleDoc` manually constructs a `multipart/related` request body containing JSON metadata and plain text content for the Drive API upload endpoint.
*   **`context_builder.ts`:** Accepts an array of Doc IDs, calls `fetchNativeGoogleDocText` for each, and concatenates the results with headers. Handles errors by logging and continuing.
*   **`scraper.ts`:**
    *   `scrapeWithDirectFetch` uses `fetch` with a comprehensive set of browser-like headers.
    *   `scrapeWithScrapingBee` uses `fetch` to call the ScrapingBee API endpoint, passing the target URL and API key as query parameters.
    *   `parseAndExtract` uses `deno_dom`'s `DOMParser` and `querySelector` to find the title and main content area, then uses `.innerText` for text extraction after removing unwanted tags.
    *   `scrapeUrlContent` implements the fallback logic.
*   **`gemini.ts`:**
    *   Accepts API key and model name as parameters.
    *   Constructs the API endpoint URL dynamically.
    *   Builds the prompt string using template literals.
    *   Sends a POST request with a JSON body containing the prompt to the Gemini API via `fetch`.
    *   Extracts the text from the `candidates[0].content.parts[0].text` field in the JSON response.

## 4. Frontend Details

*   **`routes/index.tsx`:** Simple route that imports and renders the `SummarizerForm` island.
*   **`islands/SummarizerForm.tsx`:**
    *   Uses `preact/hooks` (`useState`) for managing form input values, loading state, status messages, and results. (Note: Could be refactored to use Signals for potentially better performance/ergonomics).
    *   Input `onChange` handlers update state using type assertions (`e.target as HTMLInputElement`) and optional chaining (`?.value`) for type safety.
    *   `handleSubmit` performs basic validation, calls `extractIdFromLink`, splits URLs/links using `\n`, constructs the JSON body, and uses `fetch` to POST to `/api/generate`.
    *   `extractIdFromLink` uses a simple regex (`/[-\w]{25,}/`) to find potential Google Drive IDs within strings. **This is basic and may fail for some URL formats.**
    *   Conditionally renders status messages and results based on state.
*   **`routes/oauth/callback.ts`:**
    *   Standard Fresh API route handler.
    *   Reads `code` and `error` from `URLSearchParams`.
    *   Calls the backend `exchangeCodeForTokens` function.
    *   Logs the refresh token to the server console.
    *   Uses `Response` with status `302` and `Location` header to redirect the browser.

## 5. Potential Issues & Debugging Notes

*   See `tasks/tasks.md`.
*   **ID Extraction:** The regex in `extractIdFromLink` is basic and might need improvement to handle various shared link formats reliably.
*   **Large Context:** Sending extremely large combined context (CV + Stories) to Gemini might exceed token limits or increase latency/cost. Consider summarizing context documents first if needed.
*   **ScrapingBee URL Parameter:** Ensure the target URL passed to ScrapingBee is properly URL-encoded by `URLSearchParams`.
*   **Deno Cache:** If "Module not found" errors occur unexpectedly, try clearing the cache (`deno cache --reload your_entrypoint.ts`).
