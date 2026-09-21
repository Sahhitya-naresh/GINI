import fs from 'fs';
import path from 'path';

export interface BackendLead {
  leadId: string;
  name: string;
  email: string;
  company: string;
  painPoint: string;
  currentStage: number;
  status: string;
  lastEmailSentDate: string;
  nextSendDate: string;
  threadId: string;
  notes: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  industry?: string;
  campaign?: string;
  opensCount?: number;
  firstOpenedDate?: string;
  lastOpenedDate?: string;
  clicksCount?: number;
  firstClickedDate?: string;
  lastClickedDate?: string;
  currentNodeId?: string;
  campaignId?: string;
  nodeEnteredDate?: string;
  senderUsed?: string;
  rowIndex?: number;
}

export interface BackendCampaign {
  id: string;
  name: string;
  description?: string;
  version?: number;
  is_active: boolean;
  workflow_graph: {
    nodes: any[];
    edges: any[];
    description?: string;
    version?: number;
  };
  created_date: string;
  updated_date?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data_store');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');

// Ensure data_store directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial fallback leads if file does not exist
const SEED_LEADS: BackendLead[] = [
  {
    leadId: 'LEAD-101',
    name: 'Alex Morgan',
    firstName: 'Alex',
    lastName: 'Morgan',
    email: 'alex.morgan@techpulse-example.com',
    company: 'TechPulse Innovations',
    jobTitle: 'VP of Sales',
    industry: 'SaaS / Technology',
    campaign: 'Q3 Enterprise Outreach',
    painPoint: 'slow manual lead qualification pipeline',
    currentStage: 0,
    status: 'Active',
    lastEmailSentDate: '',
    nextSendDate: new Date().toISOString().split('T')[0],
    threadId: '',
    notes: 'Key decision maker, met at TechSummit',
    opensCount: 2,
    clicksCount: 1,
    currentNodeId: 'node-start',
    rowIndex: 2
  },
  {
    leadId: 'LEAD-102',
    name: 'Jordan Lee',
    firstName: 'Jordan',
    lastName: 'Lee',
    email: 'jordan.lee@growthorbit-example.com',
    company: 'GrowthOrbit',
    jobTitle: 'Head of Growth',
    industry: 'Marketing Tech',
    campaign: 'Q3 Enterprise Outreach',
    painPoint: 'fragmented outreach messaging & poor response rates',
    currentStage: 1,
    status: 'Active',
    lastEmailSentDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    nextSendDate: new Date().toISOString().split('T')[0],
    threadId: '',
    notes: 'Sent Intro Stage 1, ready for follow-up',
    opensCount: 1,
    clicksCount: 0,
    currentNodeId: 'node-email-1',
    rowIndex: 3
  },
  {
    leadId: 'LEAD-103',
    name: 'Samira Patel',
    firstName: 'Samira',
    lastName: 'Patel',
    email: 'samira@nexusflow-example.com',
    company: 'NexusFlow Solutions',
    jobTitle: 'Chief Operating Officer',
    industry: 'Enterprise Software',
    campaign: 'Inbound Product Qualified',
    painPoint: 'high churn in prospect onboarding',
    currentStage: 2,
    status: 'Replied',
    lastEmailSentDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    nextSendDate: '',
    threadId: '',
    notes: 'Replied: "Sounds interesting, what is your pricing model?"',
    opensCount: 4,
    clicksCount: 2,
    currentNodeId: 'node-email-2',
    rowIndex: 4
  }
];

export const SHEET_LEAD_COLUMNS = [
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

export const SHEET_CAMPAIGN_COLUMNS = [
  'Campaign ID',
  'Name',
  'Is Active',
  'Workflow Graph JSON',
  'Created Date',
  'Updated Date'
];

// --- Local File Storage Helpers ---

export function loadLocalLeads(): BackendLead[] {
  try {
    if (fs.existsSync(LEADS_FILE)) {
      const data = fs.readFileSync(LEADS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading leads.json:', e);
  }
  saveLocalLeads(SEED_LEADS);
  return SEED_LEADS;
}

export function saveLocalLeads(leads: BackendLead[]): void {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing leads.json:', e);
  }
}

export function loadLocalCampaigns(): BackendCampaign[] {
  try {
    if (fs.existsSync(CAMPAIGNS_FILE)) {
      const data = fs.readFileSync(CAMPAIGNS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading campaigns.json:', e);
  }
  // Load empty by default — user builds campaigns from scratch
  return [];
}

export function saveLocalCampaigns(campaigns: BackendCampaign[]): void {
  try {
    fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing campaigns.json:', e);
  }
}

// --- Google Sheets API Helpers ---

function leadToRow(lead: BackendLead): any[] {
  return [
    lead.leadId || '',
    lead.name || (lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : lead.firstName || ''),
    lead.email || '',
    lead.company || '',
    lead.painPoint || '',
    lead.currentStage ?? 0,
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
    lead.opensCount ?? 0,
    lead.firstOpenedDate || '',
    lead.lastOpenedDate || '',
    lead.clicksCount ?? 0,
    lead.firstClickedDate || '',
    lead.lastClickedDate || '',
    lead.currentNodeId || '',
    lead.campaignId || '',
    lead.nodeEnteredDate || '',
    lead.senderUsed || ''
  ];
}

function rowToLead(row: any[], index: number): BackendLead {
  const leadId = String(row[0] || '').trim();
  const name = String(row[1] || '').trim();
  const email = String(row[2] || '').trim();
  const company = String(row[3] || '').trim();
  const painPoint = String(row[4] || '').trim();
  const currentStage = parseInt(String(row[5] || '0'), 10) || 0;
  const status = String(row[6] || 'Active').trim();
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

  return {
    leadId,
    name,
    email,
    company,
    painPoint,
    currentStage,
    status,
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
    rowIndex: index + 1
  };
}

async function ensureSheetsAndHeaders(token: string, spreadsheetId: string): Promise<void> {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metaRes.ok) return;

    const meta = await metaRes.json();
    const sheetTitles: string[] = (meta.sheets || []).map((s: any) => s.properties?.title);

    // Check if "Campaigns" tab exists
    if (!sheetTitles.includes('Campaigns')) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Campaigns',
                  gridProperties: { frozenRowCount: 1 }
                }
              }
            }
          ]
        })
      });

      // Write headers for Campaigns
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Campaigns!A1:F1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [SHEET_CAMPAIGN_COLUMNS] })
        }
      );
    }

    // Ensure Leads headers exist
    if (sheetTitles.includes('Leads') || sheetTitles.length > 0) {
      const tabName = sheetTitles.includes('Leads') ? 'Leads' : sheetTitles[0];
      const headerRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tabName}!A1:AA1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (headerRes.ok) {
        const headerData = await headerRes.json();
        const existingRow = headerData.values?.[0] || [];
        if (existingRow.length < SHEET_LEAD_COLUMNS.length) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tabName}!A1:AA1?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ values: [SHEET_LEAD_COLUMNS] })
            }
          );
        }
      }
    }
  } catch (err) {
    console.warn('ensureSheetsAndHeaders warning:', err);
  }
}

// ---------------------------------------------------------------------------
// LEADS BACKEND CRUD
// ---------------------------------------------------------------------------

export async function listLeads(token?: string, spreadsheetId?: string): Promise<BackendLead[]> {
  if (token && spreadsheetId) {
    try {
      await ensureSheetsAndHeaders(token, spreadsheetId);
      let res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:AA1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:AA1000`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      if (res.ok) {
        const data = await res.json();
        const rows = data.values || [];
        if (rows.length > 1) {
          const leads: BackendLead[] = [];
          for (let i = 1; i < rows.length; i++) {
            if (rows[i] && rows[i][0]) {
              leads.push(rowToLead(rows[i], i));
            }
          }
          // Mirror to local storage for caching/resilience
          saveLocalLeads(leads);
          return leads;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch leads from Google Sheet, falling back to local file:', e);
    }
  }
  return loadLocalLeads();
}

export async function createLead(
  lead: BackendLead,
  token?: string,
  spreadsheetId?: string,
  alreadySyncedToSheet?: boolean
): Promise<BackendLead> {
  const local = loadLocalLeads();
  const nextNum = local.length + 1;
  const newLead: BackendLead = {
    ...lead,
    leadId: lead.leadId || `LEAD-${100 + nextNum}`,
    rowIndex: lead.rowIndex || (local.length + 2)
  };

  // Only append to Google Sheets if NOT already synced to the sheet by the client!
  if (token && spreadsheetId && !alreadySyncedToSheet) {
    await ensureSheetsAndHeaders(token, spreadsheetId);

    // De-duplication check against existing sheet rows
    let alreadyInSheet = false;
    try {
      const checkRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:C1000`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const rows = checkData.values || [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (r && (r[0] === newLead.leadId || (r[2] && r[2].toLowerCase() === newLead.email?.toLowerCase()))) {
            alreadyInSheet = true;
            newLead.rowIndex = i + 1;
            break;
          }
        }
      }
    } catch (checkErr) {
      console.warn('Pre-append duplicate check warning:', checkErr);
    }

    if (!alreadyInSheet) {
      const row = leadToRow(newLead);
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:AA:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [row] })
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error('Google Authentication expired. Please sign in again.');
        if (res.status === 429) throw new Error('Google Sheets API rate limit exceeded. Please wait a few seconds.');
        if (res.status === 403) throw new Error(`Google Sheets permission denied: ${errJson.error?.message || res.statusText}`);
        throw new Error(`Google Sheets API write failed (${res.status}): ${errJson.error?.message || res.statusText}`);
      }
    }
  }

  // De-duplicate local storage update
  const existingIdx = local.findIndex(
    x => x.leadId === newLead.leadId || (x.email && x.email.toLowerCase() === newLead.email?.toLowerCase())
  );
  if (existingIdx !== -1) {
    local[existingIdx] = { ...local[existingIdx], ...newLead };
  } else {
    local.push(newLead);
  }
  saveLocalLeads(local);
  return newLead;
}

export async function updateLead(
  lead: BackendLead,
  token?: string,
  spreadsheetId?: string,
  alreadySyncedToSheet?: boolean
): Promise<BackendLead> {
  const local = loadLocalLeads();
  const idx = local.findIndex(l => l.leadId === lead.leadId);

  if (token && spreadsheetId && !alreadySyncedToSheet) {
    let targetRow = lead.rowIndex;
    if (!targetRow || targetRow < 2) {
      const idRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:A1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!idRes.ok) {
        const errJson = await idRes.json().catch(() => ({}));
        throw new Error(`Failed to query Google Sheet for lead update: ${errJson.error?.message || idRes.statusText}`);
      }
      const idData = await idRes.json();
      const rows = idData.values || [];
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] && rows[i][0] === lead.leadId) {
          targetRow = i + 1;
          break;
        }
      }
    }

    if (!targetRow || targetRow < 2) {
      throw new Error(`Lead ${lead.leadId} row not found in Google Sheet`);
    }

    const row = leadToRow({ ...(idx !== -1 ? local[idx] : lead) });
    const range = `Leads!A${targetRow}:AA${targetRow}`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ range, values: [row] })
      }
    );
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error('Google Authentication expired. Please sign in again.');
      if (res.status === 429) throw new Error('Google Sheets API rate limit exceeded.');
      if (res.status === 403) throw new Error(`Google Sheets permission denied: ${errJson.error?.message || res.statusText}`);
      throw new Error(`Google Sheets API write failed (${res.status}): ${errJson.error?.message || res.statusText}`);
    }
  }

  if (idx !== -1) {
    local[idx] = { ...local[idx], ...lead };
    saveLocalLeads(local);
    return local[idx];
  }
  return lead;
}

export async function batchCreateLeads(
  newLeads: BackendLead[],
  token?: string,
  spreadsheetId?: string,
  alreadySyncedToSheet?: boolean
): Promise<BackendLead[]> {
  const local = loadLocalLeads();
  const created: BackendLead[] = [];

  for (let i = 0; i < newLeads.length; i++) {
    const item = newLeads[i];
    const nextNum = local.length + 1;
    const l: BackendLead = {
      ...item,
      leadId: item.leadId || `LEAD-${100 + nextNum}`,
      rowIndex: item.rowIndex || (local.length + 2)
    };
    created.push(l);
  }

  if (token && spreadsheetId && created.length > 0 && !alreadySyncedToSheet) {
    await ensureSheetsAndHeaders(token, spreadsheetId);
    const rows = created.map(leadToRow);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:AA:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: rows })
      }
    );
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error('Google Authentication expired. Please sign in again.');
      if (res.status === 429) throw new Error('Google Sheets API rate limit exceeded.');
      if (res.status === 403) throw new Error(`Google Sheets permission denied: ${errJson.error?.message || res.statusText}`);
      throw new Error(`Google Sheets API batch write failed (${res.status}): ${errJson.error?.message || res.statusText}`);
    }
  }

  for (const item of created) {
    const existingIdx = local.findIndex(x => x.leadId === item.leadId || (x.email && x.email.toLowerCase() === item.email.toLowerCase()));
    if (existingIdx !== -1) {
      local[existingIdx] = { ...local[existingIdx], ...item };
    } else {
      local.push(item);
    }
  }
  saveLocalLeads(local);

  return created;
}

// ---------------------------------------------------------------------------
// CAMPAIGNS BACKEND CRUD & WORKFLOW GRAPH PERSISTENCE
// ---------------------------------------------------------------------------

export async function listCampaigns(token?: string, spreadsheetId?: string): Promise<BackendCampaign[]> {
  if (token && spreadsheetId) {
    try {
      await ensureSheetsAndHeaders(token, spreadsheetId);
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Campaigns!A1:F100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const rows = data.values || [];
        if (rows.length > 1) {
          const campaigns: BackendCampaign[] = [];
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r || !r[0]) continue;
            let graph = { nodes: [], edges: [] };
            try {
              if (r[3]) {
                graph = JSON.parse(r[3]);
              }
            } catch (err) {
              console.warn(`Failed to parse graph for campaign ${r[0]}:`, err);
            }

            const parsedGraph = graph as any;
            campaigns.push({
              id: String(r[0]),
              name: String(r[1] || 'Untitled Campaign'),
              description: parsedGraph.description || '',
              version: parsedGraph.version || 1,
              is_active: String(r[2]).toLowerCase() === 'true',
              workflow_graph: graph,
              created_date: String(r[4] || new Date().toISOString()),
              updated_date: String(r[5] || new Date().toISOString())
            });
          }
          saveLocalCampaigns(campaigns);
          return campaigns;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch campaigns from sheet, using local:', e);
    }
  }
  return loadLocalCampaigns();
}

export async function saveCampaign(campaign: BackendCampaign, token?: string, spreadsheetId?: string): Promise<BackendCampaign> {
  const local = loadLocalCampaigns();
  const existingIdx = local.findIndex(c => c.id === campaign.id);
  const desc = campaign.description || (campaign.workflow_graph as any)?.description || '';
  const ver = campaign.version || (campaign.workflow_graph as any)?.version || 1;
  const updatedCampaign: BackendCampaign = {
    ...campaign,
    description: desc,
    version: ver,
    workflow_graph: {
      ...campaign.workflow_graph,
      description: desc,
      version: ver
    },
    updated_date: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    local[existingIdx] = updatedCampaign;
  } else {
    local.push(updatedCampaign);
  }
  saveLocalCampaigns(local);

  if (token && spreadsheetId) {
    try {
      await ensureSheetsAndHeaders(token, spreadsheetId);
      // Fetch existing rows to find index
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Campaigns!A1:A100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const rows = data.values || [];
        let targetRowIndex = -1;
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i][0] === campaign.id) {
            targetRowIndex = i + 1;
            break;
          }
        }

        const rowValues = [
          updatedCampaign.id,
          updatedCampaign.name,
          updatedCampaign.is_active ? 'TRUE' : 'FALSE',
          JSON.stringify(updatedCampaign.workflow_graph),
          updatedCampaign.created_date,
          updatedCampaign.updated_date
        ];

        if (targetRowIndex > 1) {
          // Update existing row
          const range = `Campaigns!A${targetRowIndex}:F${targetRowIndex}`;
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ range, values: [rowValues] })
          });
        } else {
          // Append new row
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Campaigns!A:F:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: [rowValues] })
          });
        }
      }
    } catch (e) {
      console.error('Error saving campaign to Google Sheet:', e);
    }
  }

  return updatedCampaign;
}

export async function deleteCampaign(campaignId: string, token?: string, spreadsheetId?: string): Promise<boolean> {
  const local = loadLocalCampaigns();
  const filtered = local.filter(c => c.id !== campaignId);
  saveLocalCampaigns(filtered);

  if (token && spreadsheetId) {
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Campaigns!A1:F100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const rows: any[][] = data.values || [];
        if (rows.length > 1) {
          const header = rows[0];
          const remaining = rows.slice(1).filter(r => r && r[0] !== campaignId);
          // Clear and rewrite
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Campaigns!A1:F100:clear`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Campaigns!A1?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: [header, ...remaining] })
          });
        }
      }
    } catch (e) {
      console.error('Error deleting campaign from Google Sheet:', e);
    }
  }

  return true;
}

export async function toggleCampaignActive(campaignId: string, isActive: boolean, token?: string, spreadsheetId?: string): Promise<BackendCampaign | null> {
  const local = loadLocalCampaigns();
  const target = local.find(c => c.id === campaignId);
  if (!target) return null;

  target.is_active = isActive;
  target.updated_date = new Date().toISOString();
  saveLocalCampaigns(local);

  if (token && spreadsheetId) {
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Campaigns!A1:C100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const rows = data.values || [];
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i][0] === campaignId) {
            const range = `Campaigns!C${i + 1}`;
            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ range, values: [[isActive ? 'TRUE' : 'FALSE']] })
            });
            break;
          }
        }
      }
    } catch (e) {
      console.error('Error toggling campaign active state in sheet:', e);
    }
  }

  return target;
}

// ---------------------------------------------------------------------------
// LEAD DELETION
// ---------------------------------------------------------------------------

export async function deleteLead(
  leadId: string,
  token?: string,
  spreadsheetId?: string,
  alreadySyncedToSheet?: boolean
): Promise<boolean> {
  // If Google Sheet is connected and NOT already deleted by client, delete or clear row directly in Google Sheets
  if (token && spreadsheetId && !alreadySyncedToSheet) {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:A1000`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error('Google Authentication expired. Please sign in again.');
      if (res.status === 429) throw new Error('Google Sheets API rate limit exceeded.');
      if (res.status === 403) throw new Error(`Google Sheets permission denied: ${errJson.error?.message || res.statusText}`);
      throw new Error(`Failed to query Google Sheet for lead deletion: ${errJson.error?.message || res.statusText}`);
    }
    const data = await res.json();
    const rows = data.values || [];
    let targetRow = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === leadId) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow >= 2) {
      // Find numeric sheetId of Leads tab
      let sheetNumericId = 0;
      try {
        const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          const leadsSheet = (metaData.sheets || []).find((s: any) => s.properties?.title?.toLowerCase() === 'leads');
          if (leadsSheet && typeof leadsSheet.properties?.sheetId === 'number') {
            sheetNumericId = leadsSheet.properties.sheetId;
          }
        }
      } catch (e) {
        console.warn('Could not determine sheetId, defaulting to 0:', e);
      }

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

      if (!delRes.ok) {
        // Fallback to clearing row values
        const range = `Leads!A${targetRow}:AA${targetRow}`;
        const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!clearRes.ok) {
          const errJson = await clearRes.json().catch(() => ({}));
          throw new Error(`Failed to remove row in Google Sheet: ${errJson.error?.message || clearRes.statusText}`);
        }
      }
    }
  }

  let local = loadLocalLeads();
  const initialLength = local.length;
  local = local.filter(l => l.leadId !== leadId);
  saveLocalLeads(local);

  return local.length < initialLength;
}

// ---------------------------------------------------------------------------
// SETTINGS, SENDERS & TASKS PERSISTENCE
// ---------------------------------------------------------------------------

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const SENDERS_FILE = path.join(DATA_DIR, 'senders.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

export function loadLocalSettings(): any {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading settings.json:', e);
  }
  return {
    spreadsheetId: '',
    spreadsheetName: '',
    spreadsheetUrl: '',
    defaultGapDays: 3,
    stageGapDays: { 1: 3, 2: 4, 3: 4, 4: 5, 5: 5, 6: 7 },
    skipWeekends: true,
    senderName: 'Sales Outreach Team',
    senderEmail: 'user@example.com'
  };
}

export function saveLocalSettings(settings: any): any {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing settings.json:', e);
  }
  return settings;
}

export function loadLocalSenders(): any[] {
  try {
    if (fs.existsSync(SENDERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SENDERS_FILE, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 1) {
        return parsed;
      }
      if (Array.isArray(parsed) && parsed.length === 1) {
        const merged = [
          parsed[0],
          {
            id: 'sender-sales',
            name: 'Sales Outreach Team',
            email: 'sales.outreach@gini-growth.com',
            avatarUrl: '',
            status: 'connected',
            isPrimary: false,
            dailySendLimit: 200,
            sendsToday: 0,
            lastUsedAt: new Date().toISOString()
          },
          {
            id: 'sender-partnerships',
            name: 'Elena Rostova (Partnerships)',
            email: 'partnerships@gini-growth.com',
            avatarUrl: '',
            status: 'connected',
            isPrimary: false,
            dailySendLimit: 150,
            sendsToday: 0,
            lastUsedAt: new Date().toISOString()
          },
          {
            id: 'sender-growth',
            name: 'Growth & Inbound Inquiries',
            email: 'growth.inbox@outreach-flow.io',
            avatarUrl: '',
            status: 'connected',
            isPrimary: false,
            dailySendLimit: 100,
            sendsToday: 0,
            lastUsedAt: new Date().toISOString()
          }
        ];
        saveLocalSenders(merged);
        return merged;
      }
    }
  } catch (e) {
    console.error('Error reading senders.json:', e);
  }
  return [
    {
      id: 'sender-primary',
      name: 'Primary Workspace Account',
      email: 'user@example.com',
      avatarUrl: '',
      status: 'connected',
      isPrimary: true,
      dailySendLimit: 150,
      sendsToday: 0,
      lastUsedAt: new Date().toISOString()
    },
    {
      id: 'sender-sales',
      name: 'Sales Outreach Team',
      email: 'sales.outreach@gini-growth.com',
      avatarUrl: '',
      status: 'connected',
      isPrimary: false,
      dailySendLimit: 200,
      sendsToday: 0,
      lastUsedAt: new Date().toISOString()
    },
    {
      id: 'sender-partnerships',
      name: 'Elena Rostova (Partnerships)',
      email: 'partnerships@gini-growth.com',
      avatarUrl: '',
      status: 'connected',
      isPrimary: false,
      dailySendLimit: 150,
      sendsToday: 0,
      lastUsedAt: new Date().toISOString()
    },
    {
      id: 'sender-growth',
      name: 'Growth & Inbound Inquiries',
      email: 'growth.inbox@outreach-flow.io',
      avatarUrl: '',
      status: 'connected',
      isPrimary: false,
      dailySendLimit: 100,
      sendsToday: 0,
      lastUsedAt: new Date().toISOString()
    }
  ];
}

export function saveLocalSenders(senders: any[]): any[] {
  try {
    fs.writeFileSync(SENDERS_FILE, JSON.stringify(senders, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing senders.json:', e);
  }
  return senders;
}

export function loadLocalTasks(): any[] {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading tasks.json:', e);
  }
  return [];
}

export function saveLocalTasks(tasks: any[]): any[] {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing tasks.json:', e);
  }
  return tasks;
}

export function updateLocalTask(taskId: string, updates: any): any | null {
  const tasks = loadLocalTasks();
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
    saveLocalTasks(tasks);
    return tasks[idx];
  }
  return null;
}

export function getSystemStatsSummary(): any {
  const leads = loadLocalLeads();
  const campaigns = loadLocalCampaigns();
  const tasks = loadLocalTasks();
  const senders = loadLocalSenders();

  const activeLeads = leads.filter(l => l.status === 'Active').length;
  const repliedLeads = leads.filter(l => l.status === 'Replied').length;
  const activeCampaigns = campaigns.filter(c => c.is_active).length;
  const pendingTasks = tasks.filter(t => !t.isCompleted).length;

  return {
    totalLeads: leads.length,
    activeLeads,
    repliedLeads,
    totalCampaigns: campaigns.length,
    activeCampaigns,
    pendingTasks,
    sendersCount: senders.length,
    serverTimestamp: new Date().toISOString()
  };
}
