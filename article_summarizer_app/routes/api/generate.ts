import { Handlers } from "$fresh/server.ts";
import { config } from "../../backend/config.ts";
import { buildToneContext } from "../../backend/context_builder.ts";
import { scrapeUrlContent } from "../../backend/scraper.ts";
import { generateSummary } from "../../backend/gemini.ts";
import { createGoogleDoc } from "../../backend/google_apis.ts";
import { parseFileContent } from "../../backend/parsers.ts";

// --- File Upload Configuration ---
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const handler: Handlers = {
  async POST(req) {
    try {
      const formData = await req.formData();
      const contextDocIds = formData.getAll("contextDocIds[]") as string[];
      const sourceUrls = formData.getAll("sourceUrls[]") as string[];
      const sourceFiles = formData.getAll("sourceFiles") as File[];
      const outputFolderId = formData.get("outputFolderId") as string;
      const userEmail = formData.get("userEmail") as string;
      const targetAudience = formData.get("targetAudience") as string;
      const geminiModelName = formData.get("geminiModelName") as string | null;

      // Validate required fields
      if (!outputFolderId || !userEmail || !targetAudience) {
        return new Response(JSON.stringify({ 
          error: "Missing required fields: outputFolderId, userEmail, or targetAudience." 
        }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      // Validate source files
      const validFiles: File[] = [];
      const fileValidationErrors: string[] = [];
      for (const file of sourceFiles) {
        if (file.size === 0) continue; // Skip empty files

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          fileValidationErrors.push(`Invalid file type for ${file.name}: ${file.type}`);
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          fileValidationErrors.push(`File ${file.name} exceeds size limit of ${MAX_FILE_SIZE_MB}MB`);
        }
        if (fileValidationErrors.length === 0) {
          validFiles.push(file);
        }
      }

      if (fileValidationErrors.length > 0) {
        return new Response(JSON.stringify({ 
          error: "File validation failed.", 
          details: fileValidationErrors 
        }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      if ((!sourceUrls || sourceUrls.length === 0) && (!validFiles || validFiles.length === 0)) {
        return new Response(JSON.stringify({ 
          error: "No source URLs or files provided." 
        }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      const geminiApiKey = config.geminiApiKey;
      const scrapingApiKey = config.scrapingApiKey;

      if (!geminiApiKey || !scrapingApiKey) {
        return new Response(JSON.stringify({ 
          error: "Missing API keys on server." 
        }), { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      const results: Array<{ 
        url?: string; 
        filename?: string; 
        docId?: string; 
        error?: string 
      }> = [];

      // Tone Context Generation
      let toneContext = "";
      if (contextDocIds && contextDocIds.length > 0) {
        try {
          toneContext = await buildToneContext(contextDocIds);
        } catch (error) {
          console.error("Failed to build tone context:", error);
        }
      }

      // Process URLs
      for (const url of sourceUrls) {
        if (!url.trim()) continue;

        try {
          const scrapeResult = await scrapeUrlContent(url.trim(), scrapingApiKey);
          if (!scrapeResult?.content) {
            results.push({ 
              url, 
              error: `No content could be scraped from: ${url}` 
            });
            continue;
          }

          const finalTargetAudience = targetAudience?.trim() || "a general audience";
          const finalModelName = geminiModelName?.trim() || 
            config.geminiModelName || 
            "gemini-1.5-flash-latest";

          const summary = await generateSummary(
            scrapeResult.content, 
            toneContext, 
            geminiApiKey, 
            finalModelName, 
            finalTargetAudience
          );

          const docTitle = scrapeResult.title || url;
          const finalContent = `Source: ${docTitle}\n\n---\n\nTarget Audience: ${finalTargetAudience}\n\n---\n\n${summary}`;

          const docResult = await createGoogleDoc(
            docTitle, 
            finalContent, 
            outputFolderId, 
            userEmail
          );

          results.push({ 
            url, 
            docId: docResult.id 
          });

        } catch (error) {
          results.push({ 
            url, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }

      // Process Files
      for (const file of sourceFiles) {
        try {
          const sourceText = await parseFileContent(file);
          if (!sourceText) {
            results.push({ 
              filename: file.name, 
              error: `No content could be parsed from: ${file.name}` 
            });
            continue;
          }

          const finalTargetAudience = targetAudience?.trim() || "a general audience";
          const finalModelName = geminiModelName?.trim() || 
            config.geminiModelName || 
            "gemini-1.5-flash-latest";

          const summary = await generateSummary(
            sourceText, 
            toneContext, 
            geminiApiKey, 
            finalModelName, 
            finalTargetAudience
          );

          const docTitle = file.name;
          const finalContent = `Source: ${docTitle}\n\n---\n\nTarget Audience: ${finalTargetAudience}\n\n---\n\n${summary}`;

          const docResult = await createGoogleDoc(
            docTitle, 
            finalContent, 
            outputFolderId, 
            userEmail
          );

          results.push({ 
            filename: file.name, 
            docId: docResult.id 
          });

        } catch (error) {
          results.push({ 
            filename: file.name, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }

      return new Response(JSON.stringify({
        message: "Processing complete.",
        results: results,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("Unexpected error:", error);
      return new Response(JSON.stringify({ 
        error: "An unexpected server error occurred.", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
