# Technical Documentation: Article Summarizer (Fresh App)

**Version:** 1.1
**Date:** 2025-04-03

## 1. Technology Stack

*   **Runtime:** Deno (v2.x recommended)
*   **Framework:** Fresh (v1.x)
*   **Language:** TypeScript, TSX (for frontend components)
*   **UI Library:** Preact
*   **Styling:** Tailwind CSS (via Fresh plugin)
*   **State Management (Frontend):** Preact Hooks (`useState`)
*   **Key Deno Modules:**
    *   `$std/dotenv/load.ts`: For loading `.env` files server-side.
    *   `$std/http/server.ts`: Used by `auth.ts` for the temporary OAuth callback server.
    *   `$std/async/delay.ts`: Used in the API route for delays between processing URLs.
    *   `deno_dom`: (`https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts`) Used by `scraper.ts` for parsing HTML.
*   **External APIs:**
    *   Google Drive API v3: Used for creating Google Docs (`createGoogleDoc`) and granting permissions (`permissions.create`).
    *   Google Docs API v1: Used for fetching content from native Google Docs (`fetchNativeGoogleDocText`).
    *   Google Gemini API (v1beta): Used for AI summarization (`generateSummary`).
    *   ScrapingBee API v1: Used as a fallback for web scraping (`scrapeWithScrapingBee`).
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

*   **`config.ts`:** Loads environment variables using `$std/dotenv/load.ts`. Exports a `config` object containing secrets and fixed values. No longer contains user-specific file IDs (except Stories/CV) or target URLs.
*   **`auth.ts`:** Handles Google OAuth 2.0 Web Application flow. Provides `getValidAccessToken`. Relies on manual refresh token update via server logs.
*   **`google_apis.ts`:**
    *   `fetchNativeGoogleDocText`: Fetches native Google Doc content via Docs API.
    *   `createGoogleDoc`: Creates a Google Doc via Drive API multipart upload. Accepts `outputFolderId` and `userEmail`. After creation, calls the Drive Permissions API (`/drive/v3/files/{fileId}/permissions`) with `role: "writer"`, `type: "user"`, and `emailAddress: userEmail` to grant edit access.
*   **`context_builder.ts`:** Accepts an array of Doc IDs. Calls `fetchNativeGoogleDocText` for each ID (currently expects CV and Stories IDs to be passed from API route). Combines results.
*   **`scraper.ts`:** Accepts URL and ScrapingBee API key. Tries direct fetch, falls back to ScrapingBee. Uses `deno_dom` for parsing. Returns `{ title, content }`.
*   **`gemini.ts`:** Accepts API key, model name, target audience, article content, and tone context. Constructs dynamic API endpoint and prompt (including "My Take" with call to action, British English). Calls Gemini API.

## 4. Frontend Details

*   **`routes/index.tsx`:** Renders the `SummarizerForm` island.
*   **`islands/SummarizerForm.tsx`:**
    *   Uses `useState` for form state.
    *   Includes inputs for CV link (required), Stories link (optional), Other context links (optional), Source URLs (required), Output Folder link (required), Target Audience (required), User Email (required), Gemini Model (optional).
    *   Includes info icons with tooltips using `title` attribute.
    *   `handleSubmit`: Performs basic validation, extracts IDs/URLs (using basic regex for IDs), constructs JSON payload including `userEmail` and `targetAudience`, POSTs to `/api/generate`, updates status/results state.
    *   `extractIdFromLink`: Basic regex extraction for Drive IDs.
*   **`routes/api/generate.ts`:**
    *   API route handler. Receives POST request with JSON body.
    *   Validates input (`contextDocIds`, `sourceUrls`, `outputFolderId`, `userEmail`, `targetAudience`).
    *   Loads API keys from config.
    *   Orchestrates calls to backend modules (`buildToneContext`, `scrapeUrlContent`, `generateSummary`, `createGoogleDoc`), passing necessary parameters including `userEmail` and `targetAudience`.
    *   Returns JSON response with results array `{ url, status, result }`.
*   **`routes/oauth/callback.ts`:** Handles Google OAuth redirect, exchanges code, logs refresh token, redirects user back to `/`.

## 5. Potential Issues & Debugging Notes

*   See `tasks/tasks.md`.
*   **Google Sheet 404:** Still unresolved.
*   **PDF/DOCX Parsing:** Not implemented. Context docs must be native Google Docs.
*   **ID Extraction:** Regex in `extractIdFromLink` is basic.
*   **Rate Limits:** Potential for Gemini or ScrapingBee limits.
*   **Token Storage:** Manual refresh token update required.
*   **Error Handling:** Basic skipping/logging implemented.
