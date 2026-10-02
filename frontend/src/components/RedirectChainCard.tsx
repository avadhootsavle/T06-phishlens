import React from 'react';
import { GitCommit, ShieldCheck, AlertCircle } from 'lucide-react';
import { RedirectHop } from '../types';

interface RedirectChainCardProps {
  redirects?: RedirectHop[];
  initialUrl?: string;
  finalUrl?: string;
  isShortened?: boolean;
}

export const RedirectChainCard: React.FC<RedirectChainCardProps> = ({
  redirects = [],
  initialUrl,
  finalUrl,
  isShortened,
}) => {
  if (redirects.length <= 1 && !isShortened && initialUrl === finalUrl) {
    return null;
  }

  const hopCount = redirects.length > 0 ? redirects.length - 1 : 0;

  return (
    <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
            Redirect Chain
          </h3>
          <p className="text-sm font-semibold text-slate-900">
            {hopCount > 0 ? `${hopCount} redirect hop${hopCount > 1 ? 's' : ''} followed` : 'Destination unmasked'}
          </p>
        </div>

        {isShortened && (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Shortened URL
          </span>
        )}
      </div>

      {/* Visual Chain Progression */}
      <div className="space-y-3 mb-4">
        {redirects.map((hop, index) => {
          const isLast = index === redirects.length - 1;

          return (
            <div key={index} className="relative flex items-start space-x-3">
              {!isLast && (
                <div className="absolute left-3.5 top-7 bottom-0 w-px bg-slate-200 -mb-3 z-0" />
              )}

              <div
                className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0 ${
                  isLast
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {index + 1}
              </div>

              <div className="flex-1 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-semibold text-slate-900 truncate max-w-xs">
                    {hop.hostname}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                      hop.statusCode >= 300 && hop.statusCode < 400
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    HTTP {hop.statusCode}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-500 truncate">
                  {hop.url}
                </div>

                {isLast && (
                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Final landing page evaluated across all threat layers</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
        Phishing links frequently use URL shorteners or intermediate redirect hops to bypass static filters. PhishLens isolates and follows each hop on the server to inspect the true final destination.
      </div>
    </div>
  );
};
