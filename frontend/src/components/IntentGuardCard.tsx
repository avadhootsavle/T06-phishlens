import React from 'react';
import { CheckCircle2, AlertOctagon, Globe, Calendar, KeyRound } from 'lucide-react';
import { IntentGuardInfo } from '../types';

interface IntentGuardCardProps {
  intentGuard?: IntentGuardInfo;
  hostname?: string;
}

export const IntentGuardCard: React.FC<IntentGuardCardProps> = ({ intentGuard, hostname }) => {
  if (!intentGuard && !hostname) return null;

  const isImpersonating = Boolean(intentGuard?.claimedBrand && !intentGuard?.isOfficialDomain);

  return (
    <div
      className={`p-5 rounded-xl border transition-colors ${
        isImpersonating || intentGuard?.hasCredentialTrap
          ? 'bg-red-50 border-red-200 text-red-950'
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
            Identity Verification
          </h3>
          <p className="text-sm font-semibold text-slate-900">
            Domain Authenticity & Brand Ownership
          </p>
        </div>

        {intentGuard?.isOfficialDomain ? (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official Domain</span>
          </span>
        ) : isImpersonating ? (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
            <span>Brand Impersonation</span>
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Claimed Brand */}
        <div className="p-3 rounded-lg bg-white border border-slate-200">
          <span className="text-slate-500 block mb-1">Claimed Brand</span>
          <span className="font-semibold text-slate-900">
            {intentGuard?.claimedBrand || 'No brand claim detected'}
          </span>
        </div>

        {/* Target Hostname */}
        <div className="p-3 rounded-lg bg-white border border-slate-200">
          <span className="text-slate-500 block mb-1">Target Host</span>
          <span className="font-mono text-slate-800 truncate block">
            {hostname || 'N/A'}
          </span>
        </div>

        {/* Domain Age */}
        <div className="p-3 rounded-lg bg-white border border-slate-200">
          <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Registration Age</span>
          </div>
          <span className="font-medium text-slate-900">
            {intentGuard?.domainAgeDays !== null && intentGuard?.domainAgeDays !== undefined
              ? `${intentGuard.domainAgeDays} days old`
              : 'Established or lookup not available'}
          </span>
        </div>

        {/* Credential Form Check */}
        <div
          className={`p-3 rounded-lg border ${
            intentGuard?.hasCredentialTrap
              ? 'bg-red-100 border-red-300 text-red-900'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center space-x-1.5 mb-1">
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Sensitive Inputs</span>
          </div>
          <span className="font-medium">
            {intentGuard?.hasCredentialTrap
              ? 'Password or OTP field on unofficial site'
              : 'No unauthorized credential inputs found'}
          </span>
        </div>
      </div>
    </div>
  );
};
