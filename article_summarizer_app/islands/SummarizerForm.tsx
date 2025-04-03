import { useState } from "preact/hooks";

// Simple Info Icon component (using SVG)
function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 inline-block ml-1 text-gray-500">
      <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  );
}


export default function SummarizerForm() {
  const [cvDocLink, setCvDocLink] = useState("");
  const [storiesDocLink, setStoriesDocLink] = useState("");
  const [otherDocLinks, setOtherDocLinks] = useState("");
  const [sourceUrls, setSourceUrls] = useState("");
  const [outputFolderLink, setOutputFolderLink] = useState("");
  const [geminiModelName, setGeminiModelName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [targetAudience, setTargetAudience] = useState("CIOs"); // Added state for audience, default to CIOs
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [results, setResults] = useState<Array<{ url: string; status: string; result: string }>>([]); // More specific result type

  async function handleSubmit() {
    setLoading(true);
    setStatus("Processing...");
    setResults([]);

    // Basic validation (more robust validation needed)
    // CV and Target Audience are required, Stories is optional
    if (!cvDocLink || !sourceUrls || !outputFolderLink || !userEmail || !targetAudience) {
      setStatus("Please fill in all required fields (CV, Source URLs, Output Folder, Email, Target Audience). Stories doc is optional.");
      setLoading(false);
      return;
    }

    // Extract IDs and URLs (more robust parsing needed)
    const cvDocId = extractIdFromLink(cvDocLink);
    const storiesDocId = extractIdFromLink(storiesDocLink); // Extract even if empty, filter later
    const otherDocIds = otherDocLinks.split("\n")
        .map(link => extractIdFromLink(link))
        .filter((id): id is string => id !== null);
    const outputFolderId = extractIdFromLink(outputFolderLink);
    const sourceUrlList = sourceUrls.split("\n")
        .map(s => s.trim())
        .filter(s => s !== "" && s.startsWith("http"));

    // Filter context IDs - ensure CV is present, include stories/others if they exist
    const contextDocIds = [cvDocId, storiesDocId, ...otherDocIds].filter((id): id is string => id !== null);

    if (!cvDocId || !outputFolderId || sourceUrlList.length === 0) { // Check required IDs again after filtering
      setStatus("Invalid Google Drive link format for required fields (CV, Output Folder) or no valid Source URLs provided.");
      setLoading(false);
      return;
    }
    if (contextDocIds.length === 0) { // Ensure at least one context doc ID exists (CV is required)
        setStatus("CV Google Doc link is required for context.");
        setLoading(false);
        return;
    }


    // Construct request body
    const requestBody = {
      contextDocIds: contextDocIds, // Send filtered list
      sourceUrls: sourceUrlList,
      outputFolderId: outputFolderId,
      userEmail: userEmail,
      targetAudience: targetAudience, // Added target audience
      geminiModelName: geminiModelName || undefined, // Optional
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json(); // Try to parse JSON regardless of status

      if (!response.ok) {
        setStatus(`API Error: ${response.status} ${response.statusText} - ${data.error || 'Unknown API error'}`);
        setLoading(false);
        return;
      }

      setResults(data.results || []); // Expecting an array of result objects
      setStatus("Processing complete!");
    } catch (error) {
      setStatus(`Frontend Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  function extractIdFromLink(link: string | null): string | null {
    if (!link) return null;
    // Basic attempt to extract ID from Google Drive link (improve this)
    // Handles /d/ or /file/d/ formats
    const match = link.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="max-w-lg space-y-4"> {/* Added space-y-4 */}
      <div>
        <label htmlFor="cvDocLink" class="block text-gray-700 text-sm font-bold mb-2" title="Link to your CV as a native Google Doc. This is required for tone context.">
          CV Google Doc Link:*
          <InfoIcon />
        </label>
        <input type="text" id="cvDocLink" required class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={cvDocLink} onChange={(e) => setCvDocLink((e.target as HTMLInputElement)?.value ?? "")} />
      </div>
      <div>
        <label htmlFor="storiesDocLink" class="block text-gray-700 text-sm font-bold mb-2" title="Link to your 'Professional Stories' as a native Google Doc (Optional).">
          Professional Stories Google Doc Link:
          <InfoIcon />
        </label>
        <input type="text" id="storiesDocLink" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={storiesDocLink} onChange={(e) => setStoriesDocLink((e.target as HTMLInputElement)?.value ?? "")} />
      </div>
      <div>
        <label htmlFor="otherDocLinks" class="block text-gray-700 text-sm font-bold mb-2" title="Links to other native Google Docs for additional context (Optional, one link per line).">
          Additional Context Document Links:
          <InfoIcon />
        </label>
        <textarea id="otherDocLinks" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={otherDocLinks} onChange={(e) => setOtherDocLinks((e.target as HTMLTextAreaElement)?.value ?? "")} rows={3} />
      </div>
      <div>
        <label htmlFor="sourceUrls" class="block text-gray-700 text-sm font-bold mb-2" title="URLs of the articles you want to summarize (Required, one URL per line).">
          Source Article URLs:*
          <InfoIcon />
        </label>
        <textarea id="sourceUrls" required class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={sourceUrls} onChange={(e) => setSourceUrls((e.target as HTMLTextAreaElement)?.value ?? "")} rows={5} />
      </div>
      <div>
        <label htmlFor="outputFolderLink" class="block text-gray-700 text-sm font-bold mb-2" title="Link to the Google Drive folder where summaries should be saved (Required).">
          Output Google Drive Folder Link:*
          <InfoIcon />
        </label>
        <input type="text" id="outputFolderLink" required class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={outputFolderLink} onChange={(e) => setOutputFolderLink((e.target as HTMLInputElement)?.value ?? "")} />
      </div>
      <div>
        <label htmlFor="geminiModelName" class="block text-gray-700 text-sm font-bold mb-2" title="Specific Gemini model name (e.g., gemini-1.5-flash-latest). Defaults to value in .env if left blank.">
          Gemini Model Name (optional):
          <InfoIcon />
        </label>
        <input type="text" id="geminiModelName" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={geminiModelName} onChange={(e) => setGeminiModelName((e.target as HTMLInputElement)?.value ?? "")} />
      </div>
      <div> {/* Removed margin-top as space-y handles it */}
        <label htmlFor="userEmail" class="block text-gray-700 text-sm font-bold mb-2" title="Your Google email address to grant Edit access to the generated documents (Required).">
          Your Google Email (for Edit Access):*
          <InfoIcon />
        </label>
        <input type="email" id="userEmail" required class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={userEmail} onChange={(e) => setUserEmail((e.target as HTMLInputElement)?.value ?? "")} />
      </div>
      <div>
        <label htmlFor="targetAudience" class="block text-gray-700 text-sm font-bold mb-2" title="Specify the target audience for the summary (e.g., CIOs, Marketing Managers, Developers). Required.">
          Target Audience:*
          <InfoIcon />
        </label>
        <input type="text" id="targetAudience" required class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={targetAudience} onChange={(e) => setTargetAudience((e.target as HTMLInputElement)?.value ?? "")} />
      </div>

      <button type="submit" disabled={loading} class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50">
        {loading ? "Generating..." : "Generate Summaries"}
      </button>

      {status && <p class="mt-4 text-red-500">{status}</p>}

      {results.length > 0 && (
        <div class="mt-4">
          <h2 class="text-xl font-bold mb-2">Results:</h2>
          <ul>
            {results.map((result, index) => (
              <li key={index} class={`mb-2 ${result.status === 'failure' ? 'text-red-600' : 'text-green-600'}`}>
                <strong>URL:</strong> {result.url}<br/>
                <strong>Status:</strong> {result.status}<br/>
                <strong>Message:</strong> {result.result}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
