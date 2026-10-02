import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode, Link2, ArrowRight, ShieldCheck, CreditCard, Layers } from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-medium mb-5">
          <span>Security Engine • Version 1.0</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4 leading-tight">
          Intent-Aware Phishing & Payment Protection
        </h1>

        <p className="text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
          PhishLens verifies whether the recipient identity, final destination, and transaction action match what you actually intended to do before completing an action.
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
                Scan Payment or Web QR
              </h2>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Decodes UPI payment strings and web URLs. Flags reverse payment tricks where a debit is disguised as a refund, and checks for shop name mismatches.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>PaymentTruth Module</span>
            <span className="text-emerald-700 font-medium">Ready to scan</span>
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
                Inspect a Web Address
              </h2>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Expands URL shorteners and traces redirect chains. Identifies Unicode homoglyphs, newly registered domains via RDAP, and brand impersonation traps.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>IntentGuard Module</span>
            <span className="text-emerald-700 font-medium">Ready to inspect</span>
          </div>
        </Link>
      </div>

      {/* Interactive Verification Presets */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                1-Click Live Test Scenarios
              </h3>
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">
              Live deterministic evaluations matching real-world attack vectors
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
            Judge Evaluation Lab
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Preset 1 */}
          <button
            type="button"
            onClick={() => navigate('/check-url?demo=intentguard')}
            className="p-3.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-left transition-all duration-150 hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
              <span>1. Fake KYC WhatsApp Link</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <div className="text-[11px] text-slate-600 leading-relaxed">
              SBI brand claim on unofficial newly registered domain with credential fields &rarr; <span className="font-semibold text-red-600 font-mono">DANGER</span>
            </div>
          </button>

          {/* Preset 2 */}
          <button
            type="button"
            onClick={() => navigate('/scan-qr?demo=reverse-payment')}
            className="p-3.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-left transition-all duration-150 hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
              <span>2. Reverse Payment Scam</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <div className="text-[11px] text-slate-600 leading-relaxed">
              User expects ₹5,000 refund, but QR executes a debit from user's account &rarr; <span className="font-semibold text-red-600 font-mono">DANGER</span>
            </div>
          </button>

          {/* Preset 3 */}
          <button
            type="button"
            onClick={() => navigate('/scan-qr?demo=tampered-sticker')}
            className="p-3.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-left transition-all duration-150 hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
              <span>3. Tampered QR Sticker</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <div className="text-[11px] text-slate-600 leading-relaxed">
              Counterfeit Ed25519 merchant sticker pasted over real shop QR &rarr; <span className="font-semibold text-red-600 font-mono">DANGER</span>
            </div>
          </button>

          {/* Preset 4 */}
          <button
            type="button"
            onClick={() => navigate('/check-url?demo=homoglyph')}
            className="p-3.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-left transition-all duration-150 hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
              <span>4. Homoglyph Domain Spoof</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <div className="text-[11px] text-slate-600 leading-relaxed">
              Cyrillic character substitution imitating Paytm login gateway &rarr; <span className="font-semibold text-red-600 font-mono">DANGER</span>
            </div>
          </button>

          {/* Preset 5 */}
          <button
            type="button"
            onClick={() => navigate('/scan-qr?demo=merchant-mismatch')}
            className="p-3.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-left transition-all duration-150 hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
              <span>5. Merchant Payee Mismatch</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <div className="text-[11px] text-slate-600 leading-relaxed">
              Intends to pay "ABC Medical", but QR points to personal "Rahul Sharma" &rarr; <span className="font-semibold text-amber-600 font-mono">CAUTION</span>
            </div>
          </button>

          {/* Preset 6 */}
          <button
            type="button"
            onClick={() => navigate('/scan-qr?demo=verified-merchant')}
            className="p-3.5 rounded-lg bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200 text-left transition-all duration-150 hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-950 mb-1">
              <span>6. Authentic Verified Shop</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600 group-hover:text-emerald-900 transition-colors" />
            </div>
            <div className="text-[11px] text-emerald-800 leading-relaxed">
              Cryptographically verified official Ed25519 sticker for Apex Electronics &rarr; <span className="font-semibold text-emerald-700 font-mono">SAFE</span>
            </div>
          </button>
        </div>
      </div>

      {/* Trust & Guarantee Panel */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Privacy Guarantee: Query parameters are cryptographically hashed before storage. Sensitive inputs are never captured.</span>
        </div>
        <Link to="/about" className="text-slate-900 font-semibold hover:underline shrink-0 text-xs">
          Learn more
        </Link>
      </div>
    </div>
  );
};
