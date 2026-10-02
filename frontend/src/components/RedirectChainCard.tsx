import React from 'react';
import { GitCommit, ArrowRight, CornerDownRight, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';
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
  // If there are no redirects or only 1 hop with identical URLs, hide or show minimal
  if (redirects.length <= 1 && !isShortened && initialUrl === finalUrl) {
    return null;
  }

  const hopCount = redirects.length > 0 ? redirects.length - 1 : 0;

  return (
    <div className="p-5 sm:p-6 rounded-2xl glass-card border border-slate-800 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Redirect Chain Resolver
            </h3>
            <span className="text-xs text-slate-400">
              Unmasked {hopCount > 0 ? `${hopCount} redirect hop${hopCount > 1 ? 's' : ''}` : 'shortened destination'} with SSRF validation
            </span>
          </div>
        </div>

        {isShortened && (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            SHORTENED URL
          </span>
        )}
      </div>

      {/* Visual Chain Progression */}
      <div className="space-y-3 mb-4">
        {redirects.map((hop, index) => {
          const isFirst = index === 0;
          const isLast = index === redirects.length - 1;

          return (
            <div key={index} className="relative flex items-start space-x-3">
              {/* Vertical connector line */}
              {!isLast && (
                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-800 -mb-3 z-0" />
              )}

              {/* Hop Number Circle */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                  isLast
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60'
                    : isFirst
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {index + 1}
              </div>

              {/* Hop Details Card */}
              <div className="flex-1 p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-slate-200 truncate max-w-xs">
                    {hop.hostname}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      hop.statusCode >= 300 && hop.statusCode < 400
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                        : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                    }`}
                  >
                    HTTP {hop.statusCode}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400 truncate">
                  {hop.url}
                </div>

                {isLast && (
                  <div className="mt-2 pt-2 border-t border-slate-800 flex items-center space-x-1.5 text-xs text-cyan-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Final destination evaluated by Safe Browsing, RDAP, and Gemini AI</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Context Note */}
      <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start space-x-2 text-xs text-slate-400">
        <AlertTriangle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <span>
          Phishing campaigns frequently disguise malicious landing pages behind URL shorteners or intermediate redirect hops to bypass static email and chat filters. PhishLens follows each hop safely in isolated backend requests to verify the actual landing page.
        </span>
      </div>
    </div>
  );
};
