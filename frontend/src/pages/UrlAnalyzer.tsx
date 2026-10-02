import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link2, Shield, RefreshCw, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { scanUrl } from '../services/api';

export const UrlAnalyzer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps = [
    'Validating protocol & SSRF boundaries...',
    'Tracing HTTP redirect hops & shortener expansions...',
    'Checking Google Safe Browsing threat feeds...',
    'Evaluating RDAP registration age & homoglyph lookalikes...',
    'Calculating IntentGuard™ risk score & deterministic explanation...',
  ];

  // Demo auto-fill
  useEffect(() => {
    const demo = searchParams.get('demo');
    if (demo === 'intentguard') {
      setUrl('https://sbi-online-banking-portal.net');
    }
  }, [searchParams]);

  const handleScan = async (targetUrl?: string) => {
    const urlToScan = targetUrl || url;
    if (!urlToScan.trim()) return;

    setError(null);
    setLoading(true);
    setCurrentStep(0);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 400);

    try {
      const result = await scanUrl(urlToScan.trim());
      clearInterval(stepInterval);
      navigate('/result', { state: { scanResult: result } });
    } catch (err: unknown) {
      clearInterval(stepInterval);
      setError((err as Error).message || 'Scan failed');
      setLoading(false);
    }
  };

  const handleQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch {
      // clipboard access declined
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto mb-4">
          <Link2 className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">IntentGuard™ Link Inspector</h1>
        <p className="text-sm text-slate-400">
          Evaluates redirect chains, domain age, typosquatting, and brand impersonation.
        </p>
      </div>

      {/* Main Link Input Card */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 shadow-xl mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScan();
          }}
          className="space-y-4"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                Enter Web Address / URL
              </label>
              <button
                type="button"
                onClick={handleQuickPaste}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Paste from Clipboard
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example-security-login.xyz"
                disabled={loading}
                className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!url.trim() || loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold text-sm tracking-wider uppercase font-mono shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Multi-Signal Scan...</span>
              </>
            ) : (
              <>
                <span>Analyze Link Security</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Live Multi-Phase Scan Progress Animation */}
        {loading && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="space-y-2.5">
              {steps.map((step, idx) => {
                const isDone = idx < currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div
                    key={step}
                    className={`flex items-center space-x-2.5 text-xs transition-opacity duration-300 ${
                      isDone
                        ? 'text-emerald-400 font-medium'
                        : isCurrent
                        ? 'text-cyan-300 font-semibold animate-pulse'
                        : 'text-slate-600 opacity-40'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-700" />
                    )}
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Test Links */}
      <div className="space-y-2">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
          Preset Test Links:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setUrl('https://sbi-online-banking-portal.net');
              handleScan('https://sbi-online-banking-portal.net');
            }}
            className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-left text-slate-300 flex items-center justify-between group"
          >
            <span>Fake SBI Lookalike Link</span>
            <Sparkles className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => {
              setUrl('https://onlinesbi.sbi');
              handleScan('https://onlinesbi.sbi');
            }}
            className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-left text-slate-300 flex items-center justify-between group"
          >
            <span>Official SBI Domain (Safe)</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
