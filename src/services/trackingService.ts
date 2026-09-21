import { Lead, LeadTrackingStats, TrackingEvent } from '../types';

export interface TrackingApiResponse {
  success: boolean;
  totalOpens: number;
  totalClicks: number;
  events: TrackingEvent[];
  statsByLead: Record<string, LeadTrackingStats>;
}

/**
 * Fetches real-time tracking events and aggregated stats from the backend server
 */
export async function fetchTrackingStats(): Promise<TrackingApiResponse> {
  try {
    const res = await fetch('/api/track/events');
    if (!res.ok) {
      throw new Error(`Tracking API error: ${res.statusText}`);
    }
    return await res.json();
  } catch (e) {
    console.warn('Failed to fetch tracking stats from backend server:', e);
    return {
      success: false,
      totalOpens: 0,
      totalClicks: 0,
      events: [],
      statsByLead: {}
    };
  }
}

/**
 * Simulates or logs a tracking event to the backend (useful for testing or direct trigger)
 */
export async function recordTrackingEvent(payload: {
  type: 'open' | 'click';
  leadId: string;
  stage: number;
  campaign?: string;
  targetUrl?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/track/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    console.warn('Failed to record tracking event:', e);
    return false;
  }
}

/**
 * Merges server-side tracking stats into a list of leads
 */
export function mergeTrackingWithLeads(
  leads: Lead[],
  statsByLead: Record<string, LeadTrackingStats>
): Lead[] {
  if (!statsByLead || Object.keys(statsByLead).length === 0) return leads;

  return leads.map(lead => {
    const idKey = lead.leadId?.trim();
    const emailKey = lead.email?.trim().toLowerCase();

    // 1. Direct match by leadId or email
    let stats = (idKey ? statsByLead[idKey] : undefined) || (emailKey ? statsByLead[emailKey] : undefined);

    // 2. Case-insensitive fallback
    if (!stats) {
      const found = Object.entries(statsByLead).find(([key]) => {
        const k = key.trim().toLowerCase();
        return (idKey && k === idKey.toLowerCase()) || (emailKey && k === emailKey);
      });
      if (found) {
        stats = found[1];
      }
    }

    if (!stats) return lead;

    return {
      ...lead,
      opensCount: stats.opensCount !== undefined && stats.opensCount > 0 
        ? Math.max(lead.opensCount || 0, stats.opensCount) 
        : (lead.opensCount || 0),
      firstOpenedDate: stats.firstOpenedDate || lead.firstOpenedDate || '',
      lastOpenedDate: stats.lastOpenedDate || lead.lastOpenedDate || '',
      clicksCount: stats.clicksCount !== undefined && stats.clicksCount > 0 
        ? Math.max(lead.clicksCount || 0, stats.clicksCount) 
        : (lead.clicksCount || 0),
      firstClickedDate: stats.firstClickedDate || lead.firstClickedDate || '',
      lastClickedDate: stats.lastClickedDate || lead.lastClickedDate || ''
    };
  });
}
