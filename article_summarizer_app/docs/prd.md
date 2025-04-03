# Product Requirements Document: Tone-Based Article Summarizer (Fresh App)

**Version:** 1.0
**Date:** 2025-04-03

## 1. Introduction

### 1.1 Purpose
This document outlines the requirements for a web application built with Deno and the Fresh framework. The application allows a user to input source article URLs and Google Doc links for context (CV, stories, etc.), then automatically scrapes the articles, generates summaries using a specified AI model (Gemini) infused with the user's tone derived from the context documents, and saves the summaries as new Google Docs in a user-specified Google Drive folder.

### 1.2 Goals
*   Provide a web-based UI for easy input of context documents and source URLs.
*   Automate the process of summarizing web articles.
*   Generate summaries tailored to a specific target audience (CIOs).
*   Infuse the summaries with the user's unique tone of voice and perspective derived from multiple Google Docs.
*   Provide an easy-to-read, visually appealing output format with source links.
*   Store generated summaries securely and accessibly in a user-specified Google Drive folder.

### 1.3 Scope
*   **In Scope:**
    *   Web frontend (built with Fresh/Preact) for user input:
        *   Google Drive links/IDs for CV, Stories, and other context documents (assuming native Google Doc format).
        *   List of source article URLs (textarea input).
        *   Google Drive Folder link/ID for output.
        *   Optional Gemini model name override.
    *   Backend API endpoint (`/api/generate`) to receive frontend data.
    *   Refactored backend logic (originally from CLI script) integrated into the Fresh app (`backend/` modules).
    *   Fetching content from specified native Google Docs for tone context.
    *   Scraping content from target web article URLs using direct fetch with fallback to ScrapingBee API.
    *   Extracting HTML title during scraping.
    *   Integrating with the Google Gemini API for summarization and tone application (model name configurable via UI/env).
    *   Generating summaries formatted for CIOs, including a "My Take" section and using British English.
    *   Authenticating with Google APIs (Drive, Docs) using OAuth 2.0 (Web Application flow) handled server-side.
    *   OAuth callback route (`/oauth/callback`) to handle user authorization redirect.
    *   Creating new Google Docs in the user-specified Google Drive folder, including the source URL and using the scraped title.
    *   Basic status updates and results display on the frontend.
*   **Out of Scope (Current Version):**
    *   Reading URLs dynamically from Google Sheets.
    *   Parsing text content directly from PDF or DOCX files (context documents must be native Google Docs).
    *   Multi-user support (designed for single-user local operation).
    *   Secure, automated refresh token storage (relies on manual update to `.env` via server logs).
    *   Advanced error handling and retry logic.
    *   Sophisticated UI design or complex state management.
    *   Automated testing suite.

## 2. Functional Requirements

### 2.1 User Interface (`routes/index.tsx`, `islands/SummarizerForm.tsx`)
*   Provides input fields for: CV Doc link, Stories Doc link, Additional Context Doc links (textarea), Source Article URLs (textarea), Output Folder link.
*   Provides an optional input field for Gemini Model Name.
*   Includes a "Generate Summaries" button.
*   Displays status messages (e.g., "Processing...", "Error...", "Complete").
*   Displays results (e.g., list of successfully created document links or error messages per URL).
*   Form submission triggers a POST request to `/api/generate`.
*   Basic client-side validation for required fields.
*   Attempts to extract Google Drive IDs from provided links.

### 2.2 Backend API (`routes/api/generate.ts`)
*   Accepts POST requests with JSON body containing `contextDocIds` (array), `sourceUrls` (array), `outputFolderId` (string), and optional `geminiModelName` (string).
*   Validates incoming data.
*   Loads necessary API keys (Gemini, ScrapingBee) and Google credentials from server environment (`.env`).
*   Calls `getValidAccessToken` to ensure Google API access.
*   Calls `buildToneContext` with `contextDocIds` to get combined tone text.
*   Iterates through `sourceUrls`:
    *   Adds delay between processing.
    *   Calls `scrapeUrlContent` (passing ScrapingBee key) to get article title and content.
    *   If scraping succeeds, calls `generateSummary` (passing Gemini key, model name, article content, tone context).
    *   If summarization succeeds, calls `createGoogleDoc` (passing title, formatted content with source link, `outputFolderId`).
    *   Collects success/failure status for each URL.
*   Returns a JSON response with the processing results.

### 2.3 Authentication (`backend/auth.ts`, `routes/oauth/callback.ts`)
*   Uses Google OAuth 2.0 Web Application flow.
*   `getValidAccessToken` checks for existing refresh token in `.env`.
*   If no token, `getValidAccessToken` triggers the auth flow via `startLocalServerForCode`.
*   `startLocalServerForCode` starts a local server on port 8000 and logs the authorization URL for the user.
*   User authorizes via browser, Google redirects to `/oauth/callback`.
*   `routes/oauth/callback.ts` handler receives the code, calls `exchangeCodeForTokens`.
*   `exchangeCodeForTokens` uses server-side Client ID/Secret to get tokens.
*   Callback handler logs the **new refresh token** to the server console for manual update to `.env` and redirects the user back to the main page (`/`).

### 2.4 Context Building (`backend/context_builder.ts`)
*   Accepts an array of Google Doc IDs.
*   Calls `fetchNativeGoogleDocText` for each ID.
*   Combines successfully fetched content into a single string.
*   Handles errors gracefully if a document cannot be fetched.

### 2.5 Scraping (`backend/scraper.ts`)
*   Accepts URL and ScrapingBee API key.
*   Tries direct `fetch` with realistic headers.
*   If direct fetch fails, calls ScrapingBee API endpoint.
*   Parses resulting HTML using `deno-dom`.
*   Extracts `<title>` content.
*   Extracts main text content using heuristics.
*   Returns `{ title: string|null, content: string|null }`.

### 2.6 Summarization (`backend/gemini.ts`)
*   Accepts article content, tone context, Gemini API key, and model name.
*   Constructs API endpoint URL dynamically.
*   Constructs detailed prompt including context, content, and instructions (CIO audience, tone, "My Take", British English).
*   Calls Gemini API via `fetch`.
*   Returns extracted summary text or null on failure.

### 2.7 Output (`backend/google_apis.ts`)
*   `createGoogleDoc` accepts title, content, and output folder ID.
*   Uses Drive API v3 multipart upload to create a new Google Doc.

## 3. Non-Functional Requirements

*   **Security:** API keys and secrets stored server-side in `.env`. No secrets handled client-side.
*   **Usability:** Simple web form for input. Clear status messages.
*   **Error Handling:** Graceful skipping of failed URLs/context docs. Basic error reporting to UI.

## 4. Open Issues / Future Considerations
*   See `tasks/tasks.md`.
