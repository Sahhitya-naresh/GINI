import { Lead, LeadStatus, AppSettings, ConnectedSender, LeadManualTask } from '../types';
import { getTodayDateString } from '../utils/dateUtils';

/**
 * Standard 23 columns used in Google Sheets for Outreach Flow leads
 */
export const SHEET_COLUMNS = [
  'Lead ID',
  'Name',
  'Email',
  'Company',
  'Pain Point(s)',
  'Current Stage',
  'Status',
  'Last Email Sent Date',
  'Next Send Date',
  'Thread ID',
  'Notes',
  'First Name',
  'Last Name',
  'Job Title',
  'LinkedIn URL',
  'Industry',
  'Campaign',
  'Opens Count',
  'First Opened Date',
  'Last Opened Date',
  'Clicks Count',
  'First Clicked Date',
  'Last Clicked Date',
  'Current Node ID',
  'Campaign ID',
  'Node Entered Date',
  'Sender Used'
];

/**
 * Serializes a Lead object into a row array matching the 27 standard sheet columns
 */
export function leadToRowArray(lead: Lead | Partial<Lead>): any[] {
  const firstName = lead.firstName || '';
  const lastName = lead.lastName || '';
  const fullName = lead.name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || 'Prospect');

  return [
    lead.leadId || '',
    fullName,
    lead.email || '',
    lead.company || '',
    lead.painPoint || '',
    lead.currentStage !== undefined ? lead.currentStage : 0,
    lead.status || 'Active',
    lead.lastEmailSentDate || '',
    lead.nextSendDate || '',
    lead.threadId || '',
    lead.notes || '',
    firstName,
    lastName,
    lead.jobTitle || '',
    lead.linkedinUrl || '',
    lead.industry || '',
    lead.campaign || 'Default',
    lead.opensCount || 0,
    lead.firstOpenedDate || '',
    lead.lastOpenedDate || '',
    lead.clicksCount || 0,
    lead.firstClickedDate || '',
    lead.lastClickedDate || '',
    lead.currentNodeId || '',
    lead.campaignId || '',
    lead.nodeEnteredDate || '',
    lead.senderUsed || ''
  ];
}

/**
 * Parses raw 2D array from Google Sheets API into typed Lead objects
 */
export function parseSheetRowsToLeads(values: any[][]): Lead[] {
  if (!values || values.length <= 1) return [];

  const leads: Lead[] = [];
  const validStatuses: LeadStatus[] = ['Active', 'Replied', 'Paused', 'Completed', 'Broke Up'];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length === 0 || !row[0]) continue;

    const leadId = String(row[0] || '').trim();
    if (!leadId) continue;

    const name = String(row[1] || '').trim();
    const email = String(row[2] || '').trim();
    const company = String(row[3] || '').trim();
    const painPoint = String(row[4] || '').trim();
    const currentStage = parseInt(String(row[5] || '0'), 10) || 0;

    const rawStatus = String(row[6] || 'Active').trim();
    const matchedStatus = validStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Active';

    const lastEmailSentDate = String(row[7] || '').trim();
    const nextSendDate = String(row[8] || '').trim();
    const threadId = String(row[9] || '').trim();
    const notes = String(row[10] || '').trim();

    const firstName = String(row[11] || (name.split(' ')[0] || '')).trim();
    const lastName = String(row[12] || (name.split(' ').slice(1).join(' ') || '')).trim();
    const jobTitle = String(row[13] || '').trim();
    const linkedinUrl = String(row[14] || '').trim();
    const industry = String(row[15] || '').trim();
    const campaign = String(row[16] || 'Default').trim();

    const opensCount = parseInt(String(row[17] || '0'), 10) || 0;
    const firstOpenedDate = String(row[18] || '').trim();
    const lastOpenedDate = String(row[19] || '').trim();
    const clicksCount = parseInt(String(row[20] || '0'), 10) || 0;
    const firstClickedDate = String(row[21] || '').trim();
    const lastClickedDate = String(row[22] || '').trim();
    const currentNodeId = String(row[23] || '').trim();
    const campaignId = String(row[24] || '').trim();
    const nodeEnteredDate = String(row[25] || '').trim();
    const senderUsed = String(row[26] || '').trim();

    leads.push({
      leadId,
      name: name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || 'Prospect'),
      email,
      company,
      painPoint,
      currentStage,
      status: matchedStatus,
      lastEmailSentDate,
      nextSendDate,
      threadId,
      notes,
      firstName,
      lastName,
      jobTitle,
      linkedinUrl,
      industry,
      campaign,
      opensCount,
      firstOpenedDate,
      lastOpenedDate,
      clicksCount,
      firstClickedDate,
      lastClickedDate,
      currentNodeId,
      campaignId,
      nodeEnteredDate,
      senderUsed,
      rowIndex: i + 1 // 1-based index in the Google Sheet
    });
  }

  return leads;
}

/**
 * Retrieves the numeric sheetId (gid) for the 'Leads' tab from Google Sheets metadata
 */
async function getLeadsSheetId(token: string, spreadsheetId: string): Promise<number> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const sheets = data.sheets || [];
      const leadsSheet = sheets.find((s: any) => s.properties?.title?.toLowerCase() === 'leads') || sheets[0];
      if (leadsSheet && typeof leadsSheet.properties?.sheetId === 'number') {
        return leadsSheet.properties.sheetId;
      }
    }
  } catch (e) {
    console.warn('Could not determine sheetId, defaulting to 0:', e);
  }
  return 0;
}

// ---------------------------------------------------------------------------
// CORE CRUD OPERATIONS (PERSISTING DIRECTLY TO GOOGLE SHEETS VIA SHEETS API)
// ---------------------------------------------------------------------------

/**
 * List all leads: Reads directly from the connected Google Sheet via Sheets API
 * if credentials are provided, or falls back to server-side backend persistence.
 */
export async function listLeads(token?: string, spreadsheetId?: string): Promise<Lead[]> {
  if (token && spreadsheetId) {
    try {
      // Direct call to Google Sheets API
      let res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:W1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        // Fallback to first sheet range if sheet tab name differs
        res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:W1000`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (res.ok) {
        const data = await res.json();
        const leads = parseSheetRowsToLeads(data.values || []);

        // Sync leads to backend server for resilience & background job execution
        fetch('/api/leads/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-spreadsheet-id': spreadsheetId
          },
          body: JSON.stringify({ leads, spreadsheetId })
        }).catch(() => {});

        return leads;
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn('Direct Google Sheet read failed:', err.error?.message || res.statusText);
      }
    } catch (err) {
      console.warn('Error reading directly from Google Sheet API:', err);
    }
  }

  // Fallback to backend API / local database
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (spreadsheetId) headers['x-spreadsheet-id'] = spreadsheetId;

    const res = await fetch('/api/leads/list', {
      method: 'POST',
      headers,
      body: JSON.stringify({ spreadsheetId })
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.leads)) {
        return data.leads;
      }
    }
  } catch (err) {
    console.warn('Backend fetch leads fallback notice:', err);
  }

  return [];
}

/**
 * Formats a clear, descriptive human-readable error from Google Sheets API response
 */
export function formatSheetsApiError(status: number, errJson?: any, fallbackContext?: string): string {
  const apiMsg = errJson?.error?.message || errJson?.message || '';
  if (status === 401) {
    return 'Google Sheets authentication expired. Please sign in with Google again to renew access.';
  }
  if (status === 403) {
    return `Google Sheets permission denied or quota reached: ${apiMsg || 'Check your Google Sheet sharing permissions.'}`;
  }
  if (status === 429) {
    return 'Google Sheets API rate limit exceeded. Please wait a few seconds before trying again.';
  }
  if (status >= 500) {
    return `Google Sheets service temporary error (${status}): ${apiMsg || 'Google server is temporarily busy. Please retry.'}`;
  }
  return `Google Sheets API error (${status}): ${apiMsg || fallbackContext || 'Write operation failed'}`;
}

/**
 * Formats network-level errors (e.g. offline, timeout, fetch failure)
 */
export function formatNetworkError(err: any): string {
  if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
    return 'Network connection error: Unable to reach Google Sheets API. Check your internet connection and try again.';
  }
  return (err as any)?.message || 'Network communication error connecting to Google Sheets.';
}

/**
 * Create a new lead: Directly persists to the Google Sheet using Google Sheets API v4 append
 * and confirms reflection by re-fetching from the Sheets API before returning.
 */
export async function createLead(
  leadData: Partial<Lead>,
  token?: string,
  spreadsheetId?: string
): Promise<Lead> {
  const today = getTodayDateString();
  const firstName = (leadData.firstName || '').trim();
  const lastName = (leadData.lastName || '').trim();
  const name = (leadData.name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || 'Prospect')).trim();

  const completeLead: Lead = {
    leadId: leadData.leadId || `LEAD-${Date.now().toString().slice(-4)}`,
    name,
    firstName: firstName || name.split(' ')[0],
    lastName: lastName || (name.split(' ').slice(1).join(' ') || ''),
    email: (leadData.email || '').trim().toLowerCase(),
    company: (leadData.company || 'Company').trim(),
    painPoint: (leadData.painPoint || '').trim(),
    currentStage: leadData.currentStage !== undefined ? leadData.currentStage : 0,
    status: leadData.status || 'Active',
    lastEmailSentDate: leadData.lastEmailSentDate || '',
    nextSendDate: leadData.nextSendDate || today,
    threadId: leadData.threadId || '',
    notes: (leadData.notes || '').trim(),
    jobTitle: (leadData.jobTitle || '').trim(),
    linkedinUrl: (leadData.linkedinUrl || '').trim(),
    industry: (leadData.industry || '').trim(),
    campaign: (leadData.campaign || 'Default').trim(),
    opensCount: leadData.opensCount || 0,
    firstOpenedDate: leadData.firstOpenedDate || '',
    lastOpenedDate: leadData.lastOpenedDate || '',
    clicksCount: leadData.clicksCount || 0,
    firstClickedDate: leadData.firstClickedDate || '',
    lastClickedDate: leadData.lastClickedDate || '',
    rowIndex: leadData.rowIndex
  };

  // 1. If Google Sheet is connected, write DIRECTLY to Google Sheets API
  if (token && spreadsheetId) {
    const rowValues = leadToRowArray(completeLead);
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:AA:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    
    let res: Response;
    try {
      res = await fetch(appendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [rowValues]
        })
      });
    } catch (netErr: any) {
      throw new Error(formatNetworkError(netErr));
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(formatSheetsApiError(res.status, errJson, 'Failed to append lead to Google Sheet'));
    }

    // MANDATORY CONFIRMATION: Re-fetch directly from the Sheets API to verify reflection in the actual Sheet
    try {
      const confirmRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:AA1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!confirmRes.ok) {
        const errJson = await confirmRes.json().catch(() => ({}));
        throw new Error(formatSheetsApiError(confirmRes.status, errJson, 'Failed to verify lead in Google Sheet'));
      }
      const confirmData = await confirmRes.json();
      const verifiedLeads = parseSheetRowsToLeads(confirmData.values || []);
      const matchedLead = verifiedLeads.find(l => l.leadId === completeLead.leadId || (l.email && l.email.toLowerCase() === completeLead.email.toLowerCase()));
      if (!matchedLead) {
        throw new Error(`Write verification failed: Lead "${completeLead.name}" (${completeLead.leadId}) was not found in the Google Sheet after write.`);
      }
      completeLead.rowIndex = matchedLead.rowIndex;
    } catch (verifyErr: any) {
      throw new Error(verifyErr.message || 'Verification of lead creation in Google Sheet failed.');
    }
  }

  // 2. Mirror write to backend database for redundancy & background execution
  // Pass alreadySyncedToSheet: true if the client already wrote to Google Sheets to prevent duplicate rows
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (spreadsheetId) headers['x-spreadsheet-id'] = spreadsheetId;

    const backendRes = await fetch('/api/leads/create', {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        lead: completeLead, 
        spreadsheetId,
        alreadySyncedToSheet: Boolean(token && spreadsheetId)
      })
    });

    if (backendRes.ok) {
      const bData = await backendRes.json();
      if (bData.lead && !completeLead.rowIndex) {
        completeLead.rowIndex = bData.lead.rowIndex;
      }
    }
  } catch (err) {
    console.warn('Backend create mirror warning:', err);
  }

  return completeLead;
}

/**
 * Update an existing lead: Directly persists to Google Sheet via Sheets API PUT
 * and confirms reflection by re-fetching from the Sheets API before completing.
 */
export async function updateLead(
  lead: Lead,
  token?: string,
  spreadsheetId?: string
): Promise<Lead> {
  // 1. If Google Sheet is connected, update row directly in Google Sheets
  if (token && spreadsheetId) {
    let targetRow = lead.rowIndex;

    // If rowIndex is unknown, locate row by Lead ID in column A
    if (!targetRow || targetRow < 2) {
      try {
        const idColRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:A1000`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!idColRes.ok) {
          const errJson = await idColRes.json().catch(() => ({}));
          throw new Error(formatSheetsApiError(idColRes.status, errJson, 'Failed to locate lead row in Google Sheet'));
        }
        const idData = await idColRes.json();
        const rows = idData.values || [];
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i][0] === lead.leadId) {
            targetRow = i + 1;
            lead.rowIndex = targetRow;
            break;
          }
        }
      } catch (err: any) {
        throw new Error(formatNetworkError(err));
      }
    }

    if (!targetRow || targetRow < 2) {
      throw new Error(`Cannot update lead in Google Sheet: Lead ID "${lead.leadId}" not found in sheet.`);
    }

    const rowValues = leadToRowArray(lead);
    const range = `Leads!A${targetRow}:W${targetRow}`;
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

    let res: Response;
    try {
      res = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range,
          values: [rowValues]
        })
      });
    } catch (netErr: any) {
      throw new Error(formatNetworkError(netErr));
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(formatSheetsApiError(res.status, errJson, `Failed to update row ${targetRow} in Google Sheet`));
    }

    // MANDATORY CONFIRMATION: Re-fetch directly from the Sheets API to verify reflection in the actual Sheet
    try {
      const confirmRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!confirmRes.ok) {
        const errJson = await confirmRes.json().catch(() => ({}));
        throw new Error(formatSheetsApiError(confirmRes.status, errJson, 'Failed to re-fetch from Google Sheet to verify update'));
      }
      const confirmData = await confirmRes.json();
      const confirmedRow = confirmData.values && confirmData.values[0] ? confirmData.values[0] : null;
      if (!confirmedRow || confirmedRow[0] !== lead.leadId) {
        throw new Error(`Update verification failed: Google Sheet row ${targetRow} did not match lead ID "${lead.leadId}".`);
      }
    } catch (verifyErr: any) {
      throw new Error(verifyErr.message || 'Verification of lead update in Google Sheet failed.');
    }
  }

  // 2. Synchronize with backend database
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (spreadsheetId) headers['x-spreadsheet-id'] = spreadsheetId;

    await fetch('/api/leads/update', {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        lead, 
        spreadsheetId,
        alreadySyncedToSheet: Boolean(token && spreadsheetId)
      })
    });
  } catch (err) {
    console.warn('Backend update mirror warning:', err);
  }

  return lead;
}

/**
 * Delete a lead: Persists deletion directly to Google Sheet via Sheets API
 * and confirms removal by re-fetching from the Sheets API before completing.
 */
export async function deleteLead(
  leadId: string,
  token?: string,
  spreadsheetId?: string,
  rowIndex?: number
): Promise<boolean> {
  // 1. If Google Sheet is connected, delete or clear row directly in Google Sheets
  if (token && spreadsheetId) {
    let targetRow = rowIndex;

    // Locate row if rowIndex is not supplied
    if (!targetRow || targetRow < 2) {
      try {
        const idColRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:A1000`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!idColRes.ok) {
          const errJson = await idColRes.json().catch(() => ({}));
          throw new Error(formatSheetsApiError(idColRes.status, errJson, 'Failed to query leads for deletion in Google Sheet'));
        }
        const idData = await idColRes.json();
        const rows = idData.values || [];
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i][0] === leadId) {
            targetRow = i + 1;
            break;
          }
        }
      } catch (err: any) {
        throw new Error(formatNetworkError(err));
      }
    }

    if (targetRow && targetRow >= 2) {
      const sheetNumericId = await getLeadsSheetId(token, spreadsheetId);
      
      let delSuccess = false;
      try {
        // Execute batchUpdate deleteDimension to cleanly remove the row
        const delRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: sheetNumericId,
                    dimension: 'ROWS',
                    startIndex: targetRow - 1,
                    endIndex: targetRow
                  }
                }
              }
            ]
          })
        });
        delSuccess = delRes.ok;
      } catch (e) {
        // Fallback to clearing row values
      }

      if (!delSuccess) {
        const clearRange = `Leads!A${targetRow}:W${targetRow}`;
        let clearRes: Response;
        try {
          clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (netErr: any) {
          throw new Error(formatNetworkError(netErr));
        }

        if (!clearRes.ok) {
          const errJson = await clearRes.json().catch(() => ({}));
          throw new Error(formatSheetsApiError(clearRes.status, errJson, `Failed to delete row ${targetRow} from Google Sheet`));
        }
      }

      // MANDATORY CONFIRMATION: Re-fetch directly from the Sheets API to verify lead is absent
      try {
        const confirmRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:A1000`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!confirmRes.ok) {
          const errJson = await confirmRes.json().catch(() => ({}));
          throw new Error(formatSheetsApiError(confirmRes.status, errJson, 'Failed to re-fetch from Google Sheet to confirm deletion'));
        }
        const confirmData = await confirmRes.json();
        const rows = confirmData.values || [];
        const stillPresent = rows.some((r: any[], idx: number) => idx > 0 && r && r[0] === leadId);
        if (stillPresent) {
          throw new Error(`Deletion verification failed: Lead ID "${leadId}" is still present in Google Sheet after deletion.`);
        }
      } catch (verifyErr: any) {
        throw new Error(verifyErr.message || 'Verification of lead deletion in Google Sheet failed.');
      }
    }
  }

  // 2. Synchronize deletion with backend database
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (spreadsheetId) headers['x-spreadsheet-id'] = spreadsheetId;

    const res = await fetch('/api/leads/delete', {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        leadId, 
        spreadsheetId,
        alreadySyncedToSheet: Boolean(token && spreadsheetId)
      })
    });

    return res.ok;
  } catch (err) {
    console.warn('Backend delete lead error:', err);
    return true;
  }
}

/**
 * Batch create leads: Appends multiple leads directly to Google Sheets via Sheets API
 * and confirms reflection in the sheet before syncing to backend.
 */
export async function batchCreateLeads(
  newLeads: Partial<Lead>[],
  token?: string,
  spreadsheetId?: string
): Promise<Lead[]> {
  if (newLeads.length === 0) return [];

  const today = getTodayDateString();
  const preparedLeads: Lead[] = newLeads.map((item, idx) => {
    const firstName = (item.firstName || '').trim();
    const lastName = (item.lastName || '').trim();
    const name = (item.name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || 'Prospect')).trim();

    return {
      leadId: item.leadId || `LEAD-${Date.now().toString().slice(-4)}-${idx + 1}`,
      name,
      firstName: firstName || name.split(' ')[0],
      lastName: lastName || (name.split(' ').slice(1).join(' ') || ''),
      email: (item.email || '').trim().toLowerCase(),
      company: (item.company || 'Company').trim(),
      painPoint: (item.painPoint || '').trim(),
      currentStage: item.currentStage !== undefined ? item.currentStage : 0,
      status: item.status || 'Active',
      lastEmailSentDate: item.lastEmailSentDate || '',
      nextSendDate: item.nextSendDate || today,
      threadId: item.threadId || '',
      notes: (item.notes || '').trim(),
      jobTitle: (item.jobTitle || '').trim(),
      linkedinUrl: (item.linkedinUrl || '').trim(),
      industry: (item.industry || '').trim(),
      campaign: (item.campaign || 'Default').trim(),
      opensCount: item.opensCount || 0,
      firstOpenedDate: item.firstOpenedDate || '',
      lastOpenedDate: item.lastOpenedDate || '',
      clicksCount: item.clicksCount || 0,
      firstClickedDate: item.firstClickedDate || '',
      lastClickedDate: item.lastClickedDate || '',
      rowIndex: item.rowIndex
    };
  });

  // 1. Direct append to Google Sheet
  if (token && spreadsheetId) {
    const rows = preparedLeads.map(leadToRowArray);
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:AA:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    let res: Response;
    try {
      res = await fetch(appendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: rows })
      });
    } catch (netErr: any) {
      throw new Error(formatNetworkError(netErr));
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(formatSheetsApiError(res.status, errJson, 'Failed to batch append leads to Google Sheet'));
    }

    // Re-fetch from Google Sheets API to confirm reflection
    try {
      const confirmRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:AA1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (confirmRes.ok) {
        const confirmData = await confirmRes.json();
        const sheetLeads = parseSheetRowsToLeads(confirmData.values || []);
        for (const prep of preparedLeads) {
          const match = sheetLeads.find(sl => sl.leadId === prep.leadId || (sl.email && sl.email.toLowerCase() === prep.email.toLowerCase()));
          if (match && match.rowIndex) {
            prep.rowIndex = match.rowIndex;
          }
        }
      }
    } catch (verifyErr: any) {
      console.warn('Batch confirmation check warning:', verifyErr);
    }
  }

  // 2. Synchronize batch with backend database
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (spreadsheetId) headers['x-spreadsheet-id'] = spreadsheetId;

    const bRes = await fetch('/api/leads/batch', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        leads: preparedLeads,
        spreadsheetId,
        alreadySyncedToSheet: Boolean(token && spreadsheetId)
      })
    });

    if (bRes.ok) {
      const bData = await bRes.json();
      if (Array.isArray(bData.leads)) {
        return bData.leads;
      }
    }
  } catch (err) {
    console.warn('Backend batch mirror warning:', err);
  }

  return preparedLeads;
}

/**
 * Fetches leads stored only in local storage (data_store/leads.json) via backend API
 */
export async function getLocalLeads(): Promise<Lead[]> {
  const res = await fetch('/api/leads/local');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch local leads: ${err.error || res.statusText}`);
  }
  const data = await res.json();
  return Array.isArray(data.leads) ? data.leads : [];
}

/**
 * Migrate local leads from data_store/leads.json to the connected Google Sheet.
 * - Does NOT duplicate any leads already present in the sheet.
 * - Confirms write by re-fetching from the Google Sheets API.
 * - Returns the count of migrated leads and the updated full leads list.
 */
export async function migrateLocalLeadsToSheet(
  token: string,
  spreadsheetId: string
): Promise<{ migratedCount: number; totalLocal: number; leads: Lead[] }> {
  // 1. Retrieve leads currently in local data_store/leads.json
  const localLeads = await getLocalLeads();
  if (localLeads.length === 0) {
    const currentSheetLeads = await listLeads(token, spreadsheetId);
    return { migratedCount: 0, totalLocal: 0, leads: currentSheetLeads };
  }

  // 2. Fetch existing leads from the Google Sheet to avoid duplicates
  let existingSheetLeads: Lead[] = [];
  try {
    const sheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:W1000`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (sheetRes.ok) {
      const sheetData = await sheetRes.json();
      existingSheetLeads = parseSheetRowsToLeads(sheetData.values || []);
    } else {
      const errJson = await sheetRes.json().catch(() => ({}));
      throw new Error(formatSheetsApiError(sheetRes.status, errJson, 'Failed to inspect existing sheet leads before migration'));
    }
  } catch (netErr: any) {
    throw new Error(formatNetworkError(netErr));
  }

  const existingEmails = new Set(
    existingSheetLeads
      .map(l => (l.email || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const existingIds = new Set(
    existingSheetLeads
      .map(l => (l.leadId || '').trim())
      .filter(Boolean)
  );

  // Filter for leads that are only in local storage
  const leadsToMigrate = localLeads.filter(l => {
    const hasEmailMatch = l.email && existingEmails.has(l.email.trim().toLowerCase());
    const hasIdMatch = l.leadId && existingIds.has(l.leadId.trim());
    return !hasEmailMatch && !hasIdMatch;
  });

  if (leadsToMigrate.length === 0) {
    return {
      migratedCount: 0,
      totalLocal: localLeads.length,
      leads: existingSheetLeads
    };
  }

  // 3. Append missing leads to Google Sheet
  const rowsToAppend = leadsToMigrate.map(leadToRowArray);
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:W:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  
  let appendRes: Response;
  try {
    appendRes = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: rowsToAppend })
    });
  } catch (netErr: any) {
    throw new Error(formatNetworkError(netErr));
  }

  if (!appendRes.ok) {
    const errJson = await appendRes.json().catch(() => ({}));
    throw new Error(formatSheetsApiError(appendRes.status, errJson, 'Failed to write migrated leads to Google Sheet'));
  }

  // 4. CONFIRM by re-fetching from Google Sheets API
  let confirmedLeads: Lead[] = [];
  try {
    const confirmRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:W1000`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!confirmRes.ok) {
      const errJson = await confirmRes.json().catch(() => ({}));
      throw new Error(formatSheetsApiError(confirmRes.status, errJson, 'Failed to confirm migrated leads from Google Sheet'));
    }
    const confirmData = await confirmRes.json();
    confirmedLeads = parseSheetRowsToLeads(confirmData.values || []);
  } catch (verifyErr: any) {
    throw new Error(verifyErr.message || 'Verification of migrated leads in Google Sheet failed.');
  }

  return {
    migratedCount: leadsToMigrate.length,
    totalLocal: localLeads.length,
    leads: confirmedLeads
  };
}

// ---------------------------------------------------------------------------
// BACKWARD-COMPATIBLE ALIASES & SYSTEM UTILITIES
// ---------------------------------------------------------------------------

export const fetchLeadsFromBackend = listLeads;
export const createLeadOnBackend = createLead;
export const updateLeadOnBackend = updateLead;
export const deleteLeadOnBackend = deleteLead;
export const batchCreateLeadsOnBackend = batchCreateLeads;

export async function fetchSystemStats(): Promise<any> {
  try {
    const res = await fetch('/api/system/stats');
    if (res.ok) {
      const data = await res.json();
      return data.stats;
    }
  } catch (err) {
    console.warn('Backend fetch system stats error:', err);
  }
  return null;
}

export async function syncSettingsWithBackend(settings?: AppSettings): Promise<AppSettings | null> {
  try {
    if (settings) {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      if (res.ok) {
        const data = await res.json();
        return data.settings;
      }
    } else {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        return data.settings;
      }
    }
  } catch (err) {
    console.warn('Backend settings sync notice:', err);
  }
  return null;
}

export async function fetchSendersFromBackend(): Promise<ConnectedSender[]> {
  try {
    const res = await fetch('/api/senders');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.senders)) {
        return data.senders;
      }
    }
  } catch (err) {
    console.warn('Backend fetch senders error:', err);
  }
  return [];
}

export async function saveSendersToBackend(senders: ConnectedSender[]): Promise<ConnectedSender[]> {
  try {
    const res = await fetch('/api/senders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senders })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.senders)) {
        return data.senders;
      }
    }
  } catch (err) {
    console.warn('Backend save senders error:', err);
  }
  return senders;
}
