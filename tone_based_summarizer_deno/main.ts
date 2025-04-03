import { config } from "./config.ts";
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getValidAccessToken,
} from "./auth.ts";
// Removed fetchSheetData, testFetchSheetMetadata
import { createGoogleDoc } from "./google_apis.ts";
import { buildToneContext } from "./context_builder.ts";
import { scrapeUrlContent } from "./scraper.ts";
import { generateSummary } from "./gemini.ts";
import { delay } from "https://deno.land/std@0.218.2/async/delay.ts"; // Import delay

async function main() {
  console.log("Starting Tone-Based Summarizer...");

  // --- Main Logic ---
  try {
    console.log("Ensuring authentication is ready...");
    // getValidAccessToken will handle the auth flow (incl. server) if needed
    await getValidAccessToken();
    console.log("Authentication successful or already established.");

    // 1. Build Tone Context
    const toneContext = await buildToneContext();

    // 2. Get URLs from Config (instead of Sheet)
    const urlsToProcess = config.targetUrls.filter((url) =>
      url && url.trim().startsWith("http")
    ); // Basic validation
    console.log(`Found ${urlsToProcess.length} URLs in config to process.`);

    // 3. Process each URL
    for (const [index, url] of urlsToProcess.entries()) {
      console.log(`\n--- Processing URL ${index + 1}/${urlsToProcess.length}: ${url} ---`);

      // Add delay before processing each URL (except the first one)
      if (index > 0) {
          const delaySeconds = 5;
          console.log(`Waiting for ${delaySeconds} seconds before next request...`);
          await delay(delaySeconds * 1000);
      }

      // 3a. Scrape Content and Title
      const scrapeResult = await scrapeUrlContent(url);
      if (!scrapeResult || !scrapeResult.content) { // Check if result or content is null
        console.warn(`Skipping URL due to scraping failure or empty content: ${url}`);
        continue; // Skip to next URL
      }
      const { title: scrapedTitle, content: articleContent } = scrapeResult;


      // 3b. Generate Summary
      const summary = await generateSummary(articleContent, toneContext);
      if (!summary) {
        console.warn(`Skipping URL due to summary generation failure: ${url}`);
        continue; // Skip to next URL
      }

      // 3c. Create Google Doc
      // Use scraped title if available, otherwise create a fallback
      let docTitle = scrapedTitle ? `Summary: ${scrapedTitle}` : `Summary: ${url.split("/").pop()?.split("?")[0] || "Untitled Article"}`;
      // Limit title length if necessary
      docTitle = docTitle.length > 150 ? docTitle.substring(0, 147) + "..." : docTitle; // Increased limit slightly

      // Prepend source URL to the summary content
      const finalContent = `Source URL: ${url}\n\n---\n\n${summary}`;

      try {
        await createGoogleDoc(docTitle, finalContent);
      } catch (error) {
        console.error(`Failed to save summary for URL ${url} to Google Drive:`, error);
        // Decide whether to continue or stop on save failure
      }
      console.log(`--- Finished processing URL: ${url} ---`);
    }

    console.log("\nProcessing complete.");
  } catch (error) {
    console.error("\nAn unexpected error occurred during processing:", error);
    // Check if error is an instance of Error before accessing message
    // Check if error is an instance of Error before accessing message
    if (error instanceof Error && error.message.includes("Authorization failed")) {
        console.error("Authorization process failed. Please check console logs and Google Cloud settings.");
    } else if (error instanceof Error && error.message.includes("refresh token")) {
      console.error(
        "Authentication might have failed or expired (e.g., invalid refresh token). Try removing the GOOGLE_REFRESH_TOKEN from .env and re-running to re-authorize.",
      );
    } else if (error instanceof Error) {
        console.error(`An unexpected error occurred: ${error.message}`);
        console.error(error.stack); // Log stack trace for debugging
    } else {
        console.error("An unexpected non-error value was thrown:", error);
    }
  }
}

// Run the main function
main();
