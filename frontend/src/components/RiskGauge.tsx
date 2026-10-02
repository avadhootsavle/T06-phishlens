import React from 'react';
import { Verdict } from '../types';

interface RiskGaugeProps {
  score: number;
  verdict: Verdict;
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, verdict, size = 120 }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const colorMap = {
    SAFE: '#16a34a', // Emerald 600
    CAUTION: '#d97706', // Amber 600
    DANGER: '#dc2626', // Red 600
  };

  const strokeColor = colorMap[verdict] || '#475569';

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          fill="transparent"
        />
      </svg>
      {/* Center Label */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
          {score}
        </span>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          Score
        </span>
      </div>
    </div>
  );
};
