
import { load } from "https://deno.land/std@0.218.2/dotenv/mod.ts";

// Load environment variables from .env file into Deno.env
// Note: Deno requires --allow-read and --allow-env permissions for this.
await load({ export: true });

function getEnvVar(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const config = {
  geminiApiKey: getEnvVar("GEMINI_API_KEY"),
  geminiModelName: getEnvVar("GEMINI_MODEL_NAME"), // Added for dynamic model name
  scrapingApiKey: getEnvVar("SCRAPING_API_KEY"), // Added for ScrapingBee
  // pdfParserApiKey: getEnvVar("PDF_PARSER_API_KEY"), // Removed PDF.co key
  // googleSheetId: getEnvVar("GOOGLE_SHEET_ID"), // Removed Sheet ID
  // googleSheetRange: getEnvVar("GOOGLE_SHEET_RANGE"), // Removed Sheet Range
  googleDriveFolderId: getEnvVar("GOOGLE_DRIVE_FOLDER_ID"),
  googleCvDocId: getEnvVar("GOOGLE_CV_DOC_ID"), // Re-added CV ID
  googleStoriesDocId: getEnvVar("GOOGLE_STORIES_DOC_ID"), // Keep Stories ID
  googleClientId: getEnvVar("GOOGLE_CLIENT_ID"),
  googleClientSecret: getEnvVar("GOOGLE_CLIENT_SECRET"),
  googleRefreshToken: Deno.env.get("GOOGLE_REFRESH_TOKEN"), // Populated after first auth run

  // Target URLs (hardcoded for now, replacing Google Sheet)
  targetUrls: [
    //"https://www.mckinsey.com/industries/healthcare/our-insights/generative-ai-in-healthcare-current-trends-and-future-outlook",
    //"https://www.gartner.com/en/information-technology/topics/ai-strategy-for-business",
    "https://www.forrester.com/bold/cross-functional-alignment/",
    "https://www.forrester.com/bold/customer-obsession/",
    "https://www.forrester.com/technology/technology-strategy/"
  ],

  // PDF File IDs from Google Drive for Tone Context (Removed)
  // googlePdfIds: [
  //   "1OLUQhpuwAziyJ9uAewNfE9qyHJAfje1_",
  //   "1G6cAVrBR-N8RJOvceQNXL99yapR0ygll",
  //   "1IkJ6WcuTDyueBVLAojkMYIqe8_gPWlFL",
  // ],

  googleApiBaseUrl: "https://www.googleapis.com",
  googleDocsApiBaseUrl: "https://docs.googleapis.com", // Added for Docs API
  googleOauth2Url: "https://oauth2.googleapis.com",
  googleAuthUrl: "https://accounts.google.com/o/oauth2/v2/auth",

  // Scopes required for the application
  googleScopes: [
    // "https://www.googleapis.com/auth/spreadsheets.readonly", // No longer needed
    // "https://www.googleapis.com/auth/drive.file", // Limited scope - only files opened/created by app
    "https://www.googleapis.com/auth/drive.readonly", // Read access to all user's files (needed for PDFs/CV)
    "https://www.googleapis.com/auth/documents.readonly", // Still needed if we try Docs API again
    "https://www.googleapis.com/auth/drive.file", // Keep this for *creating* the summary docs later
  ].join(" "),

  // Redirect URI for Web app flow (must be added in Google Cloud Console)
  redirectUri: "http://localhost:8000/oauth/callback",

  tokenFilePath: "./token.json", // Optional: Path to store tokens locally
};

// Log loaded config for verification (optional, remove in production)
// console.log("Configuration loaded:", config);
