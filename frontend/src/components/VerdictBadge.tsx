import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { Verdict } from '../types';

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict, size = 'md' }) => {
  const configs = {
    SAFE: {
      label: 'Safe',
      icon: CheckCircle2,
      style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    CAUTION: {
      label: 'Caution',
      icon: AlertTriangle,
      style: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    DANGER: {
      label: 'Danger',
      icon: AlertOctagon,
      style: 'bg-red-50 text-red-800 border-red-200',
    },
  };

  const current = configs[verdict] || configs.CAUTION;
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs space-x-1 font-medium',
    md: 'px-2.5 py-1 text-xs space-x-1.5 font-semibold',
    lg: 'px-3.5 py-1.5 text-sm space-x-2 font-bold tracking-wide',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border uppercase tracking-wider font-mono ${current.style} ${sizeClasses[size]}`}
    >
      <Icon className={iconSizes[size]} />
      <span>{current.label}</span>
    </span>
  );
};
