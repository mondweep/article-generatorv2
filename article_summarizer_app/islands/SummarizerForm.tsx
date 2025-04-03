import { useState } from "preact/hooks";

export default function SummarizerForm() {
  const [cvDocLink, setCvDocLink] = useState("");
  const [storiesDocLink, setStoriesDocLink] = useState("");
  const [otherDocLinks, setOtherDocLinks] = useState("");
  const [sourceUrls, setSourceUrls] = useState("");
  const [outputFolderLink, setOutputFolderLink] = useState("");
  const [geminiModelName, setGeminiModelName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [results, setResults] = useState<string[]>([]);

  async function handleSubmit() {
    setLoading(true);
    setStatus("Processing...");
    setResults([]);

    // Basic validation (more robust validation needed)
    if (!cvDocLink || !storiesDocLink || !sourceUrls || !outputFolderLink) {
      setStatus("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    // Extract IDs and URLs (more robust parsing needed)
    const cvDocId = extractIdFromLink(cvDocLink);
    const storiesDocId = extractIdFromLink(storiesDocLink);
    const otherDocIds = otherDocLinks.split("\n") // Split by actual newline
        .map(link => extractIdFromLink(link))
        .filter((id): id is string => id !== null); // Filter out nulls and ensure string type
    const outputFolderId = extractIdFromLink(outputFolderLink);
    const sourceUrlList = sourceUrls.split("\n") // Split by actual newline
        .map(s => s.trim())
        .filter(s => s !== "" && s.startsWith("http")); // Basic URL validation

    if (!cvDocId || !storiesDocId || !outputFolderId || sourceUrlList.length === 0) {
      setStatus("Invalid Google Drive link format or no URLs provided.");
      setLoading(false);
      return;
    }

    // Construct request body
    const requestBody = {
      contextDocIds: [cvDocId, storiesDocId, ...otherDocIds], // Include other doc IDs
      sourceUrls: sourceUrlList,
      outputFolderId: outputFolderId,
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

      if (!response.ok) {
        const errorBody = await response.text();
        setStatus(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setResults(data.results || []);
      setStatus("Processing complete!");
    } catch (error) {
      setStatus(`Frontend Error: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  function extractIdFromLink(link: string): string | null {
    // Basic attempt to extract ID from Google Drive link (improve this)
    const match = link.match(/[-\w]{25,}/); // Basic ID regex
    return match ? match[0] : null;
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="max-w-lg">
      <div>
        <label htmlFor="cvDocLink" class="block text-gray-700 text-sm font-bold mb-2">CV Google Doc Link:</label>
        <input type="text" id="cvDocLink" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={cvDocLink} onChange={(e) => setCvDocLink((e.target as HTMLInputElement)?.value ?? "")} />
      </div>
      <div>
        <label htmlFor="storiesDocLink" class="block text-gray-700 text-sm font-bold mb-2">Professional Stories Google Doc Link:</label>
        <input type="text" id="storiesDocLink" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={storiesDocLink} onChange={(e) => setStoriesDocLink((e.target as HTMLInputElement)?.value ?? "")} />
      </div>
      <div>
        <label htmlFor="otherDocLinks" class="block text-gray-700 text-sm font-bold mb-2">Additional Context Document Links (one per line):</label>
        <textarea id="otherDocLinks" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={otherDocLinks} onChange={(e) => setOtherDocLinks((e.target as HTMLTextAreaElement)?.value ?? "")} rows={3} />
      </div>
      <div>
        <label htmlFor="sourceUrls" class="block text-gray-700 text-sm font-bold mb-2">Source Article URLs (one per line):</label>
        <textarea id="sourceUrls" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={sourceUrls} onChange={(e) => setSourceUrls((e.target as HTMLTextAreaElement)?.value ?? "")} rows={5} />
      </div>
      <div>
        <label htmlFor="outputFolderLink" class="block text-gray-700 text-sm font-bold mb-2">Output Google Drive Folder Link:</label>
        <input type="text" id="outputFolderLink" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={outputFolderLink} onChange={(e) => setOutputFolderLink((e.target as HTMLInputElement)?.value ?? "")} />
      </div>
      <div>
        <label htmlFor="geminiModelName" class="block text-gray-700 text-sm font-bold mb-2">Gemini Model Name (optional):</label>
        <input type="text" id="geminiModelName" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={geminiModelName} onChange={(e) => setGeminiModelName((e.target as HTMLInputElement)?.value ?? "")} />
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
              <li key={index} class="mb-2">
                {result}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
