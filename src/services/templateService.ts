import { TemplateSet, TemplateStageItem } from '../types';

export interface CampaignImpactResult {
  affectedLeadsCount: number;
  userCount: number;
  affectedUserNames: string[];
}

export interface ResolvedPreviewResult {
  resolved: {
    subject: string;
    bodyHtml: string;
    templateSourceUsed: 'custom_node' | 'user' | 'campaign' | 'default';
    version?: number;
    stage: number;
  };
  composed: {
    composedHtml: string;
    renderedHeader: string;
    renderedBody: string;
    renderedFooter: string;
    isLikelyLong: boolean;
    charCount: number;
  };
}

export async function getDefaultTemplateSet(): Promise<TemplateSet> {
  const res = await fetch('/api/template-sets/default', {
    headers: { credentials: 'same-origin' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch default template set');
  }
  const data = await res.json();
  return data.templateSet;
}

export async function getUserTemplateSet(userId: string): Promise<TemplateSet> {
  const res = await fetch(`/api/template-sets/user/${encodeURIComponent(userId)}`, {
    headers: { credentials: 'same-origin' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch user template set');
  }
  const data = await res.json();
  return data.templateSet;
}

export async function getCampaignTemplateSet(campaignId: string): Promise<TemplateSet> {
  const res = await fetch(`/api/template-sets/campaign/${encodeURIComponent(campaignId)}`, {
    headers: { credentials: 'same-origin' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch campaign template set');
  }
  const data = await res.json();
  return data.templateSet;
}

export async function saveTemplateSet(setId: string, stages: TemplateStageItem[]): Promise<TemplateSet> {
  const res = await fetch('/api/template-sets/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      credentials: 'same-origin'
    },
    body: JSON.stringify({ setId, stages })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save template set');
  }
  const data = await res.json();
  return data.templateSet;
}

export async function restoreTemplateSetVersion(setId: string, version: number): Promise<TemplateSet> {
  const res = await fetch(`/api/template-sets/${encodeURIComponent(setId)}/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      credentials: 'same-origin'
    },
    body: JSON.stringify({ version })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to restore template set version');
  }
  const data = await res.json();
  return data.templateSet;
}

export async function resetUserTemplateSetToDefault(userId: string): Promise<TemplateSet> {
  const res = await fetch(`/api/template-sets/user/${encodeURIComponent(userId)}/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      credentials: 'same-origin'
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reset template set');
  }
  const data = await res.json();
  return data.templateSet;
}

export async function getCampaignTemplateImpact(campaignId: string): Promise<CampaignImpactResult> {
  const res = await fetch(`/api/template-sets/campaign/${encodeURIComponent(campaignId)}/impact`, {
    headers: { credentials: 'same-origin' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get campaign template impact');
  }
  const data = await res.json();
  return data.impact;
}

export async function resolvePreviewEmail(params: {
  lead?: any;
  stage?: number;
  node?: any;
  campaignId?: string;
}): Promise<ResolvedPreviewResult> {
  const res = await fetch('/api/templates/resolve-preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      credentials: 'same-origin'
    },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to resolve preview');
  }
  const data = await res.json();
  return {
    resolved: data.resolved,
    composed: data.composed
  };
}

export async function getHeaderFooter(): Promise<{ header: string; footer: string }> {
  const res = await fetch('/api/settings/header-footer', {
    headers: { credentials: 'same-origin' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load email header and footer');
  }
  const data = await res.json();
  return {
    header: data.header || '',
    footer: data.footer || ''
  };
}

export async function saveHeaderFooter(header: string, footer: string): Promise<{ header: string; footer: string }> {
  const res = await fetch('/api/settings/header-footer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      credentials: 'same-origin'
    },
    body: JSON.stringify({ header, footer })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save email header and footer');
  }
  const data = await res.json();
  return {
    header: data.header,
    footer: data.footer
  };
}
