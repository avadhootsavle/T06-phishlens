import React from 'react';
import { Verdict } from '../types';

interface RiskGaugeProps {
  score: number;
  verdict: Verdict;
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, verdict, size = 140 }) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const colorMap = {
    SAFE: '#10b981', // Emerald
    CAUTION: '#f59e0b', // Amber
    DANGER: '#ef4444', // Rose/Red
  };

  const currentColor = colorMap[verdict] || '#3b82f6';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-800/80"
          fill="transparent"
        />
        {/* Animated Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={currentColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          fill="transparent"
        />
      </svg>
      {/* Center Label */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold font-mono tracking-tight" style={{ color: currentColor }}>
          {score}
        </span>
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest -mt-0.5">
          / 100
        </span>
      </div>
    </div>
  );
};
