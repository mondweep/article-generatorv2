// import { Buffer } from "$std/io/buffer.ts"; // Use alias if uncommented
// readerFromStreamReader is not needed when using streams/copy
// import { copy } from "$std/streams/copy.ts"; // Removed - using pipeTo instead
import { BlobReader, TextWriter, ZipReader } from "https://deno.land/x/zipjs@v2.7.47/index.js";
// Using deno-dom for XML/HTML parsing
// Note: deno.json uses deno_dom v0.1.45, this file uses v0.1.47. Consider aligning versions.
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.47/deno-dom-wasm.ts";

/**
 * Checks if a command exists in the system's PATH.
 * @param command The command name (e.g., "pdftotext").
 * @returns Promise<boolean> True if the command exists, false otherwise.
 */
async function commandExists(command: string): Promise<boolean> {
    try {
        const process = new Deno.Command("which", {
            args: [command],
            stdout: "null", // Don't capture output, just check exit code
            stderr: "null",
        });
        const status = await process.output();
        return status.success;
    } catch (error) {
        console.error(`Error checking for command "${command}":`, error);
        return false; // Error likely means it doesn't exist or permissions issue
    }
}

/**
 * Parses text content from a PDF file using the 'pdftotext' command-line utility.
 * Requires 'pdftotext' (often part of poppler-utils) to be installed and in the PATH.
 * @param file The PDF file object.
 * @returns Promise<string> The extracted text content.
 * @throws Error if 'pdftotext' command is not found or if parsing fails.
 */
async function parsePdf(file: File): Promise<string> {
    console.log(`Attempting to parse PDF: ${file.name}`);
    const pdftotextExists = await commandExists("pdftotext");
    if (!pdftotextExists) {
        console.error("'pdftotext' command not found. Please install poppler-utils.");
        throw new Error("'pdftotext' command not found. Cannot parse PDF files.");
    }

    // pdftotext reads from stdin and writes to stdout with the '-' arguments
    const command = new Deno.Command("pdftotext", {
        args: ["-", "-"], // Read from stdin, write to stdout
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
    });

    const process = command.spawn();

    // Pipe the file content to the process's stdin
    // Use readerFromStreamReader to bridge Web Stream and Deno Reader
    // Pipe the file stream directly to the process stdin using pipeTo
    await file.stream().pipeTo(process.stdin);
    // process.stdin is automatically closed by pipeTo on completion/error, no need to close manually.

    // Read the output
    const { success, stdout, stderr } = await process.output();
    const outputText = new TextDecoder().decode(stdout);
    const errorText = new TextDecoder().decode(stderr);

    if (!success) {
        console.error(`pdftotext failed for ${file.name}. Error: ${errorText}`);
        throw new Error(`Failed to parse PDF '${file.name}': ${errorText}`);
    }

    console.log(`Successfully parsed PDF: ${file.name}`);
    return outputText.trim();
}

/**
 * Parses text content from a DOCX file.
 * (Implementation pending)
 * @param file The DOCX file object.
 * @returns Promise<string> The extracted text content.
 * @throws Error if parsing fails.
 */
async function parseDocx(file: File): Promise<string> {
    console.log(`Attempting to parse DOCX: ${file.name}`);
    let zipReader: ZipReader<Blob> | null = null; // Initialize to null
    try {
        // 1. Read the DOCX file as a zip archive
        const blobReader = new BlobReader(file);
        zipReader = new ZipReader(blobReader);
        const entries = await zipReader.getEntries();

        // 2. Find the main document XML file
        const documentEntry = entries.find(entry => entry.filename === "word/document.xml");
        if (!documentEntry || !documentEntry.getData) {
            throw new Error("'word/document.xml' not found within the DOCX file.");
        }

        // 3. Extract the XML content as text
        const xmlContent = await documentEntry.getData(new TextWriter());

        // 4. Close the zip reader
        await zipReader.close();

        // 5. Parse the XML content
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlContent, "text/xml"); // Use "text/xml" for DOCX

        if (!doc) {
            throw new Error("Failed to parse 'word/document.xml'.");
        }

        // 6. Extract text from relevant XML tags (<w:t> elements)
        // These tags contain the actual text runs within paragraphs (<w:p>).
        const textNodes = doc.querySelectorAll("w\\:t, t"); // Query for <w:t> or <t> (namespace handling)
        let extractedText = "";
        textNodes.forEach(node => {
            // Check if it's an Element before accessing textContent
            if (node instanceof Element) {
                extractedText += node.textContent;
            }
        });

        // Often, paragraphs are separated by <w:p> tags. We can approximate paragraph breaks.
        // A more sophisticated approach might look at <w:p> structure.
        // For simplicity, we'll join text runs. Consider adding newlines based on <w:p> if needed.
        // Example: Replace </w:p> with \n before querying <w:t>? Could be complex.

        console.log(`Successfully parsed DOCX: ${file.name}`);
        return extractedText.trim(); // Trim whitespace from start/end

    } catch (error) {
        console.error(`Error parsing DOCX file ${file.name}:`, error);
        // Ensure zipReader is closed even if an error occurs after it's opened
        if (zipReader) { // Check if zipReader was initialized
            try {
                // Attempt to close, regardless of its previous state (idempotent or throws if already closed/invalid)
                await zipReader.close();
            } catch (closeError) {
                // Log if closing fails, but don't overwrite the original error
                console.warn("Warning: Error closing zip reader during error handling:", closeError);
            }
        }
        throw new Error(`Failed to parse DOCX '${file.name}': ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Parses text content from various file types.
 * @param file The file object to parse.
 * @returns Promise<string> The extracted text content.
 * @throws Error if the file type is unsupported or parsing fails.
 */
export async function parseFileContent(file: File): Promise<string> {
    console.log(`Parsing file: ${file.name}, Type: ${file.type}`);
    switch (file.type) {
        case "application/pdf":
            return await parsePdf(file);
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return await parseDocx(file);
        // case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        //     // Add XLSX parsing logic here if needed
        //     throw new Error(`Unsupported file type: ${file.type} (XLSX parsing not implemented)`);
        default:
            console.error(`Unsupported file type for ${file.name}: ${file.type}`);
            throw new Error(`Unsupported file type: ${file.type}`);
    }
}
