# Article Summarizer - Fresh Web App

This is a web application built with Deno and the Fresh framework that allows a user to generate summaries of web articles infused with their personal tone of voice.

## Features

*   **Web UI:** Provides a simple web form to input context documents, source URLs, target audience, output location, and user email.
*   **Tone Context:** Fetches content from user-provided native Google Docs (e.g., CV, professional stories) to establish a tone of voice. CV is required, others are optional.
*   **Web Scraping:** Scrapes content from target article URLs using a direct fetch attempt with fallback to the ScrapingBee API for difficult sites. Extracts article titles.
*   **AI Summarization:** Uses the Google Gemini API to generate summaries based on scraped content and tone context.
    *   Includes a customizable "My Take" section reflecting the user's perspective and experiences (from CV/Stories).
    *   Includes a call to action at the end of the "My Take" section.
    *   Uses British English spelling.
    *   Targets a user-specified audience.
*   **Output:** Saves generated summaries as new Google Docs in a user-specified Google Drive folder.
    *   Includes source URL in the generated document.
    *   Uses the scraped article title for the document name.
    *   Grants "Edit" access on the created document to the user-provided email address.
*   **Authentication:** Handles Google API authentication via OAuth 2.0 (Web Application flow) server-side.
*   **Configuration:** Managed via a `.env` file.

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
4.  **Context Documents:** Ensure your CV and (optionally) Professional Stories documents are **native Google Docs** and note their **File IDs**.
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
    GOOGLE_CV_DOC_ID=YOUR_CV_GOOGLE_DOC_ID_HERE # Required context doc
    GOOGLE_STORIES_DOC_ID=YOUR_STORIES_GOOGLE_DOC_ID_HERE # Optional context doc
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
    *   Log in and grant permissions (Drive, Docs).
    *   Google will redirect back to `localhost:8000/oauth/callback`.
    *   The server logs should then display a **NEW REFRESH TOKEN**.
    *   **CRITICAL:** Copy this refresh token and paste it into your `.env` file for `GOOGLE_REFRESH_TOKEN`. Save `.env`.
    *   You may need to restart the `deno task start` process after updating `.env`.
5.  **Subsequent Runs:**
    *   Ensure `deno task start` is running.
    *   Access `http://localhost:8000`.
    *   Fill in the form with Google Doc links/IDs (CV required, others optional), source URLs, output folder link/ID, target audience, and your email.
    *   Click "Generate Summaries".
    *   The backend will use the refresh token. Observe the UI and terminal for progress.
    *   Generated summaries will appear in the specified Google Drive folder with edit access granted to your email.

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
*   `.env`: Stores secrets and configuration (ignored by Git).
*   `docs/`: Contains documentation files (PRD, Architecture, Technical).
*   `tasks/`: Contains list of future tasks/improvements.

## Known Issues

*   See `tasks/tasks.md`.
