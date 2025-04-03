import { DOMParser, Element } from "deno_dom"; // Use import map
import { config } from "./config.ts"; // Local import should be fine

interface ScrapeResult {
    title: string | null;
    content: string | null;
}

// --- Helper Function to Parse HTML and Extract Text ---
function parseAndExtract(html: string, url: string, source: string): ScrapeResult {
    console.log(`Parsing HTML from ${source} (length: ${html.length})...`);
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) {
      console.error(`Failed to parse HTML from ${source} for ${url}`);
      return { title: null, content: null };
    }

    // Extract Title
    const title = doc.querySelector("title")?.textContent?.trim() || null;
    console.log(`Extracted Title: ${title || 'Not Found'}`);

    // Extract Content
    let mainContentElement = doc.querySelector("article, main");
    if (!mainContentElement) {
      mainContentElement = doc.body;
    }
    if (!mainContentElement) {
        console.error(`Could not find main content container in HTML from ${source} for ${url}`);
        return { title: title, content: null }; // Return title even if content fails
    }

    mainContentElement.querySelectorAll("script, style, noscript, iframe, nav, header, footer, aside")
      .forEach((el) => (el as Element).remove());

    const extractedText = (mainContentElement as Element).innerText;

    if (!extractedText || extractedText.trim().length === 0) {
        console.warn(`Extracted text from ${url} via ${source} appears empty after parsing.`);
        return { title: title, content: null }; // Return title even if content is empty
    }

    const cleanedContent = extractedText.replace(/\s\s+/g, ' ').trim();
    console.log(`Successfully extracted text from ${url} via ${source}. Text length: ${cleanedContent.length}`);
    return { title: title, content: cleanedContent };
}


// --- Method 1: Direct Fetch with Headers ---
async function scrapeWithDirectFetch(url: string): Promise<ScrapeResult | null> {
    console.log(`Attempting direct fetch for: ${url}`);
    try {
        const headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"macOS"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
        };
        const response = await fetch(url, { headers });

        if (!response.ok) {
          console.warn(`Direct fetch failed for ${url}: ${response.status} ${response.statusText}`);
          return null; // Indicate failure
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("text/html")) {
          console.warn(`Skipping URL ${url}: Content-Type is not HTML (${contentType})`);
          return null;
        }

        const html = await response.text();
        return parseAndExtract(html, url, "Direct Fetch");

    } catch (error) {
        console.error(`Error during direct fetch for ${url}:`, error);
        return null; // Indicate failure
    }
}

// --- Method 2: ScrapingBee API ---
// Accepts apiKey as a parameter now
async function scrapeWithScrapingBee(url: string, apiKey: string): Promise<ScrapeResult | null> {
    console.log(`Attempting ScrapingBee API for: ${url}`);
    const scrapingBeeUrl = "https://app.scrapingbee.com/api/v1/";
    // apiKey comes from parameter

    if (!apiKey) { // Check if apiKey was actually passed
        console.error("SCRAPING_API_KEY not found. Cannot use ScrapingBee.");
        return null;
    }

    try {
        const params = new URLSearchParams({ api_key: apiKey, url: url });
        const requestUrl = `${scrapingBeeUrl}?${params.toString()}`;

        console.log("Calling ScrapingBee API...");
        const response = await fetch(requestUrl);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`ScrapingBee API request failed for ${url}: ${response.status} ${response.statusText} - ${errorBody}`);
            return null;
        }

        const html = await response.text();
        return parseAndExtract(html, url, "ScrapingBee");

    } catch (error) {
        console.error(`Error calling ScrapingBee API for ${url}:`, error);
        return null;
    }
}

/**
 * Attempts to scrape the main textual content and title from a given URL.
 * Tries direct fetch first, then falls back to ScrapingBee API if direct fetch fails.
 * @param url The URL to scrape.
 * @param scrapingApiKey The API key for ScrapingBee.
 * @returns A promise that resolves to an object { title: string|null, content: string|null }, or null if scraping fails completely.
 */
export async function scrapeUrlContent(url: string, scrapingApiKey: string): Promise<ScrapeResult | null> {
    console.log(`Attempting to scrape content from: ${url}`);

    // Try direct fetch first
    let result = await scrapeWithDirectFetch(url);

    // If direct fetch failed (returned null), try ScrapingBee, passing the key
    if (result === null) {
        console.log(`Direct fetch failed for ${url}, falling back to ScrapingBee.`);
        result = await scrapeWithScrapingBee(url, scrapingApiKey);
    }

    if (result === null) {
        console.error(`Both direct fetch and ScrapingBee failed for ${url}.`);
    }

    return result; // Return the result object (or null if both failed)
}
