import { StageTemplate, Lead } from '../types';

export const DEFAULT_STAGE_TEMPLATES: StageTemplate[] = [
  {
    stage: 1,
    name: 'Introduction',
    purpose: 'Who we are, company name, and what we do',
    defaultGapDays: 3,
    subject: 'Quick question regarding {{company}}',
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">I noticed your work leading initiatives at {{company}}. I'm reaching out because we help growing teams resolve {{pain_point}} without hiring extra overhead or changing existing workflows.</p>
      <p style="margin: 0 0 14px 0;">Are you open to a brief 5-minute sync later this week to see how this compares to your current setup?</p>
      <p style="margin: 0 0 4px 0;">Best regards,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  },
  {
    stage: 2,
    name: 'Value Proposition',
    purpose: 'Why this email is worth reading',
    defaultGapDays: 3,
    subject: 'Re: Quick question regarding {{company}}',
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">Following up on my note earlier. When companies tackle {{pain_point}}, they usually face two friction points: slow turnaround cycles and fragmented execution.</p>
      <p style="margin: 0 0 14px 0;">We created an automated framework that eliminates both within 14 days, saving teams roughly 12 hours every week per team member.</p>
      <p style="margin: 0 0 14px 0;">Would Tuesday or Thursday morning work for a quick walkthrough?</p>
      <p style="margin: 0 0 4px 0;">Cheers,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  },
  {
    stage: 3,
    name: 'Proof & Case Study',
    purpose: 'Case study / one-pager / deck, includes a hyperlink',
    defaultGapDays: 3,
    subject: 'Re: Quick question regarding {{company}}',
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">Rather than just talking features, here is how a team facing {{pain_point}} solved it in practice:</p>
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
        <tr>
          <td style="padding: 14px 18px;">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #0f172a;">Customer Story: 3.4x faster resolution</p>
            <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;">How Apex Systems automated their bottleneck in under 3 weeks.</p>
            <a href="https://example.com/case-study" target="_blank" style="display: inline-block; color: #2563eb; text-decoration: underline; font-weight: 500; font-size: 14px;">View 1-Page Summary &rarr;</a>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 14px 0;">Would you find value in reviewing similar benchmarks for {{company}}?</p>
      <p style="margin: 0 0 4px 0;">Best,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  },
  {
    stage: 4,
    name: 'Solution',
    purpose: "Addresses the lead's specific pain point(s)",
    defaultGapDays: 3,
    subject: 'Re: Quick question regarding {{company}}',
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">Thinking specifically about {{company}} and {{pain_point}} — here is how our tailored solution targets this challenge directly:</p>
      <p style="margin: 0 0 10px 0; padding-left: 10px; border-left: 3px solid #2563eb; color: #334155;">
        <strong>Direct Remediation:</strong> Automates routine verification, flags anomalies before delivery, and synchronizes updates in real time.
      </p>
      <p style="margin: 0 0 14px 0;">It plugs right into what you already use with no engineering lift needed on your side.</p>
      <p style="margin: 0 0 14px 0;">Does this align with your priorities this quarter?</p>
      <p style="margin: 0 0 4px 0;">Warm regards,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  },
  {
    stage: 5,
    name: 'Pricing & Scope',
    purpose: 'High-level, framed as "to be discussed"',
    defaultGapDays: 3,
    subject: 'Re: Quick question regarding {{company}}',
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">A common question at this stage is investment and structure. We keep our engagement model flexible and tied directly to measurable outcomes.</p>
      <p style="margin: 0 0 14px 0;">Depending on the rollout scale for {{company}}, pricing is modular and can be shaped around your target ROI — to be discussed once we verify exact fit.</p>
      <p style="margin: 0 0 14px 0;">Do you have 10 minutes next Wednesday to review numbers and options together?</p>
      <p style="margin: 0 0 4px 0;">Best,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  },
  {
    stage: 6,
    name: 'Follow-up',
    purpose: "Re-references stages 1–3, for leads who've gone quiet",
    defaultGapDays: 3,
    subject: 'Re: Quick question regarding {{company}}',
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">I know how packed schedules get. Circling back to my earlier notes on addressing {{pain_point}} at {{company}}.</p>
      <p style="margin: 0 0 14px 0;">Between the workflow automation we discussed and the verified results in our case study, I'm confident we could free up substantial bandwidth for your team.</p>
      <p style="margin: 0 0 14px 0;">If timing is tight right now, just let me know if next month is better.</p>
      <p style="margin: 0 0 4px 0;">Thanks,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  },
  {
    stage: 7,
    name: 'Break-up',
    purpose: 'Polite close-out, door left open for future contact',
    defaultGapDays: 3,
    subject: 'Re: Quick question regarding {{company}}',
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">I haven't heard back, so I assume tackling {{pain_point}} isn't a priority for {{company}} right now — totally understandable.</p>
      <p style="margin: 0 0 14px 0;">This will be my last email. If things change down the road or you'd ever like to reconnect, my door is always open.</p>
      <p style="margin: 0 0 14px 0;">Wishing you and {{company}} continued success!</p>
      <p style="margin: 0 0 4px 0;">All the best,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  }
];

const TEMPLATES_STORAGE_KEY = 'outreach_flow_stage_templates';

export function loadSavedTemplates(): StageTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 7) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading templates from storage:', e);
  }
  return DEFAULT_STAGE_TEMPLATES;
}

export function saveTemplatesToStorage(templates: StageTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Error saving templates:', e);
  }
}

/**
 * Extracts first name from full name
 */
export function extractFirstName(fullName: string): string {
  if (!fullName) return 'there';
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || 'there';
}

/**
 * Replaces merge tags with actual lead values
 */
export function renderEmailMergeTags(
  templateString: string,
  lead: Partial<Lead>,
  senderName: string = 'Our Team'
): string {
  const firstName = lead.firstName || extractFirstName(lead.name || '');
  const lastName = lead.lastName || (lead.name ? lead.name.split(' ').slice(1).join(' ') : '');
  const company = lead.company || 'your company';
  const painPoint = lead.painPoint || 'workflow efficiency bottlenecks';
  const name = lead.name || (firstName ? `${firstName} ${lastName}`.trim() : 'there');
  const jobTitle = lead.jobTitle || 'team lead';
  const industry = lead.industry || 'your industry';
  const linkedinUrl = lead.linkedinUrl || '';
  const campaign = lead.campaign || '';

  return templateString
    .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
    .replace(/\{\{\s*last_name\s*\}\}/gi, lastName)
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*company\s*\}\}/gi, company)
    .replace(/\{\{\s*job_title\s*\}\}/gi, jobTitle)
    .replace(/\{\{\s*industry\s*\}\}/gi, industry)
    .replace(/\{\{\s*pain_point\s*\}\}/gi, painPoint)
    .replace(/\{\{\s*linkedin_url\s*\}\}/gi, linkedinUrl)
    .replace(/\{\{\s*campaign\s*\}\}/gi, campaign)
    .replace(/\{\{\s*sender_name\s*\}\}/gi, senderName);
}
