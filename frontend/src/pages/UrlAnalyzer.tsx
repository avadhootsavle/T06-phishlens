import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link2, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { scanUrl } from '../services/api';

export const UrlAnalyzer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps = [
    'Validating protocol and private network boundaries',
    'Tracing redirect hops and unmasking shorteners',
    'Checking verified threat reputation feeds',
    'Inspecting domain registration age and Unicode homoglyphs',
    'Calculating deterministic risk verdict and non-technical summary',
  ];

  // Demo auto-fill
  useEffect(() => {
    const demo = searchParams.get('demo');
    if (demo === 'intentguard') {
      setUrl('https://sbi-online-banking-portal.net');
    } else if (demo === 'homoglyph') {
      setUrl('https://раytm-wallet.com');
    } else if (demo === 'safe') {
      setUrl('https://www.onlinesbi.sbi');
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
    }, 450);

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
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Inspect a Link
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          Trace redirects, check domain age, and detect lookalike websites.
        </p>
      </div>

      {/* Main Link Input Card */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScan();
          }}
          className="space-y-4"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                URL or domain
              </label>
              <button
                type="button"
                onClick={handleQuickPaste}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                Paste
              </button>
            </div>

            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. sbi-secure-update.net, bit.ly/3xyz, or hdfcbank.com"
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-slate-400"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[11px] font-mono text-slate-500 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => setUrl('https://sbi-online-banking-portal.net')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-mono text-slate-700 transition-colors"
              >
                Fake SBI Portal
              </button>
              <button
                type="button"
                onClick={() => setUrl('https://раytm-wallet.com')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-mono text-slate-700 transition-colors"
              >
                Cyrillic Lookalike
              </button>
              <button
                type="button"
                onClick={() => setUrl('https://www.onlinesbi.sbi')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-mono text-emerald-800 transition-colors"
              >
                Official SBI (Safe)
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Skeleton / Progress Indicator when loading */}
          {loading && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900">
                <RefreshCw className="w-4 h-4 text-slate-700 animate-spin" />
                <span>Inspecting link...</span>
              </div>

              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center space-x-2 text-xs transition-colors duration-200 ${
                      idx < currentStep
                        ? 'text-slate-800 font-medium'
                        : idx === currentStep
                        ? 'text-slate-900 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        idx <= currentStep ? 'bg-slate-900' : 'bg-slate-300'
                      }`}
                    />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500 font-mono">
              Target latency: &lt; 3 seconds
            </span>

            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors"
            >
              <span>{loading ? 'Inspecting...' : 'Analyze Address'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Quick Test Presets */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 mb-3">
          Quick Test Presets
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setUrl('https://onlinesbi.sbi');
              handleScan('https://onlinesbi.sbi');
            }}
            className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
          >
            <div className="font-semibold text-slate-900">Legitimate Banking</div>
            <div className="text-[11px] text-slate-500 font-mono">https://onlinesbi.sbi</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setUrl('https://sbi-online-banking-portal.net/login');
              handleScan('https://sbi-online-banking-portal.net/login');
            }}
            className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
          >
            <div className="font-semibold text-slate-900">Imitation Domain</div>
            <div className="text-[11px] text-slate-500 font-mono">sbi-online-banking-portal.net</div>
          </button>
        </div>
      </div>
    </div>
  );
};
