# Architecture Document: Tone-Based Article Summarizer

## 1. Overview

This application is a command-line tool built using the Deno runtime (TypeScript). Its primary goal is to automate the summarization of web articles, applying a specific user-defined tone and perspective derived from provided context documents. The final summaries are saved as Google Docs.

The architecture follows a modular approach, separating concerns into distinct TypeScript files.

## 2. Components / Modules

The application consists of the following key modules located in the project root (`tone_based_summarizer_deno/`):

1.  **`main.ts` (Orchestrator):**
    *   The main entry point of the application.
    *   Coordinates the overall workflow.
    *   Handles initial setup and calls other modules in sequence.
    *   Manages the main loop for processing target URLs.
    *   Includes top-level error handling.
    *   Adds delay between processing URLs.

2.  **`config.ts` (Configuration Loader):**
    *   Responsible for loading configuration values from environment variables (set via the `.env` file).
    *   Uses `deno.land/std/dotenv` to load the `.env` file.
    *   Exports a configuration object containing API keys, Google file/folder IDs, hardcoded target URLs, API endpoints, and OAuth scopes.
    *   Provides type safety for configuration values.

3.  **`auth.ts` (Google OAuth Handler):**
    *   Manages authentication with Google APIs using OAuth 2.0 (Web Application flow).
    *   Generates the Google authorization URL.
    *   Starts a temporary local HTTP server (`deno.land/std/http/server`) to receive the OAuth callback and capture the authorization code.
    *   Exchanges the authorization code for access and refresh tokens by calling Google's token endpoint.
    *   Handles refresh token storage (currently relies on manual update to `.env` after first run) and automatic access token refreshing using the stored refresh token.
    *   Provides a function (`getValidAccessToken`) for other modules to obtain a valid access token.

4.  **`google_apis.ts` (Google API Interaction):**
    *   Contains functions for interacting with specific Google APIs (Docs and Drive).
    *   `fetchNativeGoogleDocText`: Fetches and parses content from native Google Docs using the Google Docs API v1.
    *   `createGoogleDoc`: Creates a new Google Doc in the specified Drive folder using the Google Drive API v3 (multipart upload).
    *   *(Note: Functions for Sheets and Drive file export/download were previously present but removed/modified due to unresolved issues or changes in approach).*

5.  **`context_builder.ts` (Tone Context Aggregator):**
    *   Responsible for fetching content from the specified context documents (currently the user's CV and Stories Google Docs).
    *   Calls functions in `google_apis.ts` (`fetchNativeGoogleDocText`) to retrieve the text.
    *   Combines the retrieved text into a single string to be used as context for the Gemini prompt.
    *   Handles errors during context fetching gracefully.

6.  **`scraper.ts` (Web Scraper):**
    *   Responsible for fetching and extracting content from target web article URLs.
    *   Implements a fallback strategy:
        *   **`scrapeWithDirectFetch`:** Attempts a direct `fetch` using realistic browser headers.
        *   **`scrapeWithScrapingBee`:** If direct fetch fails, calls the ScrapingBee API (using the key from `config.ts`) to handle potential anti-scraping measures.
    *   Uses `deno.land/x/deno_dom` to parse the retrieved HTML (from either method).
    *   Extracts the page `<title>` tag.
    *   Extracts the main article text using heuristics (searching for `<article>`, `<main>`, or falling back to `<body>`).
    *   Cleans the extracted text.
    *   Returns an object containing the extracted title and content.

7.  **`gemini.ts` (AI Summarization):**
    *   Contains the function `generateSummary` for interacting with the Google Gemini API.
    *   Constructs a detailed prompt including the scraped article content, the aggregated tone context, and specific instructions (target audience, tone adoption, "My Take" section, British English).
    *   Reads the Gemini API key and model name from `config.ts`.
    *   Calls the Gemini API endpoint (`generativelanguage.googleapis.com`).
    *   Parses the API response to extract the generated summary text.

8.  **`deps.ts` (Dependency Management):**
    *   Centralizes URL imports for external Deno modules (`deno-dom`, `std/http`).
    *   *(Note: Previously contained PDF parsing libraries, but these were removed due to runtime issues).*

## 3. Data Flow

1.  `main.ts` starts.
2.  `main.ts` calls `auth.ts` (`getValidAccessToken`) to ensure valid Google credentials. If needed, `auth.ts` handles the OAuth flow (starting server, getting code, exchanging for tokens).
3.  `main.ts` calls `context_builder.ts` (`buildToneContext`).
4.  `context_builder.ts` calls `google_apis.ts` (`fetchNativeGoogleDocText`) to get CV and Stories content.
5.  `context_builder.ts` returns the combined context string to `main.ts`.
6.  `main.ts` iterates through `targetUrls` from `config.ts`.
7.  For each URL, `main.ts` calls `scraper.ts` (`scrapeUrlContent`).
8.  `scraper.ts` first tries `scrapeWithDirectFetch`. If it fails, it calls `scrapeWithScrapingBee`. It parses the resulting HTML and returns `{ title, content }`.
9.  If scraping succeeds, `main.ts` calls `gemini.ts` (`generateSummary`), passing the scraped content and the tone context.
10. `gemini.ts` calls the Gemini API and returns the summary text.
11. If summarization succeeds, `main.ts` constructs the final document content (prepending source URL) and title.
12. `main.ts` calls `google_apis.ts` (`createGoogleDoc`) to save the summary to Google Drive.
13. Loop continues with delay.

## 4. Key Technologies

*   **Runtime:** Deno (TypeScript)
*   **Configuration:** `.env` file, `deno.land/std/dotenv`
*   **Authentication:** Google OAuth 2.0 (Web flow), `deno.land/std/http` (for callback server)
*   **Google APIs:** Google Docs API v1, Google Drive API v3 (via direct `fetch`)
*   **Web Scraping:** Deno `fetch`, `deno.land/x/deno_dom`, ScrapingBee API
*   **AI Summarization:** Google Gemini API (via direct `fetch`)
