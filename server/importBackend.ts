import * as XLSX from 'xlsx';

export interface ParsedImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  linkedinUrl: string;
  painPoint: string;
  industry: string;
  notes: string;
  campaign: string;
  isValid: boolean;
  validationError?: string;
  isDuplicate: boolean;
  duplicateReason?: string;
}

export interface ImportParseResult {
  success: boolean;
  filename: string;
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  rawHeaders: string[];
  rawRows: Record<string, any>[];
  headersDetected: Record<string, string>;
  detectedHeaderList: string[];
  missingRequired: string[];
  autoMapped: boolean;
  preview: ParsedImportRow[];
  leads?: ParsedImportRow[];
  allRows?: ParsedImportRow[];
  validRows: ParsedImportRow[];
  duplicateRows: ParsedImportRow[];
  errorRows: ParsedImportRow[];
  invalidRows?: ParsedImportRow[];
}

function normalizeHeader(h: string): string {
  return String(h || '')
    .toLowerCase()
    .replace(/[_\-\s\.\(\)\/]+/g, '')
    .trim();
}

export function parseFileBuffer(
  buffer: Buffer,
  filename: string,
  existingEmails: string[] = [],
  customMapping?: Record<string, string>
): ImportParseResult {
  const existingSet = new Set(existingEmails.map(e => e.trim().toLowerCase()));

  // Read workbook with xlsx (supports CSV, TSV, XLS, XLSX)
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('The uploaded file does not contain any readable sheets.');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length < 2) {
    throw new Error('The uploaded file has no data rows (header or data missing).');
  }

  // Find header row (usually row 0, but check first 5 rows for typical header keywords)
  let headerIndex = 0;
  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const rowStr = rawRows[r].map((c: any) => normalizeHeader(String(c))).join(' ');
    if (rowStr.includes('email') || rowStr.includes('mail') || rowStr.includes('contact') || rowStr.includes('name') || rowStr.includes('lead')) {
      headerIndex = r;
      break;
    }
  }

  const headerRow = rawRows[headerIndex] || [];
  const rawHeaders: string[] = headerRow.map((col: any, idx: number) => {
    const str = String(col ?? '').trim();
    return str || `Column_${idx + 1}`;
  });

  // Extract all data rows as objects keyed by rawHeaders
  const rawRowsObjects: Record<string, any>[] = [];
  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || r.length === 0 || r.every((c: any) => !c || String(c).trim() === '')) {
      continue; // Skip entirely empty rows
    }
    const rowObj: Record<string, any> = {};
    rawHeaders.forEach((h, colIdx) => {
      rowObj[h] = r[colIdx] !== undefined ? String(r[colIdx]).trim() : '';
    });
    rawRowsObjects.push(rowObj);
  }

  const colMap: Record<string, number> = {};
  const detectedHeadersDisplay: Record<string, string> = {};

  // If custom mapping is provided, use it
  if (customMapping && Object.keys(customMapping).length > 0) {
    Object.entries(customMapping).forEach(([targetKey, mappedHeader]) => {
      if (!mappedHeader) return;
      const idx = rawHeaders.indexOf(mappedHeader);
      if (idx !== -1) {
        colMap[targetKey] = idx;
        detectedHeadersDisplay[targetKey] = mappedHeader;
        // Normalize camelCase and snake_case variations
        if (targetKey === 'first_name') colMap['firstName'] = idx;
        if (targetKey === 'firstName') colMap['first_name'] = idx;
        if (targetKey === 'last_name') colMap['lastName'] = idx;
        if (targetKey === 'lastName') colMap['last_name'] = idx;
        if (targetKey === 'job_title') colMap['jobTitle'] = idx;
        if (targetKey === 'jobTitle') colMap['job_title'] = idx;
        if (targetKey === 'linkedin_url') colMap['linkedinUrl'] = idx;
        if (targetKey === 'linkedinUrl') colMap['linkedin_url'] = idx;
        if (targetKey === 'pain_point') colMap['painPoint'] = idx;
        if (targetKey === 'painPoint') colMap['pain_point'] = idx;
      }
    });
  } else {
    // Auto-detect mappings from header names
    headerRow.forEach((col: any, idx: number) => {
      const orig = String(col || '').trim();
      const norm = normalizeHeader(orig);

      if (['email', 'emailaddress', 'mail', 'workemail', 'contactemail', 'e-mail', 'electronicmail', 'useremail'].includes(norm)) {
        if (colMap.email === undefined) {
          colMap.email = idx;
          detectedHeadersDisplay.email = orig;
        }
      } else if (['firstname', 'first', 'givenname', 'fname'].includes(norm)) {
        if (colMap.firstName === undefined) {
          colMap.firstName = idx;
          detectedHeadersDisplay.firstName = orig;
        }
      } else if (['lastname', 'last', 'surname', 'lname'].includes(norm)) {
        if (colMap.lastName === undefined) {
          colMap.lastName = idx;
          detectedHeadersDisplay.lastName = orig;
        }
      } else if (['name', 'fullname', 'contactname', 'leadname', 'prospect', 'person', 'prospectname'].includes(norm)) {
        if (colMap.name === undefined) {
          colMap.name = idx;
          detectedHeadersDisplay.name = orig;
        }
      } else if (['company', 'companyname', 'organization', 'org', 'business', 'account', 'firm', 'targetfirm', 'clientcompany'].includes(norm)) {
        if (colMap.company === undefined) {
          colMap.company = idx;
          detectedHeadersDisplay.company = orig;
        }
      } else if (['jobtitle', 'title', 'position', 'role', 'designation', 'job'].includes(norm)) {
        if (colMap.jobTitle === undefined) {
          colMap.jobTitle = idx;
          detectedHeadersDisplay.jobTitle = orig;
        }
      } else if (['painpoint', 'painpoints', 'problem', 'challenge', 'challenges', 'friction', 'frictionpoint', 'bottleneck', 'issues'].includes(norm)) {
        if (colMap.painPoint === undefined) {
          colMap.painPoint = idx;
          detectedHeadersDisplay.painPoint = orig;
        }
      } else if (['linkedin', 'linkedinurl', 'linkedinprofile', 'profileurl', 'social'].includes(norm)) {
        if (colMap.linkedinUrl === undefined) {
          colMap.linkedinUrl = idx;
          detectedHeadersDisplay.linkedinUrl = orig;
        }
      } else if (['industry', 'sector', 'vertical', 'domain'].includes(norm)) {
        if (colMap.industry === undefined) {
          colMap.industry = idx;
          detectedHeadersDisplay.industry = orig;
        }
      } else if (['campaign', 'campaignname', 'list', 'tag', 'tags'].includes(norm)) {
        if (colMap.campaign === undefined) {
          colMap.campaign = idx;
          detectedHeadersDisplay.campaign = orig;
        }
      } else if (['notes', 'note', 'comments', 'comment', 'description', 'memo'].includes(norm)) {
        if (colMap.notes === undefined) {
          colMap.notes = idx;
          detectedHeadersDisplay.notes = orig;
        }
      }
    });
  }

  // Check required fields
  const missingRequired: string[] = [];
  if (colMap.email === undefined) {
    missingRequired.push('email');
  }
  const autoMapped = missingRequired.length === 0;

  const parsedRows: ParsedImportRow[] = [];
  const seenInBatch = new Set<string>();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || r.length === 0 || r.every((c: any) => !c || String(c).trim() === '')) {
      continue; // Skip entirely empty rows
    }

    const getVal = (field: string) => {
      if (colMap[field] !== undefined && r[colMap[field]] !== undefined) {
        return String(r[colMap[field]]).trim();
      }
      return '';
    };

    let email = getVal('email').toLowerCase();
    let firstName = getVal('firstName');
    let lastName = getVal('lastName');
    let fullName = getVal('name');

    if (!fullName && (firstName || lastName)) {
      fullName = `${firstName} ${lastName}`.trim();
    } else if (fullName && !firstName && !lastName) {
      const parts = fullName.split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const company = getVal('company') || 'Prospective Company';
    const jobTitle = getVal('jobTitle');
    const linkedinUrl = getVal('linkedinUrl');
    const painPoint = getVal('painPoint') || 'Optimizing team outreach & qualification';
    const industry = getVal('industry');
    const notes = getVal('notes');
    const campaign = getVal('campaign') || 'Direct Inbound';

    let isValid = true;
    let validationError: string | undefined = undefined;
    let isDuplicate = false;
    let duplicateReason: string | undefined = undefined;

    if (colMap.email === undefined) {
      isValid = false;
      validationError = 'Required column "Email Address" not detected in file headers (manual mapping required)';
    } else if (!email) {
      isValid = false;
      validationError = 'Missing email address';
    } else if (!emailRegex.test(email)) {
      isValid = false;
      validationError = `Invalid email syntax: "${email}"`;
    } else if (existingSet.has(email)) {
      isDuplicate = true;
      isValid = false;
      duplicateReason = `Already exists in Leads database (${email})`;
    } else if (seenInBatch.has(email)) {
      isDuplicate = true;
      isValid = false;
      duplicateReason = `Duplicate within this file (${email})`;
    } else {
      seenInBatch.add(email);
    }

    parsedRows.push({
      rowNumber: i + 1,
      firstName,
      lastName,
      name: fullName || 'Prospect',
      email,
      company,
      jobTitle,
      linkedinUrl,
      painPoint,
      industry,
      notes,
      campaign,
      isValid,
      validationError,
      isDuplicate,
      duplicateReason
    });
  }

  const validRows = parsedRows.filter(r => r.isValid && !r.isDuplicate);
  const duplicateRows = parsedRows.filter(r => r.isDuplicate);
  const errorRows = parsedRows.filter(r => !r.isValid && !r.isDuplicate);

  return {
    success: true,
    filename,
    totalRows: parsedRows.length,
    validCount: validRows.length,
    duplicateCount: duplicateRows.length,
    errorCount: errorRows.length,
    rawHeaders,
    rawRows: rawRowsObjects,
    headersDetected: detectedHeadersDisplay,
    detectedHeaderList: rawHeaders,
    missingRequired,
    autoMapped,
    preview: parsedRows.slice(0, 15),
    leads: parsedRows,
    allRows: parsedRows,
    validRows,
    duplicateRows,
    errorRows,
    invalidRows: errorRows
  };
}
