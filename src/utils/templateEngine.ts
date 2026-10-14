import { Lead, GmailAccount } from '../types';

export function renderTemplate(template: string, lead: Partial<Lead>, account?: Partial<GmailAccount>): string {
  let output = template;
  
  const firstName = lead.firstName || 'there';
  const lastName = lead.lastName || '';
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'there';
  const companyName = lead.companyName || 'your company';
  const website = lead.website ? cleanWebsiteUrl(lead.website) : 'your website';
  const title = lead.title || 'Leader';
  const senderName = account?.senderName || 'Alex Rivers';
  const senderEmail = account?.email || 'outreach@domain.com';

  output = output.replace(/{{\s*firstName\s*}}/gi, firstName);
  output = output.replace(/{{\s*lastName\s*}}/gi, lastName);
  output = output.replace(/{{\s*name\s*}}/gi, fullName);
  output = output.replace(/{{\s*companyName\s*}}/gi, companyName);
  output = output.replace(/{{\s*company\s*}}/gi, companyName);
  output = output.replace(/{{\s*website\s*}}/gi, website);
  output = output.replace(/{{\s*title\s*}}/gi, title);
  output = output.replace(/{{\s*senderName\s*}}/gi, senderName);
  output = output.replace(/{{\s*senderEmail\s*}}/gi, senderEmail);

  return output;
}

export function cleanWebsiteUrl(url: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function ensureValidUrl(url: string): string {
  if (!url) return '#';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export function formatTimeRemaining(targetTimestampMs: number | null): {
  isDue: boolean;
  text: string;
  secondsRemaining: number;
  secondsOverdue: number;
} {
  if (!targetTimestampMs) {
    return { isDue: false, text: 'No schedule', secondsRemaining: 0, secondsOverdue: 0 };
  }

  const now = Date.now();
  const diffMs = targetTimestampMs - now;

  if (diffMs <= 0) {
    const overdueSec = Math.floor(Math.abs(diffMs) / 1000);
    if (overdueSec < 60) {
      return { isDue: true, text: `Due ${overdueSec}s ago`, secondsRemaining: 0, secondsOverdue: overdueSec };
    }
    const mins = Math.floor(overdueSec / 60);
    const secs = overdueSec % 60;
    if (mins < 60) {
      return { isDue: true, text: `Due ${mins}m ${secs}s ago`, secondsRemaining: 0, secondsOverdue: overdueSec };
    }
    const hours = Math.floor(mins / 60);
    return { isDue: true, text: `Due ${hours}h ago`, secondsRemaining: 0, secondsOverdue: overdueSec };
  }

  const remSec = Math.ceil(diffMs / 1000);
  if (remSec < 60) {
    return { isDue: false, text: `Due in ${remSec}s`, secondsRemaining: remSec, secondsOverdue: 0 };
  }
  const mins = Math.floor(remSec / 60);
  const secs = remSec % 60;
  if (mins < 60) {
    return { isDue: false, text: `Due in ${mins}m ${secs}s`, secondsRemaining: remSec, secondsOverdue: 0 };
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return { isDue: false, text: `Due in ${hours}h ${remainingMins}m`, secondsRemaining: remSec, secondsOverdue: 0 };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatFullDate(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
