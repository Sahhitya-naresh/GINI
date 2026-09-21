import React, { useState, useEffect } from 'react';
import { createLeadsSpreadsheet } from '../services/sheetsService';
import { getLocalLeads, migrateLocalLeadsToSheet } from '../services/leadBackendService';
import { Lead } from '../types';
import { X, FileSpreadsheet, PlusCircle, Link, Check, AlertCircle, ExternalLink, Database } from 'lucide-react';

interface SheetConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  currentSpreadsheetId: string;
  currentSpreadsheetName: string;
  onConnected: (spreadsheetId: string, spreadsheetName: string) => void;
  onDisconnect?: () => void;
  onLeadsMigrated?: (leads: Lead[]) => void;
}

export const SheetConnectModal: React.FC<SheetConnectModalProps> = ({
  isOpen,
  onClose,
  token,
  currentSpreadsheetId,
  currentSpreadsheetName,
  onConnected,
  onDisconnect,
  onLeadsMigrated
}) => {
  if (!isOpen) return null;

  const [customInput, setCustomInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local leads migration state
  const [localLeadsCount, setLocalLeadsCount] = useState<number | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getLocalLeads()
      .then(leads => {
        if (isMounted) {
          setLocalLeadsCount(leads.length);
        }
      })
      .catch(err => {
        console.warn('Failed to check local leads for migration:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen, currentSpreadsheetId]);

  const handleMigrate = async () => {
    if (!token || !currentSpreadsheetId) {
      setError('Please ensure Google sign-in and a Sheet connection are active to migrate.');
      return;
    }
    setIsMigrating(true);
    setError(null);
    setMigrationSuccess(null);
    try {
      const result = await migrateLocalLeadsToSheet(token, currentSpreadsheetId);
      if (result.migratedCount > 0) {
        setMigrationSuccess(`Successfully migrated ${result.migratedCount} local lead${result.migratedCount === 1 ? '' : 's'} to your Google Sheet!`);
      } else {
        setMigrationSuccess('All local leads are already present in your connected Google Sheet.');
      }
      setLocalLeadsCount(0);
      if (onLeadsMigrated && result.leads.length > 0) {
        onLeadsMigrated(result.leads);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to migrate local leads to Google Sheet.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleCreateNew = async () => {
    if (!token) {
      setError('Please sign in with Google first.');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const result = await createLeadsSpreadsheet(token);
      onConnected(result.id, result.name);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create spreadsheet in Google Sheets');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    // Extract ID from full URL if provided (e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit)
    let extractedId = customInput.trim();
    const match = customInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      extractedId = match[1];
    }

    if (extractedId.length < 10) {
      setError('Please enter a valid Google Spreadsheet ID or URL.');
      return;
    }

    onConnected(extractedId, 'Connected Google Sheet');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div 
        id="sheet-connect-dialog"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Google Sheets Database</h2>
              <p className="text-xs text-slate-500">Single source of truth for leads & sequence tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Known limitation warning if no sheet is connected */}
          {!currentSpreadsheetId && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-950 block">Known Limitation — Local Data Loss on Restart</span>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  When no Google Sheet is connected, leads and campaigns are saved only to temporary local container files. In containerized environments without a persistent volume, any local edits will be reset on server restart. Connect or create a Google Sheet below to ensure full cloud persistence.
                </p>
              </div>
            </div>
          )}

          {/* Current Connection Status */}
          {currentSpreadsheetId && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-emerald-900 block">Currently Connected Sheet:</span>
                <p className="text-emerald-700 font-mono text-[11px] truncate max-w-xs">{currentSpreadsheetId}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${currentSpreadsheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-semibold underline"
                >
                  <span>Open Sheet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {onDisconnect && (
                  <button
                    type="button"
                    onClick={() => {
                      onDisconnect();
                      onClose();
                    }}
                    className="ml-2 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          )}

          {/* One-time "Migrate local leads to Sheet" Action */}
          {currentSpreadsheetId && ((localLeadsCount !== null && localLeadsCount > 0) || migrationSuccess) && (
            <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                  <Database className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-900">Migrate Local Leads to Google Sheet</h4>
                    {localLeadsCount !== null && localLeadsCount > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-200/70 text-amber-800 rounded-full">
                        {localLeadsCount} local {localLeadsCount === 1 ? 'lead' : 'leads'} found
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-800/80 mt-1 leading-relaxed">
                    Leads currently sitting in local storage can be copied directly to your connected Google Sheet so nothing gets lost. Existing leads in the Sheet will not be duplicated.
                  </p>
                </div>
              </div>

              {migrationSuccess ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{migrationSuccess}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleMigrate}
                  disabled={isMigrating || !token}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 border border-amber-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  {isMigrating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-amber-800/30 border-t-amber-800 rounded-full animate-spin" />
                      <span>Migrating local leads to Sheet...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5 text-amber-800" />
                      <span>Migrate local leads to Sheet</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Option 1: 1-Click Create New Sheet */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Option 1: 1-Click Auto-Setup New Sheet</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Creates a new spreadsheet in your Google Drive named <em>"Outreach Flow - Leads Database"</em> with all required columns, frozen headers, and sample leads.
                </p>
              </div>
            </div>

            <button
              onClick={handleCreateNew}
              disabled={isCreating || !token}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
            >
              {isCreating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating in Google Sheets...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Outreach Sheet in My Google Drive</span>
                </>
              )}
            </button>
            {!token && (
              <p className="text-[11px] text-amber-700">
                * Sign in with Google first to create sheets in your Drive.
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold">Or Connect Existing</span>
            </div>
          </div>

          {/* Option 2: Enter URL or ID */}
          <form onSubmit={handleConnectExisting} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Spreadsheet URL or Sheet ID:
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Link className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1abc.../edit"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customInput.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-40 rounded-lg shadow-2xs"
                >
                  Connect
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Columns required: Lead ID, Name, Email, Company, Pain Point(s), Current Stage, Status, Last Email Sent Date, Next Send Date, Thread ID, Notes.
            </p>
          </form>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
