# Architecture Document: Article Summarizer (Fresh App)

## 1. Overview

This application is a web application built using the Deno runtime and the Fresh framework. It provides a user interface for submitting article URLs and context document IDs (from Google Drive). The backend processes these inputs, scrapes the articles (with fallbacks), generates AI summaries infused with a specific tone derived from the context documents, and saves the results to Google Drive.

## 2. Architecture Style

*   **Web Application:** Frontend served by Fresh, interacting with a backend API.
*   **Monolith (Simplified):** Both frontend and backend logic reside within the same Fresh project structure.
*   **Modular Backend:** Core logic (auth, scraping, AI, Google APIs) is separated into modules within a `backend/` directory.

## 3. Components / Modules (`article_summarizer_app/`)

1.  **Fresh Framework Core:**
    *   `dev.ts`: Development server entry point (used by `deno task start`).
    *   `main.ts`: Production server entry point (used by `deno task preview`).
    *   `fresh.config.ts`: Fresh framework configuration (plugins, etc.).
    *   `fresh.gen.ts`: Auto-generated manifest mapping routes and islands.
    *   `deno.json`: Deno configuration, tasks, and import map for dependencies.

2.  **Frontend Components:**
    *   `routes/`: Defines page routes and API routes.
        *   `index.tsx`: The main page route, renders the primary UI.
        *   `_app.tsx`: Wraps all pages, used for global layout/styles.
        *   `_404.tsx`: Handles page not found errors.
        *   `api/generate.ts`: The backend API endpoint handler.
        *   `oauth/callback.ts`: Handles the redirect from Google OAuth.
    *   `islands/`: Contains interactive UI components (using Preact).
        *   `SummarizerForm.tsx`: The main form component with state management (using Preact Signals) for user inputs and results display. Handles form submission and calls the `/api/generate` endpoint.
    *   `components/`: Contains shared, non-interactive UI components (e.g., `Button.tsx`).
    *   `static/`: Static assets (CSS, images, favicon).

3.  **Backend Logic (`backend/`):**
    *   `config.ts`: Loads secrets (API keys, Google credentials) from `.env` and provides fixed configuration values. Refactored to exclude user-specific inputs.
    *   `auth.ts`: Handles Google OAuth 2.0 Web Application flow, including token exchange, refresh, and the temporary server logic for the callback (though the callback itself is handled by `routes/oauth/callback.ts`). Provides `getValidAccessToken`.
    *   `google_apis.ts`: Contains functions to interact with Google APIs (Docs, Drive) using fetched access tokens. Refactored to accept necessary IDs as parameters and remove unused Sheet/PDF functions.
    *   `context_builder.ts`: Fetches content from specified native Google Docs (passed as IDs) using `google_apis.ts` and combines them into the tone context string. Refactored to accept IDs as parameters.
    *   `scraper.ts`: Handles web scraping. Refactored to accept ScrapingBee API key as a parameter. Includes direct fetch and ScrapingBee fallback logic. Uses `deno-dom` (via import map) for parsing. Returns `{ title, content }`.
    *   `gemini.ts`: Handles interaction with the Gemini API. Refactored to accept API key and model name as parameters. Constructs the prompt and parses the response.

4.  **Configuration:**
    *   `.env`: Stores all secrets (API Keys, Google Client ID/Secret, Refresh Token). **Must not be committed to Git.**

## 4. Data Flow (Summarization Request)

1.  User accesses `http://localhost:8000` (`routes/index.tsx`).
2.  `routes/index.tsx` renders the `islands/SummarizerForm.tsx` component.
3.  User fills in the form (Context Doc Links, Source URLs, Output Folder Link) and clicks "Generate Summaries".
4.  `SummarizerForm.tsx`'s `handleSubmit` function:
    *   Extracts File IDs and URLs from input values.
    *   Constructs a JSON request body: `{ contextDocIds, sourceUrls, outputFolderId, geminiModelName }`.
    *   Sends a `fetch` POST request to `/api/generate`.
5.  `routes/api/generate.ts` handler receives the request:
    *   Loads API keys (Gemini, ScrapingBee) from `backend/config.ts` (which reads `.env`).
    *   Calls `getValidAccessToken` (`backend/auth.ts`) to ensure Google auth is ready.
    *   Calls `buildToneContext` (`backend/context_builder.ts`) with `contextDocIds`.
    *   Loops through `sourceUrls`:
        *   Calls `scrapeUrlContent` (`backend/scraper.ts`) with URL and ScrapingBee key.
        *   Calls `generateSummary` (`backend/gemini.ts`) with scraped content, context, Gemini key, and model name.
        *   Calls `createGoogleDoc` (`backend/google_apis.ts`) with title, final content, and `outputFolderId`.
    *   Constructs a results array.
    *   Returns a JSON response to the frontend.
6.  `SummarizerForm.tsx` receives the response and updates the UI (status message, results list).

## 5. Authentication Flow (First Time / Token Expired)

1.  Backend API (`/api/generate`) calls `getValidAccessToken` (`backend/auth.ts`).
2.  `getValidAccessToken` finds no valid refresh token.
3.  It calls `startLocalServerForCode` (`backend/auth.ts`).
4.  `startLocalServerForCode` starts HTTP server on port 8000 and logs the authorization URL.
5.  *User manually copies URL from server logs and visits it in the browser.*
6.  User grants permission on Google's page.
7.  Google redirects browser to `http://localhost:8000/oauth/callback`.
8.  `routes/oauth/callback.ts` handler receives the request.
9.  Callback handler extracts the `code`.
10. Callback handler calls `exchangeCodeForTokens` (`backend/auth.ts`).
11. `exchangeCodeForTokens` uses Client ID/Secret (from `.env` via `config.ts`) to get tokens from Google.
12. Callback handler logs the **new refresh token** to the server console.
13. Callback handler redirects the user's browser back to `/`.
14. *User manually copies the refresh token from server logs into the `.env` file.*
15. User restarts the `deno task start` process or re-submits the form. Subsequent requests use the refresh token.
