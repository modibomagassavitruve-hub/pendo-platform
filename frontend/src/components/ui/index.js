/**
 * PENDO UI Components
 * Premium reusable components for the PENDO financial platform
 */

import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

// ========================================
// BUTTON COMPONENT
// ========================================
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  style: extraStyle = {},
  ...props
}) => {
  const base = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    borderRadius: '10px',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.5 : 1,
    transition: 'all 0.2s',
    overflow: 'hidden',
  };

  const sizes = {
    sm: { padding: '0.4rem 0.85rem', fontSize: '0.8rem' },
    md: { padding: '0.6rem 1.25rem', fontSize: '0.875rem' },
    lg: { padding: '0.8rem 1.75rem', fontSize: '1rem' },
    xl: { padding: '1rem 2.25rem', fontSize: '1.1rem' },
  };

  const variants = {
    primary: { background: 'var(--ink)', color: 'var(--cream)' },
    secondary: { background: 'var(--forest)', color: 'var(--cream)' },
    accent: { background: 'var(--terracotta)', color: 'var(--cream)' },
    danger: { background: 'var(--terracotta)', color: 'var(--cream)' },
    ghost: { background: 'transparent', color: 'var(--ink-mute)', border: '1.5px solid rgba(26,20,16,0.12)' },
    outline: { background: 'transparent', color: 'var(--terracotta)', border: '2px solid var(--terracotta)' },
  };

  return (
    <button
      style={{ ...base, ...sizes[size], ...variants[variant], ...extraStyle }}
      disabled={disabled || loading}
      {...props}
    >
      {loading
        ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 0.8s linear infinite' }} />
        : (Icon && iconPosition === 'left' && <Icon style={{ width: '16px', height: '16px' }} />)
      }
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
      {!loading && Icon && iconPosition === 'right' && <Icon style={{ width: '16px', height: '16px' }} />}
    </button>
  );
};

// ========================================
// CARD COMPONENT
// ========================================
export const Card = ({
  children,
  padding = 'md',
  hover = true,
  style: extraStyle = {},
  ...props
}) => {
  const paddings = { none: 0, sm: '1rem', md: '1.5rem', lg: '2rem' };

  return (
    <div
      style={{
        background: 'var(--cream-glow)',
        border: '1.5px solid rgba(26,20,16,0.08)',
        borderRadius: '14px',
        padding: paddings[padding],
        transition: hover ? 'box-shadow 0.2s, transform 0.2s' : undefined,
        ...extraStyle,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// ========================================
// INPUT COMPONENT
// ========================================
export const Input = ({
  label,
  error,
  icon: Icon,
  style: extraStyle = {},
  ...props
}) => {
  const inputStyle = {
    width: '100%',
    padding: Icon ? '0.65rem 1rem 0.65rem 2.75rem' : '0.65rem 1rem',
    background: 'var(--cream-deep)',
    border: error ? '1.5px solid var(--terracotta)' : '1.5px solid rgba(26,20,16,0.12)',
    borderRadius: '10px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    color: 'var(--ink)',
    outline: 'none',
    boxSizing: 'border-box',
    ...extraStyle,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {label && (
        <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon style={{
            position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)',
            width: '18px', height: '18px', color: 'var(--ink-mute)',
          }} />
        )}
        <input style={inputStyle} {...props} />
      </div>
      {error && (
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--terracotta)' }}>
          <AlertCircle style={{ width: '14px', height: '14px' }} />{error}
        </p>
      )}
    </div>
  );
};

// ========================================
// BADGE COMPONENT
// ========================================
export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  style: extraStyle = {},
}) => {
  const variants = {
    default: { background: 'var(--cream-deep)', color: 'var(--ink-mute)', border: 'rgba(26,20,16,0.1)' },
    primary: { background: 'rgba(194,73,22,0.1)', color: 'var(--terracotta)', border: 'rgba(194,73,22,0.2)' },
    success: { background: 'rgba(30,77,58,0.1)', color: 'var(--forest)', border: 'rgba(30,77,58,0.2)' },
    warning: { background: 'rgba(232,170,11,0.12)', color: '#9A6E00', border: 'rgba(232,170,11,0.25)' },
    danger: { background: 'rgba(194,73,22,0.12)', color: 'var(--terracotta)', border: 'rgba(194,73,22,0.25)' },
    info: { background: 'rgba(30,77,58,0.08)', color: 'var(--forest)', border: 'rgba(30,77,58,0.15)' },
  };

  const sizes = {
    sm: { padding: '0.15rem 0.5rem', fontSize: '0.7rem' },
    md: { padding: '0.2rem 0.65rem', fontSize: '0.75rem' },
    lg: { padding: '0.3rem 0.85rem', fontSize: '0.82rem' },
  };

  const v = variants[variant];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      fontFamily: 'var(--font-mono)', fontWeight: 600,
      borderRadius: '999px',
      border: `1px solid ${v.border}`,
      background: v.background, color: v.color,
      ...sizes[size], ...extraStyle,
    }}>
      {dot && (
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: v.color, flexShrink: 0 }} />
      )}
      {children}
    </span>
  );
};

// ========================================
// ALERT COMPONENT
// ========================================
export const Alert = ({
  children,
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  style: extraStyle = {},
}) => {
  const variants = {
    info: { bg: 'rgba(30,77,58,0.08)', border: 'rgba(30,77,58,0.2)', icon: Info, iconColor: 'var(--forest)' },
    success: { bg: 'rgba(30,77,58,0.1)', border: 'rgba(30,77,58,0.25)', icon: CheckCircle, iconColor: 'var(--forest)' },
    warning: { bg: 'rgba(232,170,11,0.1)', border: 'rgba(232,170,11,0.25)', icon: AlertTriangle, iconColor: '#9A6E00' },
    danger: { bg: 'rgba(194,73,22,0.08)', border: 'rgba(194,73,22,0.2)', icon: AlertCircle, iconColor: 'var(--terracotta)' },
  };

  const cfg = variants[variant];
  const Icon = cfg.icon;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      padding: '0.85rem 1rem',
      borderRadius: '10px',
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      ...extraStyle,
    }}>
      <Icon style={{ width: '18px', height: '18px', color: cfg.iconColor, flexShrink: 0, marginTop: '1px' }} />
      <div style={{ flex: 1 }}>
        {title && (
          <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>{title}</h4>
        )}
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>{children}</div>
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', borderRadius: '6px', color: 'var(--ink-mute)' }}
        >
          <X style={{ width: '16px', height: '16px' }} />
        </button>
      )}
    </div>
  );
};

// ========================================
// SKELETON LOADER
// ========================================
export const Skeleton = ({
  width,
  height = '1rem',
  rounded = 'md',
  style: extraStyle = {},
}) => {
  const radii = { none: 0, sm: '4px', md: '8px', lg: '12px', full: '999px' };

  return (
    <div
      style={{
        background: 'var(--cream-deep)',
        borderRadius: radii[rounded],
        animation: 'pulse 1.5s ease-in-out infinite',
        width, height,
        ...extraStyle,
      }}
    />
  );
};

// ========================================
// STAT CARD COMPONENT
// ========================================
export const StatCard = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  trend,
  style: extraStyle = {},
}) => {
  const changeStyles = {
    positive: { color: 'var(--forest)', background: 'rgba(30,77,58,0.1)' },
    negative: { color: 'var(--terracotta)', background: 'rgba(194,73,22,0.08)' },
    neutral: { color: 'var(--ink-mute)', background: 'var(--cream-deep)' },
  };

  const trendColors = {
    positive: 'var(--forest)',
    negative: 'var(--terracotta)',
    neutral: 'var(--ink-mute)',
  };

  return (
    <Card padding="md" style={extraStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink-mute)', marginBottom: '0.3rem' }}>{title}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--ink)' }}>{value}</p>
          {change && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              marginTop: '0.5rem', padding: '0.2rem 0.65rem', borderRadius: '8px',
              fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8rem',
              ...changeStyles[changeType],
            }}>
              {change}
            </span>
          )}
        </div>
        {Icon && (
          <div style={{ padding: '0.65rem', background: 'rgba(194,73,22,0.08)', borderRadius: '10px' }}>
            <Icon style={{ width: '22px', height: '22px', color: 'var(--terracotta)' }} />
          </div>
        )}
      </div>
      {trend && (
        <div style={{ marginTop: '1rem', height: '4px', background: 'var(--cream-deep)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '999px',
            background: trendColors[changeType],
            width: `${Math.min(Math.abs(parseFloat(trend)), 100)}%`,
            transition: 'width 0.5s',
          }} />
        </div>
      )}
    </Card>
  );
};

// ========================================
// PROGRESS BAR
// ========================================
export const Progress = ({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  style: extraStyle = {},
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const variantColors = {
    primary: 'var(--terracotta)',
    secondary: 'var(--forest)',
    accent: 'var(--sun)',
    danger: 'var(--terracotta)',
  };

  const heights = { sm: '4px', md: '6px', lg: '10px' };

  return (
    <div style={extraStyle}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink-mute)', marginBottom: '0.4rem' }}>
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div style={{ background: 'var(--cream-deep)', borderRadius: '999px', overflow: 'hidden', height: heights[size] }}>
        <div style={{
          height: '100%', borderRadius: '999px',
          background: variantColors[variant],
          width: `${percentage}%`,
          transition: 'width 0.5s',
        }} />
      </div>
    </div>
  );
};

// ========================================
// AVATAR COMPONENT
// ========================================
export const Avatar = ({
  src,
  alt,
  name,
  size = 'md',
  status,
  style: extraStyle = {},
}) => {
  const sizes = { sm: '32px', md: '40px', lg: '48px', xl: '64px' };
  const fontSizes = { sm: '0.7rem', md: '0.82rem', lg: '0.95rem', xl: '1.15rem' };

  const statusColors = {
    online: 'var(--forest)',
    offline: 'var(--ink-mute)',
    busy: 'var(--terracotta)',
    away: 'var(--sun)',
  };

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '';

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...extraStyle }}>
      {src ? (
        <img
          src={src}
          alt={alt || name}
          style={{ width: sizes[size], height: sizes[size], borderRadius: '50%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: sizes[size], height: sizes[size], borderRadius: '50%',
          background: 'var(--terracotta)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontWeight: 700,
          fontSize: fontSizes[size], color: 'var(--cream)',
        }}>
          {initials}
        </div>
      )}
      {status && (
        <span style={{
          position: 'absolute', bottom: 0, right: 0,
          width: '10px', height: '10px',
          borderRadius: '50%',
          background: statusColors[status],
          border: '2px solid var(--cream)',
        }} />
      )}
    </div>
  );
};

// ========================================
// DIVIDER COMPONENT
// ========================================
export const Divider = ({
  orientation = 'horizontal',
  label,
  style: extraStyle = {},
}) => {
  if (orientation === 'vertical') {
    return (
      <div style={{
        width: '1px', height: '100%',
        background: 'linear-gradient(to bottom, transparent, rgba(26,20,16,0.1), transparent)',
        ...extraStyle,
      }} />
    );
  }

  if (label) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', ...extraStyle }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(26,20,16,0.1), transparent)' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink-mute)' }}>{label}</span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(26,20,16,0.1), transparent)' }} />
      </div>
    );
  }

  return (
    <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(26,20,16,0.1), transparent)', ...extraStyle }} />
  );
};

// ========================================
// TOOLTIP WRAPPER
// ========================================
export const Tooltip = ({
  children,
  content,
  position = 'top',
}) => {
  const positions = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' },
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={e => { const tip = e.currentTarget.querySelector('[data-tooltip]'); if (tip) { tip.style.opacity = 1; tip.style.visibility = 'visible'; } }}
      onMouseLeave={e => { const tip = e.currentTarget.querySelector('[data-tooltip]'); if (tip) { tip.style.opacity = 0; tip.style.visibility = 'hidden'; } }}
    >
      {children}
      <div
        data-tooltip
        style={{
          position: 'absolute', ...positions[position],
          padding: '0.4rem 0.75rem', borderRadius: '8px',
          background: 'var(--ink)', color: 'var(--cream)',
          fontFamily: 'var(--font-body)', fontSize: '0.78rem',
          border: '1px solid rgba(26,20,16,0.15)',
          opacity: 0, visibility: 'hidden',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap', zIndex: 50,
        }}
      >
        {content}
      </div>
    </div>
  );
};

export default {
  Button,
  Card,
  Input,
  Badge,
  Alert,
  Skeleton,
  StatCard,
  Progress,
  Avatar,
  Divider,
  Tooltip,
};
