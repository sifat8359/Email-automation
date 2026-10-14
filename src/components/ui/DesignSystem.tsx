import React from 'react';

// 1. Universal Card
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-4 sm:p-[18px] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// 2. Universal List Container (ONE card wrapping the whole list, 1px dividers between rows)
export interface ListCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const ListCard: React.FC<ListCardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-[14px] overflow-hidden divide-y divide-[var(--border)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// 3. Universal Row for Lists
export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const ListRow: React.FC<ListRowProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`py-3.5 px-4 sm:px-[18px] transition-colors duration-150 hover:bg-white/[0.02] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// 4. Universal Button (Primary: accent background, dark text; Secondary: transparent, 1px border)
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-[10px] py-[9px] px-4 text-sm font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variantClasses =
    variant === 'primary'
      ? 'bg-[var(--accent)] text-[#0E1116] hover:brightness-92 border-none font-semibold'
      : 'bg-transparent border border-[var(--border)] text-[var(--text-primary)] hover:bg-white/[0.04] font-medium';

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// 5. Universal Input Field
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full bg-[var(--surface)] border border-[var(--border)] rounded-[10px] py-2.5 px-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/70 focus:border-[var(--accent)] focus:outline-none transition-colors duration-150 ${className}`}
      {...props}
    />
  );
};

// 6. Universal Status Indicator Pill (12% opacity background, full status color text, 8px radius)
export type StatusVariant = 'success' | 'warning' | 'muted' | 'accent';

export interface StatusPillProps {
  variant?: StatusVariant;
  label: string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  variant = 'muted',
  label,
  className = '',
}) => {
  const colorMap: Record<StatusVariant, { bg: string; text: string }> = {
    success: { bg: 'rgba(52, 211, 153, 0.12)', text: 'var(--success)' },
    warning: { bg: 'rgba(245, 166, 35, 0.12)', text: 'var(--warning)' },
    muted: { bg: 'rgba(138, 147, 163, 0.12)', text: 'var(--muted)' },
    accent: { bg: 'rgba(91, 141, 239, 0.12)', text: 'var(--accent)' },
  };

  const style = colorMap[variant] || colorMap.muted;

  return (
    <span
      style={{ backgroundColor: style.bg, color: style.text }}
      className={`inline-flex items-center justify-center py-1 px-2.5 rounded-[8px] text-xs font-medium leading-none select-none ${className}`}
    >
      {label}
    </span>
  );
};

// 7. Page Header Component (24px / 600, 13px secondary text, max 1 primary button)
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 ${className}`}>
      <div>
        <h1 className="text-[24px] font-semibold text-[var(--text-primary)] tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] font-normal text-[var(--text-secondary)] mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2.5 shrink-0">{action}</div>}
    </div>
  );
};

// 8. Section Header Component (16px / 600)
export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div>
        <h2 className="text-[16px] font-semibold text-[var(--text-primary)] tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[13px] font-normal text-[var(--text-secondary)] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};

// 9. Universal Stat Card (no decorative icons, tabular numerals, sentence case)
export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  className = '',
}) => {
  return (
    <Card className={className}>
      <p className="text-[13px] font-normal text-[var(--text-secondary)] leading-none">
        {label}
      </p>
      <p className="text-[24px] font-semibold text-[var(--text-primary)] mt-2 leading-tight tabular-nums">
        {value}
      </p>
      {subtext && (
        <p className="text-[13px] font-normal text-[var(--text-secondary)] mt-1.5 leading-none">
          {subtext}
        </p>
      )}
    </Card>
  );
};

// 10. Shimmer Skeleton Component (1.4s sweep, linear-gradient)
export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-5 w-full' }) => {
  return <div className={`skeleton-shimmer ${className}`} />;
};
