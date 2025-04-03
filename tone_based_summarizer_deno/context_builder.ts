import { config } from "./config.ts";
import { fetchNativeGoogleDocText } from "./google_apis.ts";

/**
 * Fetches and combines content from the CV and Stories Google Docs.
 * @returns A promise that resolves to the combined tone context string.
 */
export async function buildToneContext(): Promise<string> {
  console.log("Building tone context from CV and Stories Docs...");
  const contextParts: string[] = [];

  // 1. Fetch Native Google Doc Content (CV) using Docs API
  console.log("Fetching CV content from Google Doc...");
  try {
    // Ensure GOOGLE_CV_DOC_ID is read from config (which reads from .env)
    const cvId = config.googleCvDocId;
    if (!cvId) {
        console.warn("GOOGLE_CV_DOC_ID not found in config/env. Skipping CV context.");
    } else {
        const cvContent = await fetchNativeGoogleDocText(cvId);
        if (cvContent) {
          contextParts.push(`--- CV Content ---\n${cvContent}\n\n`);
          console.log("Successfully added context from CV Google Doc.");
        } else {
          console.warn("CV content from Google Doc was empty or fetch failed.");
        }
    }
  } catch (error) {
    console.error("Error fetching CV Google Doc content:", error);
  }

  // 2. Fetch Native Google Doc Content (Stories) using Docs API
  console.log("Fetching Stories content from Google Doc...");
  try {
    const storiesContent = await fetchNativeGoogleDocText(config.googleStoriesDocId);
    if (storiesContent) {
      contextParts.push(`--- Professional Stories Content ---\n${storiesContent}\n\n`);
      console.log("Successfully added context from Stories Google Doc.");
    } else {
      console.warn("Stories content from Google Doc was empty or fetch failed.");
    }
  } catch (error) {
    console.error("Error fetching Stories Google Doc content:", error);
  }

  if (contextParts.length === 0) {
    console.error("Failed to gather any content for tone context (CV or Stories). Cannot proceed effectively.");
    // Depending on requirements, could return "" or throw error. Let's return empty for now.
    return "";
  }

  const combinedContext = contextParts.join("\n");
  console.log(`Tone context built successfully. Total length: ${combinedContext.length}`);
  return combinedContext;
}
