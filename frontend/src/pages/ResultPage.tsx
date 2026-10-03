import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Flag, Info, Layers } from 'lucide-react';
import { ScanResult } from '../types';
import { VerdictBadge } from '../components/VerdictBadge';
import { RiskGauge } from '../components/RiskGauge';
import { IntentGuardCard } from '../components/IntentGuardCard';
import { PaymentTruthCard } from '../components/PaymentTruthCard';
import { GeminiAdvisorCard } from '../components/GeminiAdvisorCard';
import { RedirectChainCard } from '../components/RedirectChainCard';

export const ResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialResult = location.state?.scanResult as ScanResult | undefined;

  const [result, setResult] = useState<ScanResult | undefined>(initialResult);

  if (!result) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">No Active Scan Data</h2>
        <p className="text-xs text-slate-600 mb-6">
          Please scan a QR code or submit a link to view risk results.
        </p>
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
      </div>
    );
  }

  const isUrlScan = result.inputType === 'URL' || result.inputType === 'QR_URL';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-1.5 text-xs font-mono text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Scanner</span>
        </button>

        <Link
          to={`/report?scanId=${result.scanId}`}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-700 hover:text-slate-900 shadow-sm transition-colors"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Report Result</span>
        </Link>
      </div>

      {/* Main Verdict Card */}
      <div
        className={`p-6 sm:p-7 rounded-xl border shadow-sm mb-6 transition-all ${
          result.verdict === 'DANGER'
            ? 'bg-red-50/70 border-red-200'
            : result.verdict === 'CAUTION'
            ? 'bg-amber-50/60 border-amber-200'
            : 'bg-emerald-50/50 border-emerald-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
          <RiskGauge score={result.riskScore} verdict={result.verdict} size={120} />

          <div className="flex-1 text-center sm:text-left">
            <div className="mb-2">
              <VerdictBadge verdict={result.verdict} size="lg" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 leading-snug">
              {result.explanation}
            </h2>

            {result.hostname && (
              <div className="text-xs font-mono text-slate-600 truncate mt-1">
                Target: {result.hostname}
              </div>
            )}
          </div>
        </div>

        {/* Detailed "Why?" Evidence Section */}
        {result.why && result.why.length > 0 && (
          <div className="pt-5 border-t border-slate-200/80">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-2.5">
              Evidence Observed
            </div>

            <ul className="space-y-1.5">
              {result.why.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start space-x-2 text-xs sm:text-sm text-slate-700 leading-relaxed"
                >
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>


      {/* Specialized IntentGuard Details */}
      {isUrlScan && (
        <div className="mb-6 space-y-4">
          <IntentGuardCard
            intentGuard={result.intentGuard}
            hostname={result.finalHostname || result.hostname}
          />

          {/* Gemini AI Threat Advisor */}
          {result.geminiAdvisor && (
            <GeminiAdvisorCard advisor={result.geminiAdvisor} />
          )}

          {/* Redirect Chain & Shortener Expansion */}
          <RedirectChainCard
            redirects={result.redirects}
            initialUrl={result.url}
            finalUrl={result.finalUrl}
            isShortened={result.isShortened}
          />
        </div>
      )}

      {/* Specialized PaymentTruth Details */}
      {result.paymentTruth && (
        <div className="mb-6">
          <PaymentTruthCard paymentTruth={result.paymentTruth} />
        </div>
      )}

      {/* Raw Threat Signals Inspector */}
      {result.signals && result.signals.length > 0 && (
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-600 mb-3">
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Underlying Threat Signals ({result.signals.length})</span>
          </div>

          <div className="space-y-1.5">
            {result.signals.map((sig, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2 truncate mr-3">
                  <span className="font-mono text-slate-900 font-semibold">{sig.code}</span>
                  <span className="text-slate-600 truncate">{sig.message}</span>
                </div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold shrink-0">
                  +{sig.scoreImpact} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community Reporting Action */}
      <div className="mt-8 p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-900">Disagree with this verdict or found an active scam?</div>
          <div className="text-[11px] text-slate-500">Submit this website or QR payment to our security triage queue.</div>
        </div>
        <Link
          to={`/report?scanId=${result.scanId || ''}&url=${encodeURIComponent(result.url || result.finalUrl || '')}`}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors shrink-0"
        >
          <Flag className="w-3.5 h-3.5 text-red-600" />
          <span>Report Website</span>
        </Link>
      </div>
    </div>
  );
};
