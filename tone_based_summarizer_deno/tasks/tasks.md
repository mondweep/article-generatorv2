# Tasks & Future Improvements

This document lists potential tasks, bug fixes, and future enhancements for the Tone-Based Article Summarizer application.

## High Priority / Bug Fixes

*   **Resolve Google Sheet 404 Error:** Investigate the persistent `404 Not Found` error when accessing the Google Sheet via the API. This might involve:
    *   Further checking Google Cloud Project settings (permissions, API enablement propagation).
    *   Trying the Python test script again after ensuring its dependencies are correctly installed and configured.
    *   Contacting Google Cloud Support if the issue persists despite correct configuration.
*   **(If needed) Implement Robust PDF/DOCX Parsing:** If context from PDF/DOCX files is required, implement a reliable text extraction method. Options:
    *   Revisit PDF.co API, focusing on the file upload method (multipart/form-data) instead of base64 or URL, which might avoid previous errors.
    *   Investigate other external parsing APIs.
    *   Explore WASM-based PDF libraries that might run locally in Deno without native Node dependencies.
    *   Consider a pre-processing step where the user converts these files to native Google Docs manually.

## Medium Priority / Enhancements

*   **Configurable URL Source:** Replace the hardcoded `targetUrls` array in `config.ts` with a more flexible input method:
    *   Read URLs from a local text file.
    *   Accept URLs as command-line arguments.
    *   (Ideally) Restore functionality to read from the Google Sheet once the 404 error is resolved.
*   **Refine Gemini Prompt:** Experiment with the prompt structure and instructions in `gemini.ts` to improve:
    *   Accuracy of tone adoption.
    *   Quality and relevance of the "My Take" section.
    *   Overall summary coherence and conciseness.
    *   Handling of different article lengths and complexities.
*   **Improve Scraping Robustness:**
    *   Add more sophisticated selectors in `scraper.ts` to target main content more reliably across different website structures (beyond just `article`, `main`, `body`).
    *   Implement optional JavaScript rendering via ScrapingBee (`render_js=true`) for sites that heavily rely on client-side rendering, potentially controlled by a config flag per URL.
    *   Consider adding retry logic for failed scrapes (both direct and ScrapingBee).
*   **Improve Error Handling:**
    *   Provide more specific error messages to the user.
    *   Implement retry logic for transient network errors or API rate limits (e.g., for Gemini).
    *   Allow configuration of whether to stop on error or continue processing other URLs.
*   **Secure Token Storage:** Modify `auth.ts` to save the refresh token to a local file (e.g., `token.json`, protected by `.gitignore`) instead of requiring manual copy/paste to `.env`. Ensure file permissions are handled securely.
*   **Refine Document Titling:** Improve the fallback logic for Google Doc titles when an HTML `<title>` cannot be extracted.

## Low Priority / Nice-to-Haves

*   **Add Automated Tests:** Implement unit and integration tests for key modules (e.g., API interactions, scraping logic, context building).
*   **Progress Indicator:** Add a more visual progress indicator during the URL processing loop.
*   **Batch Processing:** Allow processing URLs in batches to potentially manage API rate limits more effectively.
*   **User Interface:** Develop a simple web UI or GUI instead of being purely command-line based.
