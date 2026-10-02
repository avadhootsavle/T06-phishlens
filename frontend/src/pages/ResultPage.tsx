import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Shield, AlertTriangle, ArrowLeft, Flag, CheckCircle, ExternalLink, HelpCircle, Layers, PlusCircle } from 'lucide-react';
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
  const [enriching, setEnriching] = useState<boolean>(false);

  if (!result) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Active Scan Data</h2>
        <p className="text-sm text-slate-400 mb-6">Please scan a QR code or submit a link to view risk results.</p>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-600 text-white font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  // Simulate IntentGuard content script metadata enrichment for Demo 1
  const handleSimulatePageMetadata = async () => {
    setEnriching(true);
    try {
      const response = await fetch(`/api/v1/scans/${result.scanId}/page-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'SBI Online Banking Portal - Personal Login',
          hasPasswordField: true,
          hasOtpField: true,
          brandKeywords: ['sbi', 'state bank of india', 'netbanking'],
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setResult(updated);
      }
    } catch {
      // Ignore
    } finally {
      setEnriching(false);
    }
  };

  const isUrlScan = result.inputType === 'URL' || result.inputType === 'QR_URL';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Scan Another</span>
        </button>

        <Link
          to={`/report?scanId=${result.scanId}`}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Report Result</span>
        </Link>
      </div>

      {/* Main Verdict Card */}
      <div
        className={`p-6 sm:p-8 rounded-3xl glass-card border shadow-2xl mb-6 transition-all ${
          result.verdict === 'DANGER'
            ? 'glow-border-danger bg-rose-950/15'
            : result.verdict === 'CAUTION'
            ? 'glow-border-caution bg-amber-950/10'
            : 'glow-border-safe bg-emerald-950/10'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 mb-6">
          <RiskGauge score={result.riskScore} verdict={result.verdict} size={150} />

          <div className="flex-1 text-center sm:text-left">
            <div className="mb-2">
              <VerdictBadge verdict={result.verdict} size="lg" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-snug">
              {result.explanation}
            </h2>

            {result.hostname && (
              <div className="text-xs font-mono text-cyan-400 truncate mt-1">
                Target: {result.hostname}
              </div>
            )}
          </div>
        </div>

        {/* Detailed "Why?" Section (Section 27) */}
        {result.why && result.why.length > 0 && (
          <div className="pt-6 border-t border-slate-800/80">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Evidence & Why this verdict was given:</span>
            </div>

            <ul className="space-y-2">
              {result.why.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start space-x-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed"
                >
                  <span className="text-cyan-400 mt-1">•</span>
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
          <IntentGuardCard intentGuard={result.intentGuard} hostname={result.finalHostname || result.hostname} />

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

          {/* Metadata Simulator for Demo */}
          {result.verdict !== 'DANGER' && (
            <div className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold text-slate-200 block">Demo Step 2: Content Script Simulator</span>
                <span className="text-slate-400">
                  Simulate extension detecting password and OTP credential fields on this page.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSimulatePageMetadata}
                disabled={enriching}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-mono font-bold tracking-wider uppercase shrink-0 ml-4"
              >
                {enriching ? 'Enriching...' : 'Detect Forms'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Specialized PaymentTruth Details */}
      {result.paymentTruth && (
        <div className="mb-6">
          <PaymentTruthCard paymentTruth={result.paymentTruth} />
        </div>
      )}

      {/* Detected Raw Signals Inspector */}
      {result.signals && result.signals.length > 0 && (
        <div className="p-5 rounded-2xl glass-card border border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Raw Threat Signals ({result.signals.length})</span>
          </div>

          <div className="space-y-2">
            {result.signals.map((sig, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-cyan-400 font-semibold">{sig.code}</span>
                  <span className="text-slate-400 truncate max-w-xs">{sig.message}</span>
                </div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                  +{sig.scoreImpact} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
