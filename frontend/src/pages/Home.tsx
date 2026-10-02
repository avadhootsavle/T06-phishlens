import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode, Link2, ShieldAlert, Sparkles, ArrowRight, Activity, CheckCircle, Zap } from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Intent-Aware Cyber Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Existing tools protect destinations.{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            PhishLens protects decisions.
          </span>
        </h1>

        <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Verify whether the identity, destination, and payment action behind a link or QR code match what you actually intended to do.
        </p>
      </div>

      {/* Main Action Cards (Scan QR & Check a Link) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* QR Scanner Card */}
        <Link
          to="/scan-qr"
          className="group relative p-8 rounded-3xl glass-card border border-cyan-500/30 hover:border-cyan-400 transition-all duration-300 hover:shadow-glow-cyan overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl -z-10 group-hover:bg-cyan-500/20 transition-colors" />
          
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
            <QrCode className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-between">
            <span>Scan QR Code</span>
            <ArrowRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </h2>

          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Decode UPI payment semantics. Spot reverse payment scams, unauthorized merchant transfers, and phishing URLs before completing transactions.
          </p>

          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-300">
            <Zap className="w-3.5 h-3.5" />
            <span>PaymentTruth™ Enabled</span>
          </div>
        </Link>

        {/* Link Analyzer Card */}
        <Link
          to="/check-url"
          className="group relative p-8 rounded-3xl glass-card border border-blue-500/30 hover:border-blue-400 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -z-10 group-hover:bg-blue-500/20 transition-colors" />

          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
            <Link2 className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-between">
            <span>Check a Link</span>
            <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
          </h2>

          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Unpack redirect chains, homoglyph lookalikes, domain age, and brand impersonation traps with deterministic non-LLM risk scoring.
          </p>

          <div className="flex items-center space-x-2 text-xs font-mono text-blue-300">
            <Zap className="w-3.5 h-3.5" />
            <span>IntentGuard™ Enabled</span>
          </div>
        </Link>
      </div>

      {/* Interactive Hackathon Demo Launcher Section */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800 mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-slate-200">Interactive Demo Scenarios</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Section 39 Test Scenarios</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Demo 1 */}
          <button
            onClick={() => navigate('/check-url?demo=intentguard')}
            className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors"
          >
            <div className="font-bold text-cyan-300 mb-1">Demo 1: IntentGuard</div>
            <div className="text-slate-400">SBI impersonation on unofficial domain with credential traps.</div>
          </button>

          {/* Demo 2 */}
          <button
            onClick={() => navigate('/scan-qr?demo=reverse-payment')}
            className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors"
          >
            <div className="font-bold text-rose-300 mb-1">Demo 2: PaymentTruth</div>
            <div className="text-slate-400">"Receive ₹5,000 refund" intent scanning a debit QR payload.</div>
          </button>

          {/* Demo 3 */}
          <button
            onClick={() => navigate('/scan-qr?demo=merchant-mismatch')}
            className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors"
          >
            <div className="font-bold text-amber-300 mb-1">Demo 3: Payee Mismatch</div>
            <div className="text-slate-400">Expected "ABC Medical" vs personal UPI recipient.</div>
          </button>
        </div>
      </div>

      {/* Security Engine Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-slate-200">Identity (IntentGuard)</div>
            <div className="text-xs text-slate-400 mt-1">
              Verifies if site is truly owned by the brand it displays.
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-slate-200">Action (PaymentTruth)</div>
            <div className="text-xs text-slate-400 mt-1">
              Decodes UPI payloads to prevent fraudulent money deductions.
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-slate-200">Pattern (ScamDNA)</div>
            <div className="text-xs text-slate-400 mt-1">
              Recognizes reused phishing kits across disposable domains.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
