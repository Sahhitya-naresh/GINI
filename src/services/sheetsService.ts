import { Lead, LeadStatus } from '../types';
import { addBusinessDays, getTodayDateString } from '../utils/dateUtils';

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
  'Last Clicked Date'
];

export const ACTIVE_SHEET_STORAGE_KEY = 'outreach_flow_active_spreadsheet_id';
export const ACTIVE_SHEET_NAME_KEY = 'outreach_flow_active_spreadsheet_name';

export function getStoredSpreadsheetId(): string | null {
  return localStorage.getItem(ACTIVE_SHEET_STORAGE_KEY);
}

export function setStoredSpreadsheetId(id: string, name?: string): void {
  localStorage.setItem(ACTIVE_SHEET_STORAGE_KEY, id);
  if (name) {
    localStorage.setItem(ACTIVE_SHEET_NAME_KEY, name);
  }
}

export function getStoredSpreadsheetName(): string {
  return localStorage.getItem(ACTIVE_SHEET_NAME_KEY) || 'Outreach Flow - Leads Database';
}

export function clearStoredSpreadsheet(): void {
  localStorage.removeItem(ACTIVE_SHEET_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_SHEET_NAME_KEY);
}

/**
 * Creates a brand new Google Sheet in the user's Drive formatted for Outreach Flow
 */
export async function createLeadsSpreadsheet(token: string): Promise<{ id: string; name: string; url: string }> {
  const title = 'Outreach Flow - Leads Database';
  
  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: 'Leads',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Failed to create Google Sheet: ${createRes.statusText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate Headers and Initial Starter Leads
  const today = getTodayDateString();
  const seedRows = [
    SHEET_COLUMNS,
    [
      'LEAD-101',
      'Alex Morgan',
      'alex.morgan@techpulse-example.com',
      'TechPulse Innovations',
      'Slow manual lead qualification pipeline',
      '0',
      'Active',
      '',
      today,
      '',
      'Key decision maker, met at TechSummit',
      'Alex',
      'Morgan',
      'VP of Sales',
      'https://linkedin.com/in/alexmorgan',
      'SaaS / Technology',
      'Q3 Enterprise Outreach',
      '2',
      today,
      today,
      '1',
      today,
      today
    ],
    [
      'LEAD-102',
      'Jordan Lee',
      'jordan.lee@growthorbit-example.com',
      'GrowthOrbit',
      'Fragmented outreach messaging & poor response rates',
      '1',
      'Active',
      addBusinessDays(today, -3),
      today,
      '',
      'Sent Intro Stage 1 last week, ready for Stage 2 Value Prop',
      'Jordan',
      'Lee',
      'Head of Growth',
      'https://linkedin.com/in/jordanlee',
      'Marketing Tech',
      'Q3 Enterprise Outreach',
      '1',
      addBusinessDays(today, -2),
      addBusinessDays(today, -2),
      '0',
      '',
      ''
    ],
    [
      'LEAD-103',
      'Samira Patel',
      'samira@nexusflow-example.com',
      'NexusFlow Solutions',
      'High churn in prospect onboarding',
      '2',
      'Replied',
      addBusinessDays(today, -2),
      '',
      '',
      'Replied: "Sounds interesting, what is your pricing model?"',
      'Samira',
      'Patel',
      'Chief Operating Officer',
      'https://linkedin.com/in/samirapatel',
      'Enterprise Software',
      'Inbound Qualified',
      '4',
      addBusinessDays(today, -3),
      addBusinessDays(today, -2),
      '2',
      addBusinessDays(today, -2),
      addBusinessDays(today, -2)
    ],
    [
      'LEAD-104',
      'Marcus Vance',
      'marcus.vance@apexretail-example.com',
      'Apex Retail Group',
      'Outdated inventory sync and supplier latency',
      '3',
      'Paused',
      addBusinessDays(today, -5),
      addBusinessDays(today, 7),
      '',
      'Paused at client request while undergoing internal reorganization',
      'Marcus',
      'Vance',
      'Director of Operations',
      'https://linkedin.com/in/marcusvance',
      'Retail & Supply Chain',
      'Q3 Enterprise Outreach',
      '1',
      addBusinessDays(today, -4),
      addBusinessDays(today, -4),
      '0',
      '',
      ''
    ],
    [
      'LEAD-105',
      'Elena Rostova',
      'elena.rostova@cloudscale-example.com',
      'CloudScale Global',
      'Database migration bottlenecks and team burnout',
      '7',
      'Broke Up',
      addBusinessDays(today, -10),
      '',
      '',
      'Completed 7 stages with no reply; sequence closed out gracefully',
      'Elena',
      'Rostova',
      'VP of Infrastructure',
      'https://linkedin.com/in/elenarostova',
      'Cloud Infrastructure',
      'Cold Inbound Batch 2',
      '0',
      '',
      '',
      '0',
      '',
      ''
    ]
  ];

  const headerRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:W${seedRows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `Leads!A1:W${seedRows.length}`,
        values: seedRows
      })
    }
  );

  if (!headerRes.ok) {
    console.warn('Failed to seed headers, but sheet was created');
  }

  setStoredSpreadsheetId(spreadsheetId, title);
  return { id: spreadsheetId, name: title, url };
}

/**
 * Ensures existing sheet has all 23 headers in row 1 without destroying lead data
 */
export async function upgradeSheetHeadersIfNeeded(token: string, spreadsheetId: string): Promise<void> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:W1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    const row1 = data.values && data.values[0] ? data.values[0] : [];
    if (row1.length < SHEET_COLUMNS.length) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:W1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: 'Leads!A1:W1',
            values: [SHEET_COLUMNS]
          })
        }
      );
    }
  } catch (e) {
    console.warn('Could not check/upgrade sheet headers:', e);
  }
}

/**
 * Parses raw 2D array from Google Sheets into typed Lead objects
 */
export function parseSheetRowsToLeads(values: any[][]): Lead[] {
  if (!values || values.length <= 1) return [];

  const leads: Lead[] = [];
  // Row 0 is headers, data rows start at row index 1 (which corresponds to 1-based row number 2)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows

    const leadId = String(row[0] || '').trim();
    if (!leadId) continue;

    const name = String(row[1] || '').trim();
    const email = String(row[2] || '').trim();
    const company = String(row[3] || '').trim();
    const painPoint = String(row[4] || '').trim();
    const currentStage = parseInt(String(row[5] || '0'), 10) || 0;
    
    let rawStatus = String(row[6] || 'Active').trim();
    const validStatuses: LeadStatus[] = ['Active', 'Replied', 'Paused', 'Completed', 'Broke Up'];
    const matchedStatus = validStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Active';

    const lastEmailSentDate = String(row[7] || '').trim();
    const nextSendDate = String(row[8] || '').trim();
    const threadId = String(row[9] || '').trim();
    const notes = String(row[10] || '').trim();

    // Extended fields (indices 11-22)
    const firstName = String(row[11] || (name.split(' ')[0] || '')).trim();
    const lastName = String(row[12] || (name.split(' ').slice(1).join(' ') || '')).trim();
    const jobTitle = String(row[13] || '').trim();
    const linkedinUrl = String(row[14] || '').trim();
    const industry = String(row[15] || '').trim();
    const campaign = String(row[16] || 'Default').trim();

    // Tracking metrics
    const opensCount = parseInt(String(row[17] || '0'), 10) || 0;
    const firstOpenedDate = String(row[18] || '').trim();
    const lastOpenedDate = String(row[19] || '').trim();
    const clicksCount = parseInt(String(row[20] || '0'), 10) || 0;
    const firstClickedDate = String(row[21] || '').trim();
    const lastClickedDate = String(row[22] || '').trim();

    leads.push({
      leadId,
      name,
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
      rowIndex: i + 1 // Row 1-based index in the sheet
    });
  }

  return leads;
}

/**
 * Fetches all leads from the active Google Sheet
 */
export async function fetchLeads(token: string, spreadsheetId: string): Promise<Lead[]> {
  // First attempt to read 'Leads!A1:W1000'
  let res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:W1000`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  // If 'Leads' tab is not found, attempt reading the primary sheet A1:W1000
  if (!res.ok) {
    res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:W1000`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to read spreadsheet (${res.status})`);
  }

  const data = await res.json();
  const leads = parseSheetRowsToLeads(data.values || []);
  
  // Non-blocking attempt to ensure extended headers exist if needed
  upgradeSheetHeadersIfNeeded(token, spreadsheetId);

  return leads;
}

/**
 * Converts a Lead object into a row array matching SHEET_COLUMNS (23 columns)
 */
export function leadToRowArray(lead: Lead): any[] {
  return [
    lead.leadId || '',
    lead.name || (lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : lead.firstName || ''),
    lead.email || '',
    lead.company || '',
    lead.painPoint || '',
    lead.currentStage !== undefined ? lead.currentStage : 0,
    lead.status || 'Active',
    lead.lastEmailSentDate || '',
    lead.nextSendDate || '',
    lead.threadId || '',
    lead.notes || '',
    lead.firstName || '',
    lead.lastName || '',
    lead.jobTitle || '',
    lead.linkedinUrl || '',
    lead.industry || '',
    lead.campaign || 'Default',
    lead.opensCount || 0,
    lead.firstOpenedDate || '',
    lead.lastOpenedDate || '',
    lead.clicksCount || 0,
    lead.firstClickedDate || '',
    lead.lastClickedDate || ''
  ];
}

/**
 * Appends a new lead to the Google Sheet
 */
export async function appendLead(token: string, spreadsheetId: string, lead: Lead): Promise<void> {
  const rowValues = leadToRowArray(lead);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:W:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [rowValues]
      })
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to add lead to sheet`);
  }
}

/**
 * Appends multiple new leads to the Google Sheet in a single request
 */
export async function batchAppendLeads(token: string, spreadsheetId: string, newLeads: Lead[]): Promise<void> {
  if (newLeads.length === 0) return;
  const rows = newLeads.map(leadToRowArray);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:W:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rows
      })
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to batch append leads to sheet`);
  }
}

/**
 * Updates a specific row in the Google Sheet
 */
export async function updateLeadRow(token: string, spreadsheetId: string, lead: Lead): Promise<void> {
  if (!lead.rowIndex || lead.rowIndex < 2) {
    throw new Error('Invalid row index for lead update');
  }

  const rowValues = leadToRowArray(lead);
  const range = `Leads!A${lead.rowIndex}:W${lead.rowIndex}`;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        values: [rowValues]
      })
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to update lead at row ${lead.rowIndex}`);
  }
}

/**
 * Batch updates multiple lead rows in the Google Sheet
 */
export async function batchUpdateLeads(token: string, spreadsheetId: string, leads: Lead[]): Promise<void> {
  const data = leads
    .filter(l => l.rowIndex && l.rowIndex >= 2)
    .map(lead => ({
      range: `Leads!A${lead.rowIndex}:W${lead.rowIndex}`,
      values: [leadToRowArray(lead)]
    }));

  if (data.length === 0) return;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data
      })
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to batch update leads in sheet`);
  }
}
