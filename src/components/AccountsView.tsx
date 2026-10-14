import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Pause,
  Play,
  Send,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GmailAccount } from '../types';
import {
  PageHeader,
  ListCard,
  ListRow,
  Button,
  Input,
  StatusPill,
} from './ui/DesignSystem';

export const AccountsView: React.FC<{ onOpenAddAccount: () => void }> = ({ onOpenAddAccount }) => {
  const {
    accounts,
    updateAccount,
    deleteAccount,
  } = useApp();

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState<number>(50);
  const [editSentTodayValue, setEditSentTodayValue] = useState<number>(0);
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>('');

  // Test Email Modal
  const [testModalAccount, setTestModalAccount] = useState<GmailAccount | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Quick verify connection
  const [verifyingAccountId, setVerifyingAccountId] = useState<string | null>(null);
  const [quickVerifyResult, setQuickVerifyResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const startEditing = (acc: GmailAccount) => {
    setEditingAccountId(acc.id);
    setEditLimitValue(acc.dailyLimit);
    setEditSentTodayValue(acc.sentToday);
    setEditAvatarUrl(acc.avatar || '');
  };

  const saveEditing = (accId: string) => {
    updateAccount(accId, {
      dailyLimit: Math.max(1, Number(editLimitValue)),
      sentToday: Math.max(0, Number(editSentTodayValue)),
      avatar: editAvatarUrl.trim(),
    });
    setEditingAccountId(null);
  };

  const handleQuickVerify = async (acc: GmailAccount) => {
    if (!acc.smtpConfig) {
      setQuickVerifyResult({
        id: acc.id,
        success: false,
        message: 'No SMTP configuration attached to this mailbox.',
      });
      return;
    }

    setVerifyingAccountId(acc.id);
    setQuickVerifyResult(null);

    try {
      const res = await fetch('/api/email/verify-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: acc.smtpConfig.host,
          port: acc.smtpConfig.port,
          secure: acc.smtpConfig.secure,
          user: acc.smtpConfig.user,
          pass: acc.smtpConfig.pass,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        updateAccount(acc.id, {
          smtpConfig: {
            ...acc.smtpConfig,
            isVerified: true,
            lastVerifiedAt: Date.now(),
          },
        });
        setQuickVerifyResult({
          id: acc.id,
          success: true,
          message: 'SMTP handshake verified successfully.',
        });
      } else {
        setQuickVerifyResult({
          id: acc.id,
          success: false,
          message: data.error || 'SMTP handshake failed.',
        });
      }
    } catch (e: any) {
      setQuickVerifyResult({
        id: acc.id,
        success: false,
        message: e?.message || 'Verification request failed.',
      });
    } finally {
      setVerifyingAccountId(null);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testModalAccount || !testRecipient.trim()) return;

    if (!testModalAccount.smtpConfig) {
      setTestResult({
        success: false,
        message: 'Mailbox has no SMTP credentials attached.',
      });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/email/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: {
            host: testModalAccount.smtpConfig.host,
            port: testModalAccount.smtpConfig.port,
            secure: testModalAccount.smtpConfig.secure,
            user: testModalAccount.smtpConfig.user,
            pass: testModalAccount.smtpConfig.pass,
          },
          fromName: testModalAccount.senderName,
          fromEmail: testModalAccount.email,
          recipientEmail: testRecipient.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || `Test email dispatched to ${testRecipient.trim()}`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to dispatch test email.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Error occurred while dispatching test email.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 page-fade">
      {/* Top Header */}
      <PageHeader
        title="Email accounts"
        subtitle="Connected sending mailboxes for your automated cold outreach campaigns."
        action={
          <Button variant="primary" onClick={onOpenAddAccount}>
            <Plus className="h-4 w-4" />
            <span>Connect new account</span>
          </Button>
        }
      />

      {/* Accounts List: ONE Card wrapping the whole list, 1px dividers between rows */}
      {accounts.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">No accounts connected</p>
          <p className="text-[13px] text-[var(--text-secondary)]">Connect your sending email mailbox to start automated outreach.</p>
          <Button variant="primary" onClick={onOpenAddAccount} className="mt-2">
            <Plus className="h-4 w-4" />
            <span>Connect account</span>
          </Button>
        </div>
      ) : (
        <ListCard>
          {accounts.map((acc) => {
            const isEditing = editingAccountId === acc.id;
            const percentage = Math.min(100, Math.round((acc.sentToday / acc.dailyLimit) * 100));
            const hasSmtp = Boolean(acc.smtpConfig?.host && acc.smtpConfig?.pass);

            return (
              <ListRow key={acc.id} className="py-4">
                <div className="space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Account sender and avatar */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {acc.avatar && acc.avatar.trim() !== '' ? (
                        <img
                          src={acc.avatar}
                          alt={acc.senderName}
                          className="h-10 w-10 rounded-[10px] object-cover border border-[var(--border)] shrink-0"
                        />
                      ) : (
                        <div
                          className="h-10 w-10 rounded-[10px] flex items-center justify-center font-semibold text-sm text-[#0E1116] shrink-0"
                          style={{ backgroundColor: acc.color || 'var(--accent)' }}
                        >
                          {acc.senderName ? acc.senderName.slice(0, 2).toUpperCase() : acc.email.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[var(--text-primary)] leading-tight truncate">
                            {acc.senderName}
                          </span>

                          <StatusPill
                            variant={acc.status === 'active' ? 'success' : 'muted'}
                            label={acc.status === 'active' ? 'Active' : 'Paused'}
                          />

                          <span className="text-[12px] text-[var(--text-secondary)]">
                            {acc.provider === 'custom_smtp' ? 'Custom SMTP' : acc.provider}
                          </span>
                        </div>

                        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 truncate">
                          {acc.email}
                        </p>
                      </div>
                    </div>

                    {/* Middle: SMTP details and sending limits */}
                    <div className="flex items-center gap-6 text-[13px] text-[var(--text-secondary)] shrink-0">
                      <div>
                        <p className="text-[12px] text-[var(--text-secondary)]">Host server</p>
                        <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5 tabular-nums">
                          {hasSmtp ? `${acc.smtpConfig?.host}:${acc.smtpConfig?.port}` : 'Client simulated'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[12px] text-[var(--text-secondary)]">Sent today</p>
                        <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5 tabular-nums">
                          {acc.sentToday} / {acc.dailyLimit} ({percentage}%)
                        </p>
                      </div>

                      <div>
                        <p className="text-[12px] text-[var(--text-secondary)]">Warmup score</p>
                        <p className="text-sm font-medium text-[var(--success)] mt-0.5 tabular-nums">
                          {acc.warmupScore || 100}%
                        </p>
                      </div>
                    </div>

                    {/* Right: Inline Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {hasSmtp && (
                        <Button
                          variant="secondary"
                          onClick={() => handleQuickVerify(acc)}
                          disabled={verifyingAccountId === acc.id}
                          className="text-xs py-1.5 px-3"
                          title="Verify SMTP connection"
                        >
                          {verifyingAccountId === acc.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <span>Verify</span>
                          )}
                        </Button>
                      )}

                      {hasSmtp && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setTestModalAccount(acc);
                            setTestRecipient(acc.email);
                            setTestResult(null);
                          }}
                          className="text-xs py-1.5 px-3"
                          title="Send test email"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Test</span>
                        </Button>
                      )}

                      <button
                        onClick={() =>
                          updateAccount(acc.id, {
                            status: acc.status === 'active' ? 'paused' : 'active',
                          })
                        }
                        className="p-2 rounded-[10px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] transition-colors cursor-pointer"
                        title={acc.status === 'active' ? 'Pause account' : 'Resume account'}
                      >
                        {acc.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>

                      <button
                        onClick={() => startEditing(acc)}
                        className="p-2 rounded-[10px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] transition-colors cursor-pointer"
                        title="Edit limits"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      {accounts.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove account ${acc.email}?`)) {
                              deleteAccount(acc.id);
                            }
                          }}
                          className="p-2 rounded-[10px] text-[var(--text-secondary)] hover:text-rose-400 hover:bg-white/[0.04] transition-colors cursor-pointer"
                          title="Remove account"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Feedback on quick verify */}
                  {quickVerifyResult && quickVerifyResult.id === acc.id && (
                    <div className="flex items-center gap-2 p-2.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)]">
                      {quickVerifyResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-[var(--warning)] shrink-0" />
                      )}
                      <span>{quickVerifyResult.message}</span>
                    </div>
                  )}

                  {/* Inline edit panel if editing */}
                  {isEditing && (
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-3 space-y-3 mt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[13px] text-[var(--text-secondary)] mb-1 block">Sent today</label>
                          <Input
                            type="number"
                            value={editSentTodayValue}
                            onChange={(e) => setEditSentTodayValue(Number(e.target.value))}
                            className="py-1.5"
                          />
                        </div>
                        <div>
                          <label className="text-[13px] text-[var(--text-secondary)] mb-1 block">Daily limit</label>
                          <Input
                            type="number"
                            value={editLimitValue}
                            onChange={(e) => setEditLimitValue(Number(e.target.value))}
                            className="py-1.5"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[13px] text-[var(--text-secondary)] mb-1 block">Avatar URL (optional)</label>
                        <Input
                          type="url"
                          placeholder="https://... or empty for initials"
                          value={editAvatarUrl}
                          onChange={(e) => setEditAvatarUrl(e.target.value)}
                          className="py-1.5"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button variant="secondary" onClick={() => setEditingAccountId(null)}>
                          Cancel
                        </Button>
                        <Button variant="primary" onClick={() => saveEditing(acc.id)}>
                          Save changes
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </ListRow>
            );
          })}
        </ListCard>
      )}

      {/* Test Email Send Modal */}
      {testModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Send real test email</h3>
                <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">From {testModalAccount.email}</p>
              </div>
              <button
                onClick={() => setTestModalAccount(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <p className="text-[13px] text-[var(--text-secondary)]">
                Dispatches a live verification email through {testModalAccount.smtpConfig?.host} to test deliverability.
              </p>

              <div>
                <label className="block text-[13px] text-[var(--text-secondary)] mb-1">
                  Recipient email address
                </label>
                <Input
                  type="email"
                  required
                  placeholder="personal@example.com"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                />
              </div>

              {testResult && (
                <div className="p-3 rounded-[10px] border border-[var(--border)] text-xs flex items-center gap-2 text-[var(--text-primary)]">
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-[var(--warning)] shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <Button variant="secondary" type="button" onClick={() => setTestModalAccount(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSendingTest || !testRecipient.trim()}
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send test now</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
