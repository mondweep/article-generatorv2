# Architecture Document: Article Summarizer (Fresh App)

**Version:** 1.1
**Date:** 2025-04-03

## 1. Overview

This application is a web application built using the Deno runtime and the Fresh framework. It provides a user interface for submitting article URLs, context document IDs (from Google Drive), a target audience, and an email address. The backend processes these inputs, scrapes the articles (with fallbacks), generates AI summaries infused with a specific tone derived from the context documents, grants edit permission to the user, and saves the results to a specified Google Drive folder.

## 2. Architecture Style

*   **Web Application:** Frontend served by Fresh, interacting with a backend API.
*   **Monolith (Simplified):** Both frontend and backend logic reside within the same Fresh project structure.
*   **Modular Backend:** Core logic (auth, scraping, AI, Google APIs) is separated into modules within a `backend/` directory.

## 3. Components / Modules (`article_summarizer_app/`)

1.  **Fresh Framework Core:**
    *   `dev.ts`: Development server entry point (used by `deno task start`).
    *   `main.ts`: Production entry point (used by `deno task preview`).
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
        *   `SummarizerForm.tsx`: The main form component with state management for user inputs (CV link, Stories link (optional), other context links, source URLs, output folder link, target audience, user email) and results display. Handles form submission and calls the `/api/generate` endpoint. Includes info tooltips.
    *   `components/`: Contains shared, non-interactive UI components (e.g., `Button.tsx`).
    *   `static/`: Static assets (CSS, images, favicon).

3.  **Backend Logic (`backend/`):**
    *   `config.ts`: Loads secrets (API keys, Google credentials) from `.env` and provides fixed configuration values. Refactored to accept necessary parameters.
    *   `auth.ts`: Handles Google OAuth 2.0 Web Application flow, including token exchange, refresh, and the temporary server logic for the callback. Provides `getValidAccessToken`.
    *   `google_apis.ts`: Contains functions for interacting with Google APIs (Docs, Drive).
        *   `fetchNativeGoogleDocText`: Fetches content from native Google Docs.
        *   `createGoogleDoc`: Creates a new Google Doc and uses the Drive Permissions API to grant writer access to the specified user email.
    *   `context_builder.ts`: Fetches content from specified native Google Docs (CV required, others optional) using `google_apis.ts` and combines them. Refactored to accept Doc IDs as parameters.
    *   `scraper.ts`: Handles web scraping. Refactored to accept ScrapingBee API key. Includes direct fetch and ScrapingBee fallback. Extracts title and content.
    *   `gemini.ts`: Handles interaction with the Gemini API. Refactored to accept API key, model name, and target audience. Constructs the refined prompt (including "My Take" and British English).

4.  **Configuration:**
    *   `.env`: Stores all secrets. **Must not be committed to Git.**

## 4. Data Flow (Summarization Request)

1.  User accesses `http://localhost:8000` (`routes/index.tsx`).
2.  `routes/index.tsx` renders `islands/SummarizerForm.tsx`.
3.  User fills form (CV link required, Stories/Other optional, Source URLs, Output Folder, Target Audience, User Email) and clicks "Generate Summaries".
4.  `SummarizerForm.tsx`'s `handleSubmit`:
    *   Extracts File IDs and URLs. Filters context IDs (CV required).
    *   Constructs JSON request body: `{ contextDocIds, sourceUrls, outputFolderId, userEmail, targetAudience, geminiModelName }`.
    *   Sends POST request to `/api/generate`.
5.  `routes/api/generate.ts` handler receives request:
    *   Loads API keys (Gemini, ScrapingBee) from `backend/config.ts`.
    *   Calls `getValidAccessToken`.
    *   Calls `buildToneContext` with `contextDocIds`.
    *   Loops through `sourceUrls`:
        *   Adds delay.
        *   Calls `scrapeUrlContent` (passing ScrapingBee key).
        *   If scraping succeeds, calls `generateSummary` (passing Gemini key, model name, `targetAudience`, article content, tone context).
        *   If summarization succeeds, calls `createGoogleDoc` (passing title, final content with source link, `outputFolderId`, `userEmail`).
    *   Constructs results array.
    *   Returns JSON response.
6.  `SummarizerForm.tsx` updates UI.

## 5. Authentication Flow (First Time / Token Expired)
*   (No changes from previous description - handled by `auth.ts` and `routes/oauth/callback.ts`)
