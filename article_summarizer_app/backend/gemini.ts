
// Removed direct config import, will pass keys/model as args
// // Removed direct config import, will pass keys/model as args
// import { config } from "./config.ts";

// Define expected structure for Gemini API request/response (adjust based on actual API)
// Check the official Google AI documentation for the correct model and API structure.
// This is a likely structure for a text generation model like Gemini Pro.
interface GeminiGenerateContentRequest {
  contents: [
    {
      parts: [
        { text: string }, // The prompt
      ];
    },
  ];
  // generationConfig?: { ... }; // Optional: temperature, topP, etc.
  // safetySettings?: { ... }; // Optional: safety thresholds
}

interface GeminiGenerateContentResponse {
  candidates: [
    {
      content: {
        parts: [
          { text: string }, // The generated text
        ];
        role: string; // "model"
      };
      // finishReason?: string;
      // index?: number;
      // safetyRatings?: { ... };
    },
  ];
  // promptFeedback?: { ... };
}


/**
 * Generates a summary using the Gemini API based on article content and tone context.
 * @param articleContent The main text content scraped from the target article.
 * @param toneContext The combined text from Medium articles, CV, and stories for tone reference.
 * @param apiKey The Gemini API Key.
 * @param modelName The specific Gemini model name to use (e.g., "gemini-1.5-flash-latest").
 * @param targetAudience The intended audience for the summary (e.g., "CIOs").
 * @returns A promise that resolves to the generated summary text, or null if generation fails.
 */
export async function generateSummary(
  articleContent: string,
  toneContext: string,
  apiKey: string,
  modelName: string,
  targetAudience: string, // Added targetAudience parameter
): Promise<string | null> {
  console.log(`Generating summary for ${targetAudience} with Gemini model: ${modelName}...`);

  // Construct the endpoint dynamically
  const apiEndpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  // Note: Using v1beta endpoint. Might need to change to v1 depending on model availability.

  // --- Construct the Prompt ---
  // This is crucial and may need refinement based on results.
  const prompt = `
You are an AI assistant tasked with summarizing web articles for a CIO audience. Your goal is to adopt the writing style and tone demonstrated in the provided "Tone Context" while summarizing the "Article Content".

**Tone Context (CV and Stories):**
--- START TONE CONTEXT ---
${toneContext}
--- END TONE CONTEXT ---

**Article Content:**
--- START ARTICLE CONTENT ---
${articleContent}
--- END ARTICLE CONTENT ---

**Instructions:**

1.  **Summarize:** Create a concise yet informative summary of the "Article Content".
2.  **Adopt Tone:** Write the summary strictly adhering to the tone, style, vocabulary, and perspective demonstrated in the "Tone Context". Imagine the author of the Tone Context is writing this summary.
3.  **Target Audience:** The summary is for the specified **Target Audience: ${targetAudience}**. Focus on strategic implications, business value, and potential impact relevant to their role.
4.  **Visual Appeal:** Use relevant emojis appropriately (but not excessively) to make the summary engaging and visually appealing for a quick read.
5.  **AI Perspective:** Integrate a perspective on AI adoption and scaling related to the article's subject matter, reflecting the likely views expressed in the Tone Context.
6.  **Trustworthiness:** Ensure the summary is accurate, objective regarding the source article's points.
7.  **My Take Section:** Include a distinct section at the end titled "**My Take:**". In this section, provide a brief perspective or reflection on the article's topic, weaving in relevant experiences and insights from the CV and Stories provided in the Tone Context to showcase unique value and position the author as a positive contributor to the topic. Conclude this section with the exact sentence: "If this interests you and would like a confidential chat, feel free to connect with me and send a message."
8.  **Spelling:** Use British English spelling throughout (e.g., "summarise", "organisation").
9.  **Format:** Present the summary as a well-structured report or post. Use clear headings or bullet points if appropriate for readability. Start directly with the summary content, followed by the "My Take" section.

**Generated Summary:**
`;
  // --- End Prompt Construction ---

  const requestBody: GeminiGenerateContentRequest = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    // Add generationConfig or safetySettings here if needed
  };

  try {
    const response = await fetch(apiEndpoint, { // Use dynamic endpoint
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `Gemini API request failed: ${response.status} ${response.statusText} - ${errorBody}`,
      );
      return null;
    }

    const responseData: GeminiGenerateContentResponse = await response.json();

    // Extract the generated text from the response structure
    const generatedText =
      responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error(
        "Failed to extract generated text from Gemini response:",
        JSON.stringify(responseData, null, 2), // Log the full response for debugging
      );
      return null;
    }

    console.log("Successfully generated summary from Gemini.");
    return generatedText.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return null;
  }
}
