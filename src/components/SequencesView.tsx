import React, { useState } from 'react';
import {
  GitMerge,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
  Sliders,
  Check,
  Code,
  Eye,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SequenceStep, TriggerCondition } from '../types';
import { renderTemplate } from '../utils/templateEngine';

export const SequencesView: React.FC = () => {
  const { sequence, timingSettings, updateSequence, updateTimingSettings, leads, accounts } =
    useApp();

  const [activeStepId, setActiveStepId] = useState<string>(sequence.steps[0]?.id || 'step-1');
  const [previewLeadIndex, setPreviewLeadIndex] = useState(0);

  const activeStep = sequence.steps.find((s: SequenceStep) => s.id === activeStepId) || sequence.steps[0];
  const sampleLead = leads[previewLeadIndex] || leads[0];
  const sampleAccount = accounts[0];

  const handleUpdateActiveStep = (updates: Partial<SequenceStep>) => {
    const updatedSteps = sequence.steps.map((s: SequenceStep) => (s.id === activeStep.id ? { ...s, ...updates } : s));
    updateSequence({ steps: updatedSteps });
  };

  const handleAddStep = () => {
    const newStepNumber = sequence.steps.length + 1;
    const newStep: SequenceStep = {
      id: 'step-' + Date.now(),
      stepNumber: newStepNumber,
      type: 'auto_followup',
      delayAmount: 1, // Can even be 1 minute!
      delayUnit: 'minutes',
      subject: `Re: Quick question about {{companyName}}`,
      body: `Hi {{firstName}},\n\nWanted to check if you had a chance to look over my previous note regarding {{companyName}}?\n\nBest,\n{{senderName}}`,
      triggerCondition: 'no_reply',
    };

    updateSequence({ steps: [...sequence.steps, newStep] });
    setActiveStepId(newStep.id);
  };

  const handleDeleteStep = (id: string) => {
    if (sequence.steps.length <= 1) return;
    const filtered = sequence.steps.filter((s: SequenceStep) => s.id !== id);
    const renumbered = filtered.map((s: SequenceStep, idx: number) => ({ ...s, stepNumber: idx + 1 }));
    updateSequence({ steps: renumbered });
    setActiveStepId(renumbered[0]?.id || '');
  };

  const triggerOptions: Array<{ id: TriggerCondition; label: string; desc: string }> = [
    {
      id: 'no_reply',
      label: 'If No Reply (Recommended)',
      desc: 'Send follow-up automatically only if recipient has not replied.',
    },
    {
      id: 'opened_no_reply',
      label: 'If Opened but No Reply',
      desc: 'Target engaged leads who opened your email but did not respond.',
    },
    {
      id: 'clicked_no_reply',
      label: 'If Link Clicked but No Reply',
      desc: 'High intent: Send follow-up only if the lead clicked the link on website.',
    },
    {
      id: 'always',
      label: 'Always Send',
      desc: 'Send regardless of opens or clicks, provided no reply was sent.',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sequence Header & Deliverability Settings */}
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">{sequence.name}</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              {sequence.steps.length} Steps Sequence
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">{sequence.description}</p>
        </div>

        {/* Quick Deliverability Overview */}
        <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl text-xs">
          <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
          <div>
            <p className="text-zinc-300 font-medium">Randomized Interval Dispatch</p>
            <p className="text-zinc-500 text-[11px]">
              Range:{' '}
              <span className="text-amber-400 font-semibold font-mono">
                {timingSettings.testModeFastInterval
                  ? '6s - 14s (Fast Demo)'
                  : `${Math.floor(timingSettings.minIntervalSeconds / 60)}m - ${Math.floor(
                      timingSettings.maxIntervalSeconds / 60
                    )}m`}
              </span>{' '}
              before each email
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Sequence Steps Pipeline */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">
              Sequence Steps Pipeline
            </span>
            <button
              onClick={handleAddStep}
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Follow-up</span>
            </button>
          </div>

          <div className="space-y-2">
            {sequence.steps.map((step: SequenceStep, idx: number) => {
              const isSelected = step.id === activeStep.id;
              const isManualFirst = (step.type as string) === 'initial_outreach' || (step.type as string) === 'manual_outreach' || idx === 0;

              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStepId(step.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-zinc-900 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-zinc-950/50 border-zinc-800/80 hover:border-zinc-700/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-6 w-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          isManualFirst
                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {step.stepNumber}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {isManualFirst ? 'Step 1: First Outreach (Manual)' : `Follow-up #${idx}`}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                          {step.subject}
                        </p>
                      </div>
                    </div>

                    {!isManualFirst && sequence.steps.length > 2 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStep(step.id);
                        }}
                        className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Delay & Trigger Tag */}
                  <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                    {isManualFirst ? (
                      <span className="text-indigo-400 font-medium">Trigger: Sent manually by you</span>
                    ) : (
                      <span className="text-amber-400 font-mono font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Delay: {step.delayAmount} {step.delayUnit}
                      </span>
                    )}

                    {!isManualFirst && (
                      <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-400">
                        {step.triggerCondition}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Random Deliverability Settings Card */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 shadow-sm space-y-3 mt-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Sliders className="h-4 w-4 text-indigo-400" />
              <span>Random Delay &amp; Throttle Config</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Interval Range Before Auto-Dispatch:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500">Min Delay (sec):</span>
                  <input
                    type="number"
                    min={10}
                    max={600}
                    step={10}
                    value={timingSettings.minIntervalSeconds}
                    onChange={(e) =>
                      updateTimingSettings({ minIntervalSeconds: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono"
                  />
                  <span className="text-[10px] text-zinc-500">
                    ≈ {Math.floor(timingSettings.minIntervalSeconds / 60)} min
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500">Max Delay (sec):</span>
                  <input
                    type="number"
                    min={30}
                    max={1200}
                    step={10}
                    value={timingSettings.maxIntervalSeconds}
                    onChange={(e) =>
                      updateTimingSettings({ maxIntervalSeconds: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono"
                  />
                  <span className="text-[10px] text-zinc-500">
                    ≈ {Math.floor(timingSettings.maxIntervalSeconds / 60)} min
                  </span>
                </div>
              </div>
            </div>

            {/* Fast Demo toggle */}
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-medium text-white">Test Mode (Fast 6-14s Jitter)</p>
                <p className="text-[10px] text-zinc-500">Speeds up dispatch for demonstration</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateTimingSettings({ testModeFastInterval: !timingSettings.testModeFastInterval })
                }
                className={`px-2.5 py-1 rounded-[8px] text-xs font-medium border-2 transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                  timingSettings.testModeFastInterval
                    ? 'border-[var(--accent)] bg-[rgba(91,141,239,0.15)] text-[var(--accent)]'
                    : 'border-[var(--border)] text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className={`h-2 w-2 rounded-full transition-colors ${timingSettings.testModeFastInterval ? 'bg-[var(--accent)]' : 'bg-zinc-600'}`} />
                <span>{timingSettings.testModeFastInterval ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (8 cols): Step Editor & Dynamic Preview */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-2">
              <div>
                <h3 className="text-base font-bold text-white">
                  {activeStep.stepNumber === 1
                    ? 'Step 1: First Outreach Template (Manual)'
                    : `Follow-up Step #${activeStep.stepNumber}`}
                </h3>
                <p className="text-xs text-zinc-400">
                  {activeStep.stepNumber === 1
                    ? 'You will review and send this first email manually for each prospect.'
                    : 'Dispatches automatically once the scheduled interval & trigger condition are met.'}
                </p>
              </div>

              {/* Sample preview lead switcher */}
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                <span>Preview with:</span>
                <select
                  value={previewLeadIndex}
                  onChange={(e) => setPreviewLeadIndex(Number(e.target.value))}
                  className="bg-transparent text-white font-medium focus:outline-none"
                >
                  {leads.map((l, i) => (
                    <option key={l.id} value={i} className="bg-zinc-900 text-white">
                      {l.firstName} ({l.companyName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* If follow-up, show Delay & Trigger Condition inputs */}
            {activeStep.stepNumber > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                {/* Delay interval: supports 1 minute as requested! */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Send Follow-up Delay:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={activeStep.delayAmount}
                      onChange={(e) =>
                        handleUpdateActiveStep({ delayAmount: Math.max(1, Number(e.target.value)) })
                      }
                      className="w-20 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={activeStep.delayUnit}
                      onChange={(e) =>
                        handleUpdateActiveStep({ delayUnit: e.target.value as any })
                      }
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="minutes">Minute(s) [e.g. 1 min]</option>
                      <option value="hours">Hour(s)</option>
                      <option value="days">Day(s)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Set 1 minute for rapid sequence or days for standard cadence.
                  </p>
                </div>

                {/* Specific Trigger condition */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Specific Trigger Condition:
                  </label>
                  <select
                    value={activeStep.triggerCondition}
                    onChange={(e) =>
                      handleUpdateActiveStep({
                        triggerCondition: e.target.value as TriggerCondition,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {triggerOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {triggerOptions.find((t) => t.id === activeStep.triggerCondition)?.desc}
                  </p>
                </div>
              </div>
            )}

            {/* Quick variable tags */}
            <div>
              <span className="text-xs text-zinc-400 mb-1 block">Insert Variables:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '{{firstName}}',
                  '{{lastName}}',
                  '{{companyName}}',
                  '{{website}}',
                  '{{title}}',
                  '{{senderName}}',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      handleUpdateActiveStep({
                        body: activeStep.body + ` ${tag}`,
                      })
                    }
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono border border-zinc-700 cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Subject Line:
              </label>
              <input
                type="text"
                value={activeStep.subject}
                onChange={(e) => handleUpdateActiveStep({ subject: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            {/* Body Editor */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Email Body:
              </label>
              <textarea
                rows={7}
                value={activeStep.body}
                onChange={(e) => handleUpdateActiveStep({ body: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono resize-none leading-relaxed"
              />
            </div>

            {/* Live Rendered Preview Box */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-2 border-b border-zinc-800">
                <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                  <Eye className="h-3 w-3" />
                  Live Rendered Preview (As Recipient Sees It):
                </span>
                <span>Recipient: {sampleLead.email}</span>
              </div>
              <div className="text-xs font-semibold text-white">
                Subject: {renderTemplate(activeStep.subject, sampleLead, sampleAccount)}
              </div>
              <div className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed pt-1">
                {renderTemplate(activeStep.body, sampleLead, sampleAccount)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
