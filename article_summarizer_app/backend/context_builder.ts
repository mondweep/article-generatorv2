// Removed direct config import, will pass IDs as args
// import { config } from "./config.ts";
import { fetchNativeGoogleDocText } from "./google_apis.ts";

/**
 * Fetches and combines content from the specified Google Docs (CV, Stories, etc.).
 * @param contextDocIds An array of Google Document IDs to fetch content from.
 * @returns A promise that resolves to the combined tone context string.
 */
export async function buildToneContext(contextDocIds: string[]): Promise<string> {
  console.log(`Building tone context from ${contextDocIds.length} Google Docs...`);
  const contextParts: string[] = [];

  for (const docId of contextDocIds) {
      if (!docId) continue; // Skip empty IDs

      console.log(`Fetching content for context Doc ID: ${docId}...`);
      try {
        const docContent = await fetchNativeGoogleDocText(docId);
        if (docContent) { // Check docContent, not cvContent
          // Add a generic header for each context document
          contextParts.push(`--- Context Document (ID: ${docId}) ---\n${docContent}\n\n`);
          console.log(`Successfully added context from Doc ID: ${docId}.`);
        } else {
          console.warn(`Content from Doc ID ${docId} was empty or fetch failed.`);
        }
      } catch (error) {
        console.error(`Error fetching context Doc ID ${docId}:`, error);
        // Continue to next document even if one fails
      }
  }


  if (contextParts.length === 0) {
    console.error("Failed to gather any content for tone context. Cannot proceed effectively.");
    // Depending on requirements, could return "" or throw error. Let's return empty for now.
    return "";
  }

  const combinedContext = contextParts.join("\n");
  console.log(`Tone context built successfully. Total length: ${combinedContext.length}`);
  return combinedContext;
}
