# Article Summarizer - Fresh Web App

This is a web application built with Deno and the Fresh framework that allows a user to generate summaries of web articles infused with their personal tone of voice.

## Features

*   **Web UI:** Provides a simple web form to input context documents, source URLs, and output location.
*   **Tone Context:** Fetches content from user-provided native Google Docs (e.g., CV, professional stories) to establish a tone of voice.
*   **Web Scraping:** Scrapes content from target article URLs using a direct fetch attempt with fallback to the ScrapingBee API for difficult sites. Extracts article titles.
*   **AI Summarization:** Uses the Google Gemini API to generate summaries based on scraped content and tone context.
    *   Includes a customizable "My Take" section reflecting the user's perspective.
    *   Uses British English spelling.
    *   Targets a CIO audience.
*   **Output:** Saves generated summaries as new Google Docs in a user-specified Google Drive folder, including the source URL and using the scraped article title.
*   **Authentication:** Handles Google API authentication via OAuth 2.0 (Web Application flow) server-side.

## Setup

### Prerequisites

1.  **Deno:** Install the Deno runtime (v2.x recommended). See [https://deno.com/manual/getting_started/installation](https://deno.com/manual/getting_started/installation).
2.  **Google Cloud Project:**
    *   Create a Google Cloud project.
    *   Enable the **Google Drive API** and **Google Docs API**.
    *   Create **OAuth 2.0 Credentials** for a **Web application**.
    *   Add **both** `http://localhost:8000/oauth/callback` AND `http://localhost:8000/` to the "Authorized redirect URIs".
    *   Note down the **Client ID** and **Client Secret**.
3.  **Google Drive Folder:** Create a Google Drive folder for output and note its **Folder ID**.
4.  **Context Documents:** Ensure your CV, Stories, etc., are **native Google Docs** and note their **File IDs**.
5.  **Gemini API Key:** Obtain a Google Gemini API key ([https://ai.google.dev/](https://ai.google.dev/)).
6.  **ScrapingBee API Key:** Obtain a ScrapingBee API key ([https://www.scrapingbee.com/](https://www.scrapingbee.com/)).

### Configuration (`.env` file)

1.  Ensure a file named `.env` exists in the project root (`article_summarizer_app/`).
2.  Add/update the following lines with your actual credentials and IDs:

    ```dotenv
    # Google OAuth 2.0 Web Application Credentials
    GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
    GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
    # Leave empty initially, will be populated after first run via server logs
    GOOGLE_REFRESH_TOKEN=

    # Google Drive/Docs IDs
    GOOGLE_DRIVE_FOLDER_ID=YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE
    GOOGLE_CV_DOC_ID=YOUR_CV_GOOGLE_DOC_ID_HERE
    GOOGLE_STORIES_DOC_ID=YOUR_STORIES_GOOGLE_DOC_ID_HERE
    # Add other context doc IDs here if needed by context_builder.ts

    # Gemini API Configuration
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
    GEMINI_MODEL_NAME=gemini-1.5-flash-latest # Or your desired model

    # ScrapingBee API Key
    SCRAPING_API_KEY=YOUR_SCRAPINGBEE_API_KEY_HERE
    ```

## Running the Application

1.  **Open Terminal:** Navigate to the project directory:
    ```bash
    cd article_summarizer_app
    ```
2.  **Start Development Server:**
    ```bash
    deno task start
    ```
    This command watches for file changes and automatically rebuilds.
3.  **Access UI:** Open `http://localhost:8000` in your web browser.
4.  **First Run (Authorization):**
    *   The first time you submit the form, if no valid refresh token is found in `.env`, the backend will need authorization.
    *   The API call from the frontend might fail initially. Check the **terminal running `deno task start`**.
    *   It should log an authorization URL. Visit this URL in your browser.
    *   Log in and grant permissions. Google redirects back to `localhost:8000/oauth/callback`.
    *   The server logs should then display a **NEW REFRESH TOKEN**.
    *   **CRITICAL:** Copy this refresh token and paste it into your `.env` file for `GOOGLE_REFRESH_TOKEN`. Save `.env`.
    *   You may need to restart the `deno task start` process after updating `.env`.
5.  **Subsequent Runs:**
    *   Ensure `deno task start` is running.
    *   Access `http://localhost:8000`.
    *   Fill in the form with Google Doc links/IDs, source URLs, and the output folder link/ID.
    *   Click "Generate Summaries".
    *   The backend will use the refresh token. Observe the UI and terminal for progress.
    *   Generated summaries will appear in the specified Google Drive folder.

## Project Structure

*   `backend/`: Contains the core Deno logic (auth, API calls, scraping, context building).
*   `components/`: Shared Preact components for the UI.
*   `islands/`: Interactive Preact components (e.g., `SummarizerForm.tsx`).
*   `routes/`: Defines the application's pages and API endpoints.
    *   `index.tsx`: The main page route.
    *   `api/generate.ts`: The backend API handler for processing summaries.
    *   `oauth/callback.ts`: Handles the Google OAuth redirect.
*   `static/`: Static assets (CSS, images).
*   `deno.json`: Project configuration and import map.
*   `dev.ts`: Script used by `deno task start` for development mode.
*   `main.ts`: Production entry point (used by `deno task preview`).
*   `.env`: Stores secrets and configuration (ignored by Git).

## Known Issues

*   See `tasks/tasks.md`.
