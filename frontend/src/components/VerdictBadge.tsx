import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Verdict } from '../types';

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict, size = 'md' }) => {
  const configs = {
    SAFE: {
      label: 'SAFE',
      icon: ShieldCheck,
      bg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
      glow: 'shadow-glow-safe',
    },
    CAUTION: {
      label: 'CAUTION',
      icon: AlertTriangle,
      bg: 'bg-amber-500/10 border-amber-500/40 text-amber-400',
      glow: 'shadow-glow-caution',
    },
    DANGER: {
      label: 'DANGER',
      icon: ShieldAlert,
      bg: 'bg-rose-500/10 border-rose-500/40 text-rose-400',
      glow: 'shadow-glow-danger animate-pulse-subtle',
    },
  };

  const current = configs[verdict] || configs.CAUTION;
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs space-x-1.5',
    md: 'px-3 py-1.5 text-sm space-x-2',
    lg: 'px-5 py-2.5 text-lg font-bold space-x-2.5 tracking-wider',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  return (
    <div
      className={`inline-flex items-center font-mono font-bold uppercase rounded-full border shadow-lg ${current.bg} ${current.glow} ${sizeClasses[size]}`}
    >
      <Icon className={iconSizes[size]} />
      <span>{current.label}</span>
    </div>
  );
};
