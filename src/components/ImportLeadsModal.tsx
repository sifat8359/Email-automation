import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, Download, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ImportLeadsModalProps {
  campaignId?: string;
  onClose: () => void;
  onImported?: (count: number) => void;
}

export const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({
  campaignId,
  onClose,
  onImported,
}) => {
  const { campaigns, accounts, importCampaignLeads, bulkAddLeads } = useApp();

  const targetCampaign = campaignId
    ? campaigns.find((c) => c.id === campaignId)
    : campaigns[0];

  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [rawText, setRawText] = useState(
    `Email,First Name,Last Name,Company,Website,Title
aiden@retell.ai,Aiden,Vance,Retell AI,https://retellai.com,Founder & CEO
maya@langchain.dev,Maya,Lin,LangChain Ecosystem,https://langchain.com,VP Partnerships
carlos@posthog-data.org,Carlos,Gomez,PostHog Analytics,https://posthog.com,Product Lead
sophie@cal.com,Sophie,Laurent,Cal.com Scheduling,https://cal.com,Head of Growth`
  );

  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        setMode('paste'); // show parsed text for confirmation
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const sample = `Email,First Name,Last Name,Company,Website,Title\nsarah@stripe.com,Sarah,Jenkins,Stripe,https://stripe.com,VP Product\nalex@ramp.com,Alex,Torres,Ramp,https://ramp.com,Head of Finance`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'instantly_leads_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setError(null);
    try {
      const lines = rawText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        setError('Please provide at least one CSV row.');
        return;
      }

      // Check if line 0 is a header row
      const firstLineLower = lines[0].toLowerCase();
      const hasHeader =
        firstLineLower.includes('email') ||
        firstLineLower.includes('first') ||
        firstLineLower.includes('name') ||
        firstLineLower.includes('company');

      const dataRows = hasHeader ? lines.slice(1) : lines;

      if (dataRows.length === 0) {
        setError('No lead data rows found after header.');
        return;
      }

      const parsedLeads = dataRows.map((line) => {
        const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));

        // Smart column resolution: if first col contains '@', it's email!
        let email = '';
        let firstName = '';
        let lastName = '';
        let companyName = '';
        let website = '';
        let title = '';

        if (parts[0]?.includes('@')) {
          email = parts[0];
          firstName = parts[1] || 'Friend';
          lastName = parts[2] || '';
          companyName = parts[3] || 'Company';
          website = parts[4] || '';
          title = parts[5] || 'Founder';
        } else {
          firstName = parts[0] || 'Friend';
          lastName = parts[1] || '';
          email = parts[2] || `${firstName.toLowerCase()}@example.com`;
          companyName = parts[3] || 'Company';
          website = parts[4] || '';
          title = parts[5] || 'Executive';
        }

        if (!website && companyName) {
          website = `https://${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
        }

        return {
          firstName,
          lastName,
          email,
          companyName,
          website,
          title,
          status: 'ready_for_outreach' as const,
          assignedAccountId: targetCampaign?.assignedAccountId || accounts[0]?.id || '',
          sequenceId: `seq-${targetCampaign?.id || 'default'}`,
        };
      });

      if (targetCampaign) {
        importCampaignLeads(targetCampaign.id, parsedLeads);
      } else {
        bulkAddLeads(parsedLeads);
      }

      if (onImported) {
        onImported(parsedLeads.length);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to parse CSV lines');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#0f1423] border border-[#212b48] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1b233a] bg-[#0c101d]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Leads (CSV)</h2>
              <p className="text-xs text-zinc-400">
                Add leads to {targetCampaign ? `"${targetCampaign.name}"` : 'Campaign'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#182037] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('paste')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'paste'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#141b2c] text-zinc-400 hover:text-white border border-[#202944]'
                }`}
              >
                CSV Text / Paste
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('file');
                  fileInputRef.current?.click();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'file'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#141b2c] text-zinc-400 hover:text-white border border-[#202944]'
                }`}
              >
                Upload File (.csv)
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadSample}
              className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              <Download className="h-3 w-3" />
              <span>Sample CSV</span>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.txt"
            className="hidden"
          />

          {fileName && (
            <div className="p-2.5 rounded-xl bg-[#141c30] border border-[#222d4c] flex items-center justify-between text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                <span>Uploaded: <strong>{fileName}</strong></span>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold">Loaded</span>
            </div>
          )}

          {/* Textarea */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              LEAD DATA (COMMA-SEPARATED VALUES)
            </label>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl bg-[#090d16] border border-[#1b233a] text-xs text-zinc-200 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
              placeholder="Email, First Name, Last Name, Company, Website, Title"
            />
            <p className="text-[11px] text-zinc-500">
              Supported columns: Email, First Name, Last Name, Company, Website, Title. Automatic column detection applied.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1b233a] bg-[#0c101d]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Import Leads</span>
          </button>
        </div>
      </div>
    </div>
  );
};
