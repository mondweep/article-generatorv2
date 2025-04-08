import { config } from "./config.ts";
import { getValidAccessToken } from "./auth.ts";

/**
 * Fetches the text content of a native Google Document using the Google Docs API.
 * @param documentId The ID of the Google Document.
 * @returns A promise that resolves to the plain text content of the document.
 */
export async function fetchNativeGoogleDocText(
  documentId: string,
): Promise<string> {
  const accessToken = await getValidAccessToken();
  // Use Docs API v1 endpoint
  const apiUrl = `${config.googleDocsApiBaseUrl}/v1/documents/${documentId}`;

  console.log(`Fetching native Google Doc content for ID: ${documentId}`);

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to fetch native Google Doc: ${response.status} ${response.statusText} - ${errorBody}`,
      );
    }

    const docData = await response.json();

    // Extract text from the document structure
    let extractedText = "";
    if (docData.body && docData.body.content) {
      for (const element of docData.body.content) {
        if (element.paragraph) {
          for (const paragraphElement of element.paragraph.elements) {
            if (paragraphElement.textRun && paragraphElement.textRun.content) {
              extractedText += paragraphElement.textRun.content;
            }
          }
          if (element !== docData.body.content[docData.body.content.length - 1]) {
            extractedText += "\n";
          }
        }
      }
    }

    console.log(
      `Successfully fetched native Google Doc content for ID: ${documentId}. Length: ${extractedText.length}`,
    );
    return extractedText;
  } catch (error) {
    console.error(
      `Error fetching native Google Doc content for ID ${documentId}:`,
      error,
    );
    throw error; // Re-throw the error after logging
  }
}

/**
 * Creates a new Google Document in the specified Drive folder with the given content.
 * @param title The desired title for the new Google Document.
 * @param content The plain text content to upload to the document.
 * @param outputFolderId The ID of the Google Drive folder to save the document in.
 * @param userEmail The email address to grant writer permission.
 * @returns A promise that resolves with the created document's ID.
 */
export async function createGoogleDoc(
  title: string,
  content: string,
  outputFolderId: string,
  userEmail: string,
): Promise<{ id: string }> {
  const accessToken = await getValidAccessToken();

  // Google Drive API v3 endpoint for multipart upload
  const apiUrl = `${config.googleApiBaseUrl}/upload/drive/v3/files?uploadType=multipart`;

  console.log(`Creating Google Doc titled: "${title}" in folder: ${outputFolderId}`);

  const boundary = `-------${Date.now()}-------`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadata = {
    name: title,
    mimeType: "application/vnd.google-apps.document",
    parents: [outputFolderId],
  };
  const metadataPart =
    `Content-Type: application/json; charset=UTF-8\r\n\r\n${
      JSON.stringify(metadata)
    }`;
  const mediaPart = `Content-Type: text/plain\r\n\r\n${content}`;
  const requestBody = `${delimiter}${metadataPart}${delimiter}${mediaPart}${closeDelim}`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to create Google Doc: ${response.status} ${response.statusText} - ${errorBody}`,
      );
    }

    const createdFile = await response.json();
    console.log(
      `Successfully created Google Doc: "${title}" (ID: ${createdFile.id})`,
    );

    // Grant write permission to the user
    console.log(`Granting writer permission to ${userEmail} for Doc ID: ${createdFile.id}`);
    const permissionsUrl = `${config.googleApiBaseUrl}/drive/v3/files/${createdFile.id}/permissions?sendNotificationEmail=false`;
    const permissionBody = {
        role: "writer",
        type: "user",
        emailAddress: userEmail,
    };

    const permResponse = await fetch(permissionsUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(permissionBody),
    });

    if (!permResponse.ok) {
        // Log error but don't fail the whole process if permission fails
        const permErrorBody = await permResponse.text();
        console.error(
            `Failed to grant permission to ${userEmail} for Doc ID ${createdFile.id}: ${permResponse.status} ${permResponse.statusText} - ${permErrorBody}`
        );
    } else {
        console.log(`Successfully granted writer permission to ${userEmail}.`);
    }

    // Return the document ID
    return { id: createdFile.id };
  } catch (error) {
    console.error(`Error creating Google Doc titled: "${title}":`, error);
    throw error; // Re-throw the error after logging
  }
}
