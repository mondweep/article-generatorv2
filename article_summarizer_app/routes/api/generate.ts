import { Handlers } from "$fresh/server.ts";
import { config } from "../../backend/config.ts";
import { getValidAccessToken } from "../../backend/auth.ts";
import { buildToneContext } from "../../backend/context_builder.ts";
import { scrapeUrlContent } from "../../backend/scraper.ts";
import { generateSummary } from "../../backend/gemini.ts";
import { createGoogleDoc } from "../../backend/google_apis.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const requestBody = await req.json();
      console.log("Received request body:", requestBody);

      // Extract data from request body
      const { contextDocIds, sourceUrls, outputFolderId, geminiModelName, userEmail, targetAudience } = requestBody; // Added targetAudience

      if (!contextDocIds || !Array.isArray(contextDocIds) || !sourceUrls || !Array.isArray(sourceUrls) || !outputFolderId || !userEmail || !targetAudience) { // Added targetAudience validation
        return new Response("Invalid request data", { status: 400 });
      }

      // Load API keys from config (environment)
      const geminiApiKey = config.geminiApiKey;
      const scrapingApiKey = config.scrapingApiKey;
      if (!geminiApiKey || !scrapingApiKey) {
        console.error("Missing API keys (Gemini or ScrapingBee). Check .env file.");
        return new Response("Missing API keys on server.", { status: 500 });
      }

      // 1. Build Tone Context
      console.log("Building tone context...");
      const toneContext = await buildToneContext(contextDocIds);

      const results = []; // Store results for each URL

      // 2. Process each URL
      for (const url of sourceUrls) {
        console.log(`\n--- Processing URL: ${url} ---`);

        // 3a. Scrape Content
        const scrapeResult = await scrapeUrlContent(url, scrapingApiKey);
        if (!scrapeResult || !scrapeResult.content) {
          console.warn(`Skipping URL due to scraping failure or empty content: ${url}`);
          results.push({ url, status: "failure", result: `Scraping failed for ${url}` });
          continue; // Skip to next URL
        }
        const { title: scrapedTitle, content: articleContent } = scrapeResult;

        // 3b. Generate Summary
        const summary = await generateSummary(articleContent, toneContext, geminiApiKey, geminiModelName || config.geminiModelName, targetAudience); // Pass targetAudience
        if (!summary) {
          console.warn(`Skipping URL due to summary generation failure: ${url}`);
          results.push({ url, status: "failure", result: `Summarization failed for ${url}` });
          continue; // Skip to next URL
        }

        // 3c. Create Google Doc
        // Use scraped title if available, otherwise create a fallback
        let docTitle = scrapedTitle ? `Summary: ${scrapedTitle}` : `Summary: ${url.split("/").pop()?.split("?")[0] || "Untitled Article"}`;
        // Limit title length if necessary
        docTitle = docTitle.length > 150 ? docTitle.substring(0, 147) + "..." : docTitle;

        // Prepend source URL to the summary content
        const finalContent = `Source URL: ${url}\n\n---\n\n${summary}`;

        try {
          await createGoogleDoc(docTitle, finalContent, outputFolderId, userEmail); // Pass userEmail
          console.log(`Successfully created Google Doc: "${docTitle}" for URL: ${url}`);
          results.push({ url, status: "success", result: `Successfully summarized and saved to Drive as "${docTitle}"` });
        } catch (error) {
          console.error(`Failed to save summary for URL ${url} to Google Drive:`, error);
          results.push({ url, status: "failure", result: `Failed to save to Google Drive: ${error}` });
        }
        console.log(`--- Finished processing URL: ${url} ---`);
      }

      console.log("\nProcessing complete. Returning results.");
      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("An unexpected error occurred:", error);
      // Check if error is an instance of Error before accessing message
      if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
      } else {
          return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
      }
    }
  },
};
