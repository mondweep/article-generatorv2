# Product Requirements Document: Tone-Based Article Summarizer (Fresh App)

**Version:** 1.1
**Date:** 2025-04-03

## 1. Introduction

### 1.1 Purpose
This document outlines the requirements for a web application built with Deno and the Fresh framework. The application allows a user to input source article URLs and Google Doc links for context (CV, stories, etc.), specify a target audience and their email address, then automatically scrapes the articles, generates summaries using a specified AI model (Gemini) infused with the user's tone derived from the context documents, grants the user edit access, and saves the summaries as new Google Docs in a user-specified Google Drive folder.

### 1.2 Goals
*   Provide a web-based UI for easy input of context documents, source URLs, target audience, and output location.
*   Automate the process of summarizing web articles.
*   Generate summaries tailored to a user-specified target audience.
*   Infuse the summaries with the user's unique tone of voice and perspective derived from multiple Google Docs.
*   Provide an easy-to-read, visually appealing output format with source links and a personalized "My Take" section.
*   Store generated summaries securely and accessibly in a user-specified Google Drive folder, granting the user edit access.

### 1.3 Scope
*   **In Scope:**
    *   Web frontend (built with Fresh/Preact) for user input:
        *   Google Drive links/IDs for CV (required) and optional Stories/Other context documents (assuming native Google Doc format).
        *   List of source article URLs (textarea input, required).
        *   Google Drive Folder link/ID for output (required).
        *   Target Audience description (text input, required).
        *   User's Google Email address (required, for granting edit access).
        *   Optional Gemini model name override.
    *   Backend API endpoint (`/api/generate`) to receive frontend data.
    *   Refactored backend logic integrated into the Fresh app (`backend/` modules).
    *   Fetching content from specified native Google Docs for tone context.
    *   Scraping content from target web article URLs using direct fetch with fallback to ScrapingBee API.
    *   Extracting HTML title during scraping.
    *   Integrating with the Google Gemini API for summarization and tone application.
    *   Generating summaries formatted for the specified target audience, including a refined "My Take" section reflecting the user's perspective (from CV/Stories) and using British English.
    *   Authenticating with Google APIs (Drive, Docs) using OAuth 2.0 (Web Application flow) handled server-side.
    *   OAuth callback route (`/oauth/callback`) to handle user authorization redirect.
    *   Creating new Google Docs in the specified Google Drive folder, including the source URL and using the scraped title.
    *   Granting "writer" (edit) permission on the created Google Doc to the user-provided email address via the Drive API.
    *   Basic status updates and results display on the frontend.
*   **Out of Scope (Current Version):**
    *   Reading URLs dynamically from Google Sheets.
    *   Parsing text content directly from PDF or DOCX files (context documents must be native Google Docs).
    *   Multi-user support.
    *   Secure, automated refresh token storage.
    *   Advanced error handling and retry logic.
    *   Sophisticated UI design or complex state management.
    *   Automated testing suite.
    *   File uploads for context documents.

## 2. Functional Requirements

### 2.1 User Interface (`routes/index.tsx`, `islands/SummarizerForm.tsx`)
*   Provides input fields for: CV Doc link (required), Stories Doc link (optional), Additional Context Doc links (textarea, optional), Source Article URLs (textarea, required), Output Folder link (required), Target Audience (text input, required), User Email (email input, required).
*   Provides an optional input field for Gemini Model Name.
*   Includes info icons with tooltips for guidance.
*   Includes a "Generate Summaries" button.
*   Displays status messages and results.
*   Form submission triggers a POST request to `/api/generate` with all collected data.
*   Basic client-side validation for required fields.
*   Attempts to extract Google Drive IDs from provided links.

### 2.2 Backend API (`routes/api/generate.ts`)
*   Accepts POST requests with JSON body containing `contextDocIds`, `sourceUrls`, `outputFolderId`, `userEmail`, `targetAudience`, and optional `geminiModelName`.
*   Validates incoming data.
*   Loads necessary API keys and Google credentials from `.env`.
*   Calls `getValidAccessToken`.
*   Calls `buildToneContext` with filtered `contextDocIds` (ensuring CV ID is present if provided via link).
*   Iterates through `sourceUrls`:
    *   Adds delay.
    *   Calls `scrapeUrlContent` to get article title and content.
    *   If scraping succeeds, calls `generateSummary` passing scraped content, tone context, keys, model name, and `targetAudience`.
    *   If summarization succeeds, calls `createGoogleDoc` passing title, formatted content, `outputFolderId`, and `userEmail`.
    *   Collects success/failure status for each URL.
*   Returns a JSON response with the processing results.

### 2.3 Authentication (`backend/auth.ts`, `routes/oauth/callback.ts`)
*   (No changes from previous description)

### 2.4 Context Building (`backend/context_builder.ts`)
*   Accepts an array of Google Doc IDs.
*   Calls `fetchNativeGoogleDocText` for each ID (currently expects CV and Stories IDs).
*   Combines successfully fetched content.
*   Handles errors gracefully.

### 2.5 Scraping (`backend/scraper.ts`)
*   (No changes from previous description)

### 2.6 Summarization (`backend/gemini.ts`)
*   Accepts `targetAudience` as a parameter.
*   Constructs prompt dynamically including `targetAudience`.
*   Includes refined instructions for the "My Take" section (weaving in CV/Stories experience) and the call to action.
*   Includes instruction for British English spelling.

### 2.7 Output (`backend/google_apis.ts`)
*   `createGoogleDoc` accepts `userEmail` as a parameter.
*   After creating the doc, makes a second API call to `POST /drive/v3/files/{fileId}/permissions` to grant the `userEmail` the `writer` role.

## 3. Non-Functional Requirements
*   (No changes from previous description)

## 4. Open Issues / Future Considerations
*   See `tasks/tasks.md`.
