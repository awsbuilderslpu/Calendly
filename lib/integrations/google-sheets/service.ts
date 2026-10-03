import { google } from "googleapis";

export async function getSheetsClient(scopes = ["https://www.googleapis.com/auth/spreadsheets"]) {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !privateKey) {
    throw new Error("Google service account credentials not configured in environment variables.");
  }
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    privateKey,
    scopes
  );
  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID };
}

export async function getCandidateStatuses() {
  try {
    const { sheets, spreadsheetId } = await getSheetsClient();
    if (!spreadsheetId) return new Map<string, string>();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Applications!A:C",
    });

    const rows = response.data.values || [];
    const statusMap = new Map<string, string>();
    for (const row of rows) {
      if (row[0] && row[2]) {
        statusMap.set(row[0], row[2]);
      }
    }
    return statusMap;
  } catch (err) {
    console.error("Failed to fetch candidate statuses:", err);
    return new Map<string, string>();
  }
}

export async function updateCandidateStatus(applicationId: string, newStatus: string) {
  const { sheets, spreadsheetId } = await getSheetsClient();
  if (!spreadsheetId) throw new Error("Spreadsheet ID not configured.");

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Applications!A:C",
  });

  const rows = response.data.values || [];
  let rowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === applicationId) {
      rowIndex = i + 1; // 1-indexed for Sheets
      break;
    }
  }

  if (rowIndex === -1) throw new Error("Candidate not found in Google Sheets");

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Applications!C${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[newStatus]]
    }
  });

  return { success: true };
}
