import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { GeminiThreatAdvisor } from '../types';

interface GeminiAdvisorCardProps {
  advisor?: GeminiThreatAdvisor;
}

export const GeminiAdvisorCard: React.FC<GeminiAdvisorCardProps> = ({ advisor }) => {
  if (!advisor) return null;

  const isMalicious = advisor.threatLevel === 'MALICIOUS' || !advisor.isLegitimateDomain;
  const isSuspicious = advisor.threatLevel === 'SUSPICIOUS';

  return (
    <div
      className={`p-5 rounded-xl border transition-colors ${
        isMalicious
          ? 'bg-red-50/60 border-red-200 text-red-950'
          : isSuspicious
          ? 'bg-amber-50/60 border-amber-200 text-amber-950'
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
              Heuristic Threat Assessment
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Gemini 3.8 Flash
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-900">
            Semantic Deception Analysis
          </p>
        </div>

        <span
          className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
            isMalicious
              ? 'bg-red-100 text-red-800'
              : isSuspicious
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {advisor.threatLevel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
        <div className="p-3 rounded-lg bg-white border border-slate-200">
          <span className="text-slate-500 block mb-1">Target Entity</span>
          <span className="font-semibold text-slate-900">
            {advisor.apparentBrand ? advisor.apparentBrand : 'No specific brand targeted'}
          </span>
          {advisor.legitimateOfficialDomain && (
            <span className="text-[11px] text-slate-600 block mt-0.5 font-mono">
              Official: {advisor.legitimateOfficialDomain}
            </span>
          )}
        </div>

        <div className="p-3 rounded-lg bg-white border border-slate-200">
          <span className="text-slate-500 block mb-1">Domain Legitimate</span>
          <span className="font-semibold">
            {advisor.isLegitimateDomain ? (
              <span className="text-emerald-700">Official Web Property</span>
            ) : (
              <span className="text-red-700">Unofficial / Imitation</span>
            )}
          </span>
        </div>
      </div>

      {advisor.socialEngineeringTactics && advisor.socialEngineeringTactics.length > 0 && (
        <div className="mb-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-mono text-slate-600 uppercase tracking-wider block mb-1.5">
            Social Engineering Indicators:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {advisor.socialEngineeringTactics.map((tactic, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-800"
              >
                {tactic}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed mb-3">
        <span className="font-semibold block mb-0.5 text-slate-900">Analysis Summary:</span>
        {advisor.summaryExplanation}
      </div>

      {advisor.actionableAdvice && (
        <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800 flex items-start space-x-2">
          <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 block mb-0.5">Recommended Action:</span>
            <span>{advisor.actionableAdvice}</span>
          </div>
        </div>
      )}
    </div>
  );
};
