import React, { useState } from 'react';
import { X, UserPlus, Globe, Building2, Mail, Briefcase } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AddLeadModalProps {
  campaignId?: string;
  onClose: () => void;
  onAdded?: () => void;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  campaignId,
  onClose,
  onAdded,
}) => {
  const { campaigns, accounts, importCampaignLeads, addLead } = useApp();

  const targetCampaign = campaignId
    ? campaigns.find((c) => c.id === campaignId)
    : campaigns[0];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [title, setTitle] = useState('');
  const [assignedAccountId, setAssignedAccountId] = useState(
    targetCampaign?.assignedAccountId || accounts[0]?.id || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || !companyName.trim()) return;

    const newLeadData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      companyName: companyName.trim(),
      website: website.trim() || `https://${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
      title: title.trim() || 'Executive',
      status: 'ready_for_outreach' as const,
      assignedAccountId,
      sequenceId: `seq-${targetCampaign?.id || 'default'}`,
    };

    if (targetCampaign) {
      importCampaignLeads(targetCampaign.id, [newLeadData]);
    } else {
      addLead(newLeadData);
    }

    if (onAdded) {
      onAdded();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#0f1423] border border-[#212b48] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1b233a] bg-[#0c101d]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Target Prospect</h2>
              <p className="text-xs text-zinc-400">
                Adding to {targetCampaign ? `"${targetCampaign.name}"` : 'Campaign'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                placeholder="Marcus"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                placeholder="Chen"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Work Email *
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="marcus@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Company Name *
              </label>
              <div className="relative">
                <Building2 className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Stripe"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Website
              </label>
              <div className="relative">
                <Globe className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="https://stripe.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Job Title
            </label>
            <div className="relative">
              <Briefcase className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Head of Growth"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Sending Account
            </label>
            <select
              value={assignedAccountId}
              onChange={(e) => setAssignedAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1b233a] text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.senderName} ({acc.email})
                </option>
              ))}
            </select>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b233a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Add Prospect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
