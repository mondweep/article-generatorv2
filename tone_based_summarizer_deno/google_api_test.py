import os
import pickle
from dotenv import load_dotenv
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# --- Configuration ---
# Load credentials from .env file in the same directory
load_dotenv()
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
if not CLIENT_ID or not CLIENT_SECRET:
    print("Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not found in .env file.")
    exit(1)

# Scopes required for the test
SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly'
]
# File IDs to test
CV_DOC_ID = os.getenv("GOOGLE_CV_DOC_ID", "18vZGwraPOPBtCv__IfoQVwZtrlAkvaUH") # Default if not in .env
PDF_ID = os.getenv("GOOGLE_PDF_IDS", "1OLUQhpuwAziyJ9uAewNfE9qyHJAfje1_").split(',')[0] # Test first PDF ID
SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "1Kxa4qsWvFGt6u5HraTScPXFqAIv5wULfWd5GLyGPQNY") # Default if not in .env
SHEET_RANGE = "Articles!A1:A1" # Test reading just one cell

TOKEN_PICKLE_FILE = 'token_test.pickle' # Store credentials for reuse

# --- Authentication Function ---
def get_credentials():
    """Gets valid user credentials from storage or runs the OAuth flow."""
    creds = None
    # The file token_test.pickle stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first time.
    if os.path.exists(TOKEN_PICKLE_FILE):
        with open(TOKEN_PICKLE_FILE, 'rb') as token:
            creds = pickle.load(token)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Credentials expired, refreshing...")
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"Error refreshing token: {e}")
                print("Need to re-authenticate.")
                creds = None # Force re-authentication
        else:
            print("No valid credentials found, running authentication flow...")
            # Structure client_config as 'web' type to force specific redirect_uri
            client_config = {
                "web": { # Use 'web' key instead of 'installed'
                    "client_id": CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": ["http://localhost:8000/oauth/callback"], # Must match Google Console
                    # Add auth_provider_x509_cert_url and project_id if needed by library,
                    # but often optional for this flow. Get from credentials JSON if required.
                    # "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    # "project_id": "YOUR_PROJECT_ID" # Get from Google Cloud Console
                }
            }
            # Create flow from the 'web' config
            flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
            # The redirect_uri should now be correctly inferred from client_config['web']['redirect_uris'][0]
            # but setting it explicitly might still be needed depending on library version.
            # flow.redirect_uri = "http://localhost:8000/oauth/callback" # Keep explicit set for safety

            # Run local server on the specific port 8000 matching the redirect URI
            print("Starting local server on port 8000 for authentication callback...")
            creds = flow.run_local_server(port=8000)
        # Save the credentials for the next run
        with open(TOKEN_PICKLE_FILE, 'wb') as token:
            pickle.dump(creds, token)
            print(f"Credentials saved to {TOKEN_PICKLE_FILE}")
    return creds

# --- Main Test Logic ---
def main():
    print("Attempting to authenticate...")
    try:
        creds = get_credentials()
        print("Authentication successful.")
    except Exception as e:
        print(f"Authentication failed: {e}")
        return

    # Build API services
    try:
        drive_service = build('drive', 'v3', credentials=creds)
        sheets_service = build('sheets', 'v4', credentials=creds)
        print("API services built successfully.")
    except Exception as e:
        print(f"Failed to build API services: {e}")
        return

    # Test 1: Get CV Doc Metadata (using Drive API)
    print(f"\n--- Testing Drive API: Get Metadata for CV Doc (ID: {CV_DOC_ID}) ---")
    try:
        file_metadata = drive_service.files().get(fileId=CV_DOC_ID, fields='id, name, mimeType').execute()
        print(f"SUCCESS: Found file: Name='{file_metadata.get('name')}', Type='{file_metadata.get('mimeType')}'")
    except HttpError as error:
        print(f"FAILED: Drive API error: {error}")
    except Exception as e:
        print(f"FAILED: Unexpected error: {e}")

    # Test 2: Get PDF Metadata (using Drive API)
    print(f"\n--- Testing Drive API: Get Metadata for PDF (ID: {PDF_ID}) ---")
    try:
        file_metadata = drive_service.files().get(fileId=PDF_ID, fields='id, name, mimeType').execute()
        print(f"SUCCESS: Found file: Name='{file_metadata.get('name')}', Type='{file_metadata.get('mimeType')}'")
    except HttpError as error:
        print(f"FAILED: Drive API error: {error}")
    except Exception as e:
        print(f"FAILED: Unexpected error: {e}")

    # Test 3: Get Sheet Data (using Sheets API)
    print(f"\n--- Testing Sheets API: Get Data from Sheet (ID: {SHEET_ID}, Range: {SHEET_RANGE}) ---")
    try:
        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=SHEET_ID, range=SHEET_RANGE).execute()
        values = result.get('values', [])
        if not values:
            print('SUCCESS: API call successful, but no data found in range.')
        else:
            print(f'SUCCESS: API call successful. First cell value: {values[0][0]}')
    except HttpError as error:
        print(f"FAILED: Sheets API error: {error}")
    except Exception as e:
        print(f"FAILED: Unexpected error: {e}")

if __name__ == '__main__':
    main()
