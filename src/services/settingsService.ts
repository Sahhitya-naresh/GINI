import { AppSettings } from '../types';

const SETTINGS_STORAGE_KEY = 'outreach_flow_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  spreadsheetId: '',
  spreadsheetName: '',
  spreadsheetUrl: '',
  defaultGapDays: 3,
  stageGapDays: {
    1: 3,
    2: 3,
    3: 3,
    4: 3,
    5: 3,
    6: 3,
    7: 3
  },
  skipWeekends: true,
  senderName: 'Alex from GINI Outreach Flow',
  senderEmail: '',
  customLogoUrl: ''
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        stageGapDays: {
          ...DEFAULT_SETTINGS.stageGapDays,
          ...(parsed.stageGapDays || {})
        }
      };
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}
