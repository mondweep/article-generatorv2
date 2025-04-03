# Product Requirements Document: Tone-Based Article Summarizer

**Version:** 1.0
**Date:** 2025-04-03

## 1. Introduction

### 1.1 Purpose
This document outlines the requirements for a Deno-based application designed to automatically scrape web articles, generate summaries using a specified AI model (Gemini), apply a specific user's tone of voice derived from their prior writings, and save the summaries as Google Docs in a designated Google Drive folder.

### 1.2 Goals
*   Automate the process of summarizing web articles.
*   Generate summaries tailored to a specific target audience (CIOs).
*   Infuse the summaries with the user's unique tone of voice and perspective.
*   Provide an easy-to-read, visually appealing output format.
*   Store generated summaries securely and accessibly in Google Drive.

### 1.3 Scope
*   **In Scope:**
    *   Reading a list of target article URLs (currently hardcoded, initially planned from Google Sheets).
    *   Fetching content from specified Google Docs (user's CV, professional stories) to establish tone context.
    *   Scraping content from target web article URLs, with fallback mechanisms for anti-scraping measures.
    *   Integrating with the Google Gemini API for content summarization and tone application.
    *   Generating summaries formatted for CIOs, including a "My Take" section reflecting the user's perspective and using British English.
    *   Authenticating with Google APIs (Drive, Docs) using OAuth 2.0 (Web Application flow).
    *   Creating new Google Docs in a specified Google Drive folder to store the generated summaries, including the source URL.
*   **Out of Scope (Current Version):**
    *   Reading URLs dynamically from Google Sheets (due to unresolved API access issues).
    *   Parsing text content directly from PDF or DOCX files provided for tone context (due to technical challenges).
    *   Advanced error handling beyond skipping failed URLs/context sources.
    *   User interface (currently a command-line script).
    *   Automated testing suite.

## 2. Functional Requirements

### 2.1 Core Workflow
1.  **Initialization:** The script starts and authenticates with Google APIs using stored OAuth credentials (refresh token). If no valid token exists, it initiates the OAuth 2.0 Web Application flow, requiring user interaction via a browser.
2.  **Context Building:**
    *   Fetch content from the user's specified "Professional Stories" Google Doc.
    *   Fetch content from the user's specified "CV" Google Doc (must be native Google Doc format).
    *   Combine the fetched text into a single "Tone Context" string.
3.  **URL Processing:**
    *   Retrieve the list of target article URLs from the hardcoded list in `config.ts`.
    *   For each URL:
        *   Add a delay (e.g., 5 seconds) before processing (except for the first URL).
        *   Attempt to scrape the article content and HTML title using a direct fetch with browser-like headers.
        *   If direct fetch fails, attempt to scrape using the ScrapingBee API.
        *   If scraping succeeds (either method):
            *   Extract the main text content and the page title.
            *   Call the Gemini API with the scraped content, the combined "Tone Context", and a specific prompt.
            *   The prompt instructs Gemini to:
                *   Summarize the article for a CIO audience.
                *   Adopt the tone/style from the Tone Context.
                *   Use British English spelling.
                *   Include a "**My Take:**" section reflecting the user's perspective based on the Tone Context.
                *   Format the output clearly, potentially using emojis appropriately.
            *   If Gemini summarization succeeds:
                *   Construct a document title (using the scraped HTML title or a fallback).
                *   Prepend the source URL to the Gemini summary.
                *   Call the Google Drive API to create a new Google Doc in the specified folder with the generated title and content.
        *   If scraping or summarization fails, log an error and skip to the next URL.
4.  **Completion:** Log a message when all URLs have been processed.

### 2.2 Configuration
*   Sensitive information (API Keys, Google Credentials, File IDs) must be stored in a `.env` file.
*   Configuration values (URLs, IDs, API endpoints) are loaded via `config.ts`.

### 2.3 Authentication
*   Uses Google OAuth 2.0 Web Application flow.
*   Requires user interaction for initial authorization.
*   Stores and uses refresh tokens for subsequent runs.

### 2.4 Scraping
*   Attempts direct fetch with realistic headers first.
*   Falls back to ScrapingBee API if direct fetch fails.
*   Extracts HTML `<title>` tag.
*   Extracts main article text content using heuristics (article/main tags or body).

### 2.5 Summarization
*   Uses Google Gemini API (model specified in `.env`).
*   Provides tone context (CV + Stories).
*   Uses a detailed prompt specifying target audience, tone, perspective, "My Take" section, and British English spelling.

### 2.6 Output
*   Creates individual Google Docs for each successfully summarized article.
*   Saves documents to a user-specified Google Drive folder.
*   Document title is based on the scraped article title (with fallback).
*   Document content includes the source URL followed by the Gemini-generated summary (including the "My Take" section).

## 3. Non-Functional Requirements

*   **Security:** API keys and OAuth credentials must be stored securely in `.env` and not committed to version control.
*   **Error Handling:** The script should handle common errors (API failures, scraping failures) gracefully by logging the error and skipping the problematic item where possible, rather than crashing.
*   **Maintainability:** Code should be organized into logical modules.

## 4. Open Issues / Future Considerations
*   Resolve the persistent `404 Not Found` error when accessing the Google Sheet via API.
*   Implement robust text extraction for PDF and DOCX files provided as context (potentially using PDF.co upload or another library/service).
*   Make the source of URLs configurable (e.g., read from file, command-line argument) instead of hardcoded.
*   Refine Gemini prompt for better tone adoption and summary quality.
*   Add more sophisticated error handling and retry mechanisms.
*   Implement automated tests.
