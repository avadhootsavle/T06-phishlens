import React from 'react';
import { Sparkles, ShieldAlert, CheckCircle, AlertTriangle, Lightbulb, Compass } from 'lucide-react';
import { GeminiThreatAdvisor } from '../types';

interface GeminiAdvisorCardProps {
  advisor?: GeminiThreatAdvisor;
}

export const GeminiAdvisorCard: React.FC<GeminiAdvisorCardProps> = ({ advisor }) => {
  if (!advisor) return null;

  const isMalicious = advisor.threatLevel === 'MALICIOUS' || !advisor.isLegitimateDomain;
  const isSuspicious = advisor.threatLevel === 'SUSPICIOUS';

  return (
    <div className={`p-5 rounded-2xl glass-card border transition-all ${
      isMalicious
        ? 'border-indigo-500/50 bg-indigo-950/20 shadow-lg shadow-indigo-500/10'
        : isSuspicious
        ? 'border-amber-500/40 bg-amber-950/15'
        : 'border-emerald-500/30 bg-emerald-950/10'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent font-mono">
                Gemini AI Threat Advisor
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                2.5 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400">Universal semantic reasoning & deceptive tactic detection</p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
          isMalicious
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            : isSuspicious
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
        }`}>
          {advisor.threatLevel}
        </span>
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
        {/* Identified Brand */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-slate-400 block mb-1">Identified Target Entity</span>
          <span className="font-semibold text-slate-200">
            {advisor.apparentBrand ? advisor.apparentBrand : 'No specific entity impersonated'}
          </span>
          {advisor.legitimateOfficialDomain && (
            <span className="text-[11px] text-cyan-400 block mt-0.5 font-mono">
              Legitimate: {advisor.legitimateOfficialDomain}
            </span>
          )}
        </div>

        {/* Legitimacy */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-slate-400 block mb-1">Domain Authenticity</span>
          <div className="flex items-center space-x-1.5 font-semibold">
            {advisor.isLegitimateDomain ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Authentic Primary Domain</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span className="text-rose-400">Impersonation / Unofficial Host</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Social Engineering Tactics */}
      {advisor.socialEngineeringTactics && advisor.socialEngineeringTactics.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-slate-900/50 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
            Psychological Tactics Detected:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {advisor.socialEngineeringTactics.map((tactic, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30"
              >
                {tactic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Explanation */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 leading-relaxed mb-3">
        <strong className="text-purple-300 font-mono block mb-1">AI Assessment:</strong>
        {advisor.summaryExplanation}
      </div>

      {/* Actionable User Advice */}
      {advisor.actionableAdvice && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-900/80 border border-indigo-500/30 text-xs flex items-start space-x-2.5">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 block mb-0.5 font-mono uppercase tracking-wider text-[11px]">
              Recommended Action:
            </span>
            <span className="text-slate-300 leading-relaxed">{advisor.actionableAdvice}</span>
          </div>
        </div>
      )}
    </div>
  );
};
