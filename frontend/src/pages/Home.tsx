import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode, Link2, ArrowRight, ShieldCheck, CreditCard, Layers, Flag } from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-medium mb-5">
          <span>PhishLens v1.0</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4 leading-tight">
          Verify links and payment QRs before you tap.
        </h1>

        <p className="text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
          PhishLens checks whether a website or UPI QR actually matches what you expect. It spots fake bank logins, lookalike domains, and scams where a payment request is disguised as a refund.
        </p>
      </div>

      {/* Main Action Workspaces: Scan QR or Check Link */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {/* QR Scanner Card */}
        <Link
          to="/scan-qr"
          className="p-6 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all duration-150 flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
              <QrCode className="w-5 h-5" />
            </div>

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900">
                Scan a QR Code
              </h2>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Point your camera or upload a screenshot of any UPI or web QR. PhishLens checks the recipient, verifies shop stickers, and warns you if a QR debits money when you expected a refund.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>PaymentTruth</span>
            <span className="text-emerald-700 font-medium">Ready</span>
          </div>
        </Link>

        {/* Link Analyzer Card */}
        <Link
          to="/check-url"
          className="p-6 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all duration-150 flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
              <Link2 className="w-5 h-5" />
            </div>

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900">
                Check a Link
              </h2>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Paste any URL to trace its redirect hops, check domain age via RDAP, inspect login forms, and catch character-replacement lookalikes before visiting.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>IntentGuard</span>
            <span className="text-emerald-700 font-medium">Ready</span>
          </div>
        </Link>
      </div>

      {/* Core Security Capabilities */}
      <div className="mb-10">
        <div className="flex items-center space-x-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
            Security Capabilities
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-3 text-xs font-mono font-bold">
                01
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">IntentGuard</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Verifies brand claims against authoritative domain registries, detects Cyrillic homoglyph spoofs, checks domain registration age via RDAP, and inspects credential forms.
              </p>
            </div>
            <div className="text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-100">
              Identity Verification
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-3 text-xs font-mono font-bold">
                02
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">PaymentTruth</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Prevents reverse-payment fraud by validating payment direction, flags payee-merchant mismatches, and verifies Ed25519 cryptographically signed retail stickers.
              </p>
            </div>
            <div className="text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-100">
              Transaction Semantics
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-3 text-xs font-mono font-bold">
                03
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">ScamDNA</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Computes 64-bit structural SimHash fingerprints of page templates, recognizing recurring phishing kits across newly registered disposable domain names.
              </p>
            </div>
            <div className="text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-100">
              Pattern Recognition
            </div>
          </div>
        </div>
      </div>

      {/* Community Reporting Callout */}
      <div className="mb-10 p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Spotted a Phishing Link or Fraudulent QR?</div>
            <div className="text-xs text-slate-500">Report suspicious websites directly into our community triage queue to protect others.</div>
          </div>
        </div>
        <Link
          to="/report"
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shrink-0 shadow-sm"
        >
          <span>Report Website</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Trust & Guarantee Panel */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Privacy note: We never store your passwords, OTPs, or UPI PINs. URL query parameters are hashed (SHA-256) before logging.</span>
        </div>
        <Link to="/about" className="text-slate-900 font-semibold hover:underline shrink-0 text-xs">
          Learn more
        </Link>
      </div>
    </div>
  );
};
