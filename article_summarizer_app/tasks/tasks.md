# Tasks & Future Improvements (Fresh App)

This document lists potential tasks, bug fixes, and future enhancements for the Fresh web application version of the Tone-Based Article Summarizer.

## High Priority / Bug Fixes

*   **Resolve Google Sheet 404 Error:** Investigate the persistent `404 Not Found` error when accessing Google Sheets via the API. If resolved, integrate Sheet reading as an alternative to manual URL input.
*   **Implement Robust PDF/DOCX Parsing:** If context from PDF/DOCX files is required, implement a reliable text extraction method. Options:
    *   Revisit PDF.co API, focusing on the file upload method (multipart/form-data) instead of base64 or URL. Check specific endpoints for DOCX.
    *   Investigate other external parsing APIs (Cloudmersive, etc.).
    *   Explore WASM-based PDF libraries again, checking for updates or different modules compatible with Deno 2.x.
    *   Add UI option to indicate if a context document is PDF/DOCX vs. native Google Doc.
*   **Robust Google Drive ID Extraction:** Improve the `extractIdFromLink` function in `SummarizerForm.tsx` to handle various Google Drive URL formats (sharing links, folder links, direct file links) more reliably.

## Medium Priority / Enhancements

*   **Asynchronous Processing & Status Updates:** Modify the `/api/generate` endpoint and frontend to handle long-running tasks asynchronously.
    *   API could return a job ID immediately.
    *   Frontend could poll a status endpoint or use WebSockets/Server-Sent Events for real-time progress updates (e.g., "Scraping URL 1...", "Generating summary...", "Saving Doc...").
*   **Refine Gemini Prompt:** Experiment with the prompt in `gemini.ts` for better tone, "My Take" section quality, and handling different article types.
*   **Improve Scraping Robustness:**
    *   Add more specific CSS selectors in `scraper.ts` for content extraction.
    *   Add option in UI to enable JavaScript rendering via ScrapingBee (`render_js=true`) for specific URLs.
    *   Implement retry logic for scraping attempts.
*   **Improve Error Handling & Reporting:**
    *   Provide more user-friendly error messages on the frontend based on API responses.
    *   Implement retries for transient API errors (e.g., Gemini rate limits, network issues).
*   **Secure/Automated Token Storage:** Implement server-side storage for the refresh token (e.g., in a protected file or database) instead of relying on manual copy/paste from logs. Modify `auth.ts` and `routes/oauth/callback.ts`.
*   **UI Improvements:**
    *   Add loading indicators per step.
    *   Improve layout and styling.
    *   Provide clearer instructions and validation messages.
    *   Display generated document links more prominently.
    *   Allow clearing the form easily.
*   **Configuration Flexibility:** Allow specifying context doc types (GDoc, PDF, DOCX) in the UI to route to the correct parsing logic (once implemented).

## Low Priority / Nice-to-Haves

*   **Add Automated Tests:** Implement unit/integration tests for backend modules and potentially frontend components.
*   **Batch Processing:** Allow processing URLs in batches.
*   **User Accounts:** Implement user accounts if multiple people need to use the application with their own credentials and context documents.
*   **Deployment:** Configure for deployment to a platform like Deno Deploy.
