# Tone-Based Article Summarizer (Deno Version)

This Deno application automates the process of summarizing web articles using a specific tone of voice derived from the user's provided documents (CV and professional stories). It generates summaries tailored for a CIO audience, including a personalized "My Take" section, and saves them as Google Docs.

## Features

*   Fetches tone context from user-specified Google Docs (CV, Stories).
*   Scrapes content from a list of target URLs (currently hardcoded).
    *   Uses direct fetch with realistic headers.
    *   Falls back to the ScrapingBee API for sites with anti-scraping measures.
*   Generates summaries using the Google Gemini API.
    *   Applies tone based on provided context documents.
    *   Includes a "My Take" section reflecting user perspective.
    *   Uses British English spelling.
    *   Targets a CIO audience.
*   Saves generated summaries as individual Google Docs in a specified Drive folder.
*   Includes source URL in the generated document.
*   Uses Google OAuth 2.0 (Web Application flow) for authentication.
*   Configuration managed via a `.env` file.

## Setup

### Prerequisites

1.  **Deno:** Install the Deno runtime (version 2.x recommended). See [https://deno.com/manual/getting_started/installation](https://deno.com/manual/getting_started/installation).
2.  **Google Cloud Project:**
    *   Create a Google Cloud project.
    *   Enable the **Google Drive API** and **Google Docs API**.
    *   Create **OAuth 2.0 Credentials** for a **Web application**.
    *   Add `http://localhost:8000/oauth/callback` to the "Authorized redirect URIs" for these credentials.
    *   Note down the **Client ID** and **Client Secret**.
3.  **Google Drive Folder:** Create a Google Drive folder where the summaries will be saved and note its **Folder ID** (from the URL).
4.  **Context Documents:**
    *   Ensure your CV and Professional Stories documents are **native Google Docs**.
    *   Note down their **File IDs** (from the URL).
5.  **Gemini API Key:** Obtain an API key for the Google Gemini API ([https://ai.google.dev/](https://ai.google.dev/)).
6.  **ScrapingBee API Key:** Sign up for ScrapingBee ([https://www.scrapingbee.com/](https://www.scrapingbee.com/)) and obtain an API key (a free trial is available).

### Configuration (`.env` file)

1.  Create a file named `.env` in the project root (`tone_based_summarizer_deno/`).
2.  Add the following lines, replacing the placeholder values with your actual credentials and IDs:

    ```dotenv
    # Google OAuth 2.0 Web Application Credentials
    GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
    GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
    # Leave empty initially, will be populated after first run
    GOOGLE_REFRESH_TOKEN=

    # Google Drive/Docs IDs
    GOOGLE_DRIVE_FOLDER_ID=YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE
    GOOGLE_CV_DOC_ID=YOUR_CV_GOOGLE_DOC_ID_HERE
    GOOGLE_STORIES_DOC_ID=YOUR_STORIES_GOOGLE_DOC_ID_HERE

    # Gemini API Configuration
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
    GEMINI_MODEL_NAME=gemini-1.5-flash-latest # Or your desired model

    # ScrapingBee API Key
    SCRAPING_API_KEY=YOUR_SCRAPINGBEE_API_KEY_HERE

    # --- Optional / Not Currently Used ---
    # PDF_PARSER_API_KEY=YOUR_PDF_CO_API_KEY_HERE # If using PDF.co
    # GOOGLE_SHEET_ID=YOUR_GOOGLE_SHEET_ID_HERE # If Sheet access is restored
    # GOOGLE_SHEET_RANGE=SheetName!A2:A # If Sheet access is restored
    ```

### Target URLs (`config.ts`)

Modify the `targetUrls` array within the `tone_based_summarizer_deno/config.ts` file to include the list of article URLs you want to process.

```typescript
// In config.ts
export const config = {
  // ... other config ...
  targetUrls: [
    "URL_1_HERE",
    "URL_2_HERE",
    // Add more URLs
  ],
  // ... rest of config ...
};
```

## Running the Script

1.  **Open Terminal:** Navigate to the project directory:
    ```bash
    cd tone_based_summarizer_deno
    ```
2.  **First Run (Authorization):**
    *   Run the script with necessary permissions:
        ```bash
        deno run --allow-read --allow-env --allow-net main.ts
        ```
    *   The script will start a local server and print an authorization URL.
    *   Visit this URL in your browser.
    *   Log in to your Google account and grant the requested permissions (Drive, Docs).
    *   Google will redirect back to `localhost:8000`, and the script will capture the authorization code automatically.
    *   The script will then print a **Refresh Token** to the console.
    *   **CRITICAL:** Copy this refresh token and paste it into your `.env` file for the `GOOGLE_REFRESH_TOKEN` variable. Save the `.env` file.
3.  **Subsequent Runs:**
    *   Run the script again with the same command:
        ```bash
        deno run --allow-read --allow-env --allow-net main.ts
        ```
    *   The script will now use the refresh token to authenticate.
    *   It will fetch context, scrape URLs (using direct fetch or ScrapingBee fallback), generate summaries via Gemini, and save them as Google Docs in your specified Drive folder.
    *   Check the console output for progress and any errors.

## Known Issues & Limitations

*   **Google Sheet Access:** Reading URLs from Google Sheets is currently disabled due to persistent `404 Not Found` errors when accessing the Sheets API. URLs must be hardcoded in `config.ts`.
*   **PDF/DOCX Parsing:** Direct parsing of PDF/DOCX files for context is not implemented due to issues with available Deno libraries and external API access limitations. Context documents (CV, Stories) **must** be native Google Docs.
*   **Scraping:** While ScrapingBee helps, some websites might still block scraping attempts. Failed scrapes are skipped.
*   **Error Handling:** Basic error handling is implemented (skipping failed items), but more robust retry logic could be added.
