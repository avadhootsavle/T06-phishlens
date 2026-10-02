import React from 'react';
import { ShieldCheck, ShieldAlert, KeyRound, Globe, Calendar, AlertOctagon } from 'lucide-react';
import { IntentGuardInfo } from '../types';

interface IntentGuardCardProps {
  intentGuard?: IntentGuardInfo;
  hostname?: string;
}

export const IntentGuardCard: React.FC<IntentGuardCardProps> = ({ intentGuard, hostname }) => {
  if (!intentGuard && !hostname) return null;

  const isImpersonating = Boolean(intentGuard?.claimedBrand && !intentGuard?.isOfficialDomain);

  return (
    <div className={`p-5 rounded-2xl glass-card border transition-all ${
      isImpersonating || intentGuard?.hasCredentialTrap
        ? 'border-rose-500/40 bg-rose-950/10'
        : 'border-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Globe className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-mono">
              IntentGuard™ Identity Layer
            </h3>
            <p className="text-xs text-slate-400">Verifies brand authenticity & credential safety</p>
          </div>
        </div>

        {intentGuard?.isOfficialDomain ? (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Domain</span>
          </span>
        ) : isImpersonating ? (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Impersonation</span>
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Claimed Brand */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-slate-400 block mb-1">Claimed Brand Identity</span>
          <span className="font-semibold text-slate-200">
            {intentGuard?.claimedBrand || 'No specific protected brand claimed'}
          </span>
        </div>

        {/* Current Domain */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-slate-400 block mb-1">Target Hostname</span>
          <span className="font-mono font-medium text-slate-200 truncate block">
            {hostname || 'N/A'}
          </span>
        </div>

        {/* Domain Age */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Domain Registration Age</span>
          </div>
          <span className="font-medium text-slate-200">
            {intentGuard?.domainAgeDays !== null && intentGuard?.domainAgeDays !== undefined
              ? `${intentGuard.domainAgeDays} days old`
              : 'Established / RDAP info pending'}
          </span>
        </div>

        {/* Credential Trap Status */}
        <div className={`p-3 rounded-xl border ${
          intentGuard?.hasCredentialTrap
            ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
            : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
        }`}>
          <div className="flex items-center space-x-1.5 mb-1">
            {intentGuard?.hasCredentialTrap ? (
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className={intentGuard?.hasCredentialTrap ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
              Credential Trap Check
            </span>
          </div>
          <span className="font-medium">
            {intentGuard?.hasCredentialTrap
              ? 'DANGER: Password/OTP harvesting form detected'
              : 'No suspicious credential traps identified'}
          </span>
        </div>
      </div>
    </div>
  );
};
