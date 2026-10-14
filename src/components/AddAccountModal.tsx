import React, { useState } from 'react';
import {
  X,
  Mail,
  Check,
  ShieldCheck,
  Server,
  KeyRound,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  HelpCircle,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SmtpConfig } from '../types';
import { Button, Input, StatusPill } from './ui/DesignSystem';

interface AddAccountModalProps {
  onClose: () => void;
}

type ProviderType = 'gmail' | 'outlook' | 'zoho' | 'custom_smtp';

interface ProviderPreset {
  id: ProviderType;
  name: string;
  defaultHost: string;
  defaultPort: number;
  defaultSecure: boolean;
  helpText: string;
  docUrl: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'gmail',
    name: 'Google / Workspace',
    defaultHost: 'smtp.gmail.com',
    defaultPort: 587,
    defaultSecure: false,
    helpText: 'Requires a 16-character Google App Password. 2-Step Verification must be enabled.',
    docUrl: 'https://myaccount.google.com/apppasswords',
  },
  {
    id: 'outlook',
    name: 'Microsoft 365 / Outlook',
    defaultHost: 'smtp.office365.com',
    defaultPort: 587,
    defaultSecure: false,
    helpText: 'Requires an App Password or SMTP AUTH enabled in Microsoft 365 Admin Center.',
    docUrl: 'https://mysignins.microsoft.com/security-info',
  },
  {
    id: 'zoho',
    name: 'Zoho Mail',
    defaultHost: 'smtp.zoho.com',
    defaultPort: 587,
    defaultSecure: false,
    helpText: 'Requires an Application-Specific Password generated from Zoho Security Settings.',
    docUrl: 'https://accounts.zoho.com/home#security/app_password',
  },
  {
    id: 'custom_smtp',
    name: 'Custom SMTP server',
    defaultHost: '',
    defaultPort: 587,
    defaultSecure: false,
    helpText: 'Enter your dedicated hosting or cold email domain SMTP credentials.',
    docUrl: '',
  },
];

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose }) => {
  const { addAccount } = useApp();

  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('gmail');
  const [email, setEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [host, setHost] = useState(PROVIDER_PRESETS[0].defaultHost);
  const [port, setPort] = useState(PROVIDER_PRESETS[0].defaultPort);
  const [secure, setSecure] = useState(PROVIDER_PRESETS[0].defaultSecure);
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [color, setColor] = useState('#5B8DEF');
  const [showHelp, setShowHelp] = useState(false);

  // Connection testing state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // IMAP connection testing state
  const [isVerifyingImap, setIsVerifyingImap] = useState(false);
  const [imapVerifyStatus, setImapVerifyStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Live test send state
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendStatus, setTestSendStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const colors = [
    '#5B8DEF',
    '#34D399',
    '#F5A623',
    '#A78BFA',
    '#F472B6',
    '#38BDF8',
  ];

  const currentPreset = PROVIDER_PRESETS.find((p) => p.id === selectedProvider) || PROVIDER_PRESETS[0];
  const isPresetActive = selectedProvider !== 'custom_smtp';

  const handleSelectProvider = (preset: ProviderPreset) => {
    setSelectedProvider(preset.id);
    setVerifyStatus(null);
    setTestSendStatus(null);

    if (preset.id !== 'custom_smtp') {
      setHost(preset.defaultHost);
      setPort(preset.defaultPort);
      setSecure(preset.defaultSecure);
    } else {
      if (!host || host === 'smtp.gmail.com' || host === 'smtp.office365.com' || host === 'smtp.zoho.com') {
        setHost('');
      }
    }
  };

  const handleToggleSecure = (checked: boolean) => {
    setSecure(checked);
    if (checked) {
      setPort(465);
    } else {
      setPort(587);
    }
  };

  const handleTestConnection = async () => {
    if (!email.trim() || !appPassword.trim()) {
      setVerifyStatus({
        success: false,
        message: 'Please enter your sending email address and App Password.',
      });
      return;
    }

    setIsVerifying(true);
    setVerifyStatus(null);

    try {
      const res = await fetch('/api/email/verify-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim() || currentPreset.defaultHost,
          port: Number(port) || currentPreset.defaultPort,
          secure,
          user: email.trim(),
          pass: appPassword.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyStatus({
          success: true,
          message: data.message || `SMTP handshake succeeded with ${host || currentPreset.defaultHost}:${port}`,
        });
      } else {
        setVerifyStatus({
          success: false,
          message: data.error || 'Authentication failed. Check your App Password and SMTP port.',
        });
      }
    } catch (err: any) {
      setVerifyStatus({
        success: false,
        message: err?.message || 'Failed to connect to backend verification service.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendLiveTestEmail = async () => {
    if (!testRecipientEmail.trim()) {
      setTestSendStatus({ success: false, message: 'Please enter a recipient email address.' });
      return;
    }

    setIsSendingTest(true);
    setTestSendStatus(null);

    try {
      const res = await fetch('/api/email/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: {
            host: host.trim(),
            port: Number(port) || 587,
            secure,
            user: email.trim(),
            pass: appPassword.trim(),
          },
          fromName: senderName.trim() || email.trim(),
          fromEmail: email.trim(),
          recipientEmail: testRecipientEmail.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestSendStatus({
          success: true,
          message: data.message || `Test email dispatched to ${testRecipientEmail}!`,
        });
      } else {
        setTestSendStatus({
          success: false,
          message: data.error || 'Failed to dispatch test email.',
        });
      }
    } catch (err: any) {
      setTestSendStatus({
        success: false,
        message: err?.message || 'Error executing test send.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleTestImapConnection = async () => {
    if (!email.trim() || !appPassword.trim()) {
      setImapVerifyStatus({
        success: false,
        message: 'Please enter your email address and App Password first.',
      });
      return;
    }

    setIsVerifyingImap(true);
    setImapVerifyStatus(null);

    const defaultImapHost =
      selectedProvider === 'gmail'
        ? 'imap.gmail.com'
        : selectedProvider === 'outlook'
        ? 'outlook.office365.com'
        : selectedProvider === 'zoho'
        ? 'imap.zoho.com'
        : host.trim();

    try {
      const res = await fetch('/api/email/verify-imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: defaultImapHost,
          port: 993,
          secure: true,
          user: email.trim(),
          pass: appPassword.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImapVerifyStatus({
          success: true,
          message: data.message || `IMAP connection verified on ${defaultImapHost}:993 (${data.totalMessages || 0} messages in INBOX).`,
        });
      } else {
        setImapVerifyStatus({
          success: false,
          message: data.error || 'Failed to authenticate via IMAP.',
        });
      }
    } catch (err: any) {
      setImapVerifyStatus({
        success: false,
        message: err?.message || 'Failed to connect to IMAP service.',
      });
    } finally {
      setIsVerifyingImap(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senderName.trim()) return;

    const defaultImapHost =
      selectedProvider === 'gmail'
        ? 'imap.gmail.com'
        : selectedProvider === 'outlook'
        ? 'outlook.office365.com'
        : selectedProvider === 'zoho'
        ? 'imap.zoho.com'
        : host.trim();

    const smtpConfig: SmtpConfig = {
      host: host.trim() || currentPreset.defaultHost,
      port: Number(port) || currentPreset.defaultPort,
      secure,
      user: email.trim().toLowerCase(),
      pass: appPassword.trim(),
      isVerified: verifyStatus?.success || false,
      lastVerifiedAt: verifyStatus?.success ? Date.now() : undefined,
      imapHost: defaultImapHost,
      imapPort: 993,
    };

    const imapConfig = {
      host: defaultImapHost,
      port: 993,
      secure: true,
      user: email.trim().toLowerCase(),
      pass: appPassword.trim(),
      isVerified: imapVerifyStatus?.success || false,
      lastSyncedAt: Date.now(),
    };

    addAccount({
      email: email.trim().toLowerCase(),
      senderName: senderName.trim(),
      avatar: avatarUrl.trim(),
      color,
      status: 'active',
      dailyLimit: Number(dailyLimit) || 50,
      warmupScore: 100,
      provider: selectedProvider,
      smtpConfig,
      imapConfig,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Connect real email mailbox</h2>
              <StatusPill variant="accent" label="SMTP standard" />
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
              Connect your domain or workspace mailbox using an App Password for authentic outbound delivery.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Provider Preset Selector */}
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-2">
              Select mailbox provider preset
            </label>
            {/* Provider Preset Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PROVIDER_PRESETS.map((preset) => {
                const isSelected = selectedProvider === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectProvider(preset)}
                    className={`p-3 rounded-[10px] text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-2 border-[var(--accent)] bg-[rgba(91,141,239,0.1)] text-[var(--text-primary)] shadow-[0_0_0_1px_rgba(91,141,239,0.25)]'
                        : 'border-2 border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--text-secondary)]/50 hover:text-[var(--text-primary)] hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <Mail className={`h-4 w-4 transition-colors ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
                    </div>
                    <span className="text-xs font-semibold leading-tight">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider Guidance Banner */}
          <div className="p-3.5 rounded-[10px] bg-white/[0.02] border border-[var(--border)] text-[13px] text-[var(--text-secondary)] flex items-start gap-2.5">
            <HelpCircle className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[var(--text-primary)]">{currentPreset.helpText}</p>
              {currentPreset.docUrl && (
                <a
                  href={currentPreset.docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline font-medium text-xs"
                >
                  <span>Generate App Password for {currentPreset.name}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Basic Sender Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] text-[var(--text-secondary)] mb-1">
                Sending email address *
              </label>
              <Input
                type="email"
                required
                placeholder="alex@yourcompany.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (!testRecipientEmail) setTestRecipientEmail(e.target.value);
                }}
              />
            </div>

            <div>
              <label className="block text-[13px] text-[var(--text-secondary)] mb-1">
                Display sender name *
              </label>
              <Input
                type="text"
                required
                placeholder="Alex Morgan"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />
            </div>
          </div>

          {/* SMTP Credentials & Connection Parameters */}
          <div className="p-4 rounded-[10px] bg-white/[0.02] border border-[var(--border)] space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>SMTP connection & credentials</span>
              </span>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
              >
                {showHelp ? 'Hide instructions' : 'What is an App Password?'}
              </button>
            </div>

            {showHelp && (
              <div className="p-3 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-1">
                <p className="font-semibold text-[var(--text-primary)]">How to generate an App Password:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-xs pl-1">
                  <li>Log in to your email provider account settings (Google, Microsoft, or Zoho).</li>
                  <li>Ensure 2-factor authentication (2FA) is turned on.</li>
                  <li>Search for App Passwords under security settings.</li>
                  <li>Create a new password and paste the generated code below.</li>
                </ol>
              </div>
            )}

            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[12px] text-[var(--text-secondary)]">
                      SMTP host server
                    </label>
                    {isPresetActive && (
                      <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" /> Locked
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      required
                      readOnly={isPresetActive}
                      tabIndex={isPresetActive ? -1 : 0}
                      placeholder={isPresetActive ? '' : 'mail.yourdomain.com'}
                      value={host}
                      onChange={(e) => {
                        if (!isPresetActive) setHost(e.target.value);
                      }}
                      className={isPresetActive ? 'opacity-70 cursor-not-allowed pr-9' : ''}
                    />
                    {isPresetActive && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[12px] text-[var(--text-secondary)]">
                      Port & encryption
                    </label>
                    {isPresetActive && (
                      <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" /> Fixed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Input
                        type="number"
                        required
                        readOnly={isPresetActive}
                        tabIndex={isPresetActive ? -1 : 0}
                        min={1}
                        max={65535}
                        value={port}
                        onChange={(e) => {
                          if (!isPresetActive) {
                            const val = Math.min(65535, Math.max(1, Number(e.target.value) || 1));
                            setPort(val);
                          }
                        }}
                        className={`w-20 tabular-nums ${isPresetActive ? 'opacity-70 cursor-not-allowed pr-6' : ''}`}
                      />
                      {isPresetActive && (
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
                          <Lock className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleSecure(!secure)}
                      className={`px-3 py-2 rounded-[8px] text-xs font-medium border-2 transition-all duration-150 cursor-pointer select-none flex items-center gap-1.5 ${
                        secure
                          ? 'border-[var(--accent)] bg-[rgba(91,141,239,0.12)] text-[var(--accent)]'
                          : 'border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]/50'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full transition-colors ${secure ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
                      <span>SSL (465)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Helper text under Host/Port row */}
              <div>
                {isPresetActive ? (
                  <p className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1.5 pt-0.5">
                    <Lock className="h-3 w-3 text-[var(--accent)] shrink-0" />
                    <span>
                      Auto-configured for <strong className="text-[var(--text-primary)] font-medium">{currentPreset.name}</strong> — switch to Custom SMTP to edit manually
                    </span>
                  </p>
                ) : (
                  <p className="text-[12px] text-[var(--text-secondary)] pt-0.5">
                    Enter your mail server hostname (e.g. mail.domain.com) and port (typically 587 or 465).
                  </p>
                )}
              </div>
            </div>

            {/* App Password input with visibility toggle */}
            <div>
              <label className="block text-[12px] text-[var(--text-secondary)] mb-1">
                App Password / SMTP password *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="16-character app password or mailbox credentials"
                  value={appPassword}
                  onChange={(e) => {
                    setAppPassword(e.target.value);
                    setVerifyStatus(null);
                  }}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Live Connection Test Buttons: SMTP & IMAP */}
            <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isVerifying || !email.trim() || !appPassword.trim()}
                  className="text-xs py-2 px-3.5"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Testing SMTP...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
                      <span>Test SMTP connection</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleTestImapConnection}
                  disabled={isVerifyingImap || !email.trim() || !appPassword.trim()}
                  className="text-xs py-2 px-3.5"
                >
                  {isVerifyingImap ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Testing IMAP...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Test IMAP inbound</span>
                    </>
                  )}
                </Button>
              </div>

              <span className="text-[12px] text-[var(--text-secondary)]">
                Handshakes tested over SSL/TLS
              </span>
            </div>

            {/* SMTP Test result status banner */}
            {verifyStatus && (
              <div className="p-3 rounded-[10px] border border-[var(--border)] text-xs flex items-center gap-2 text-[var(--text-primary)]">
                {verifyStatus.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-[var(--warning)]" />
                )}
                <span><strong>SMTP:</strong> {verifyStatus.message}</span>
              </div>
            )}

            {/* IMAP Test result status banner */}
            {imapVerifyStatus && (
              <div className="p-3 rounded-[10px] border border-[var(--border)] text-xs flex items-center gap-2 text-[var(--text-primary)]">
                {imapVerifyStatus.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-[var(--warning)]" />
                )}
                <span><strong>IMAP:</strong> {imapVerifyStatus.message}</span>
              </div>
            )}
          </div>

          {/* Optional: Send Real Test Email Section */}
          <div className="p-4 rounded-[10px] bg-white/[0.02] border border-[var(--border)] space-y-3">
            <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>Send live test email (optional)</span>
            </span>

            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="your-personal-email@domain.com"
                value={testRecipientEmail}
                onChange={(e) => setTestRecipientEmail(e.target.value)}
                className="flex-1 py-2"
              />
              <Button
                variant="secondary"
                type="button"
                onClick={handleSendLiveTestEmail}
                disabled={isSendingTest || !email.trim() || !appPassword.trim()}
                className="text-xs py-2 px-3.5 whitespace-nowrap"
              >
                {isSendingTest ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Send test</span>
              </Button>
            </div>

            {testSendStatus && (
              <div className="p-2.5 rounded-[10px] border border-[var(--border)] text-xs flex items-center gap-2 text-[var(--text-primary)]">
                {testSendStatus.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-[var(--warning)]" />
                )}
                <span>{testSendStatus.message}</span>
              </div>
            )}
          </div>

          {/* Daily Limit and Customization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] text-[var(--text-secondary)] mb-1">
                Daily sending limit
              </label>
              <Input
                type="number"
                min={5}
                max={500}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="tabular-nums"
              />
              <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                Recommended: 40-50/day per mailbox to protect reputation.
              </p>
            </div>

            <div>
              <label className="block text-[13px] text-[var(--text-secondary)] mb-1">
                Avatar color
              </label>
              <div className="flex items-center gap-2 pt-1">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full transition-all duration-150 cursor-pointer ${
                      color === c
                        ? 'ring-2 ring-offset-2 ring-offset-[#171B22] ring-[var(--accent)] scale-110'
                        : 'border border-[var(--border)] opacity-80 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
            <span className="text-[12px] text-[var(--text-secondary)]">
              {verifyStatus?.success ? 'SMTP handshake passed' : 'Ready to connect'}
            </span>

            <div className="flex items-center gap-2.5">
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                <Check className="h-4 w-4" />
                <span>Save and connect mailbox</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
