import React from 'react';
import { ShieldCheck, IndianRupee, Dna, Lock, Globe, Terminal, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
          Why PhishLens?
        </h1>
        <p className="text-lg text-slate-300 italic">
          "Existing tools protect destinations. PhishLens protects decisions."
        </p>
      </div>

      {/* The 3 Core USPs */}
      <div className="space-y-6 mb-12">
        {/* IntentGuard */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-cyan-500/30">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">IntentGuard™ — Identity Verification</h2>
              <span className="text-xs font-mono text-cyan-400">Is this website really who it claims to be?</span>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Attackers create lookalike websites that impersonate trusted banking portals (like SBI, HDFC, or Paytm). IntentGuard checks the visible brand claims against official domain registries, newly registered domain age (RDAP), and inspects for sensitive credential harvesting traps (passwords, OTPs, CVVs) on unofficial websites.
          </p>
        </div>

        {/* PaymentTruth */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">PaymentTruth™ — Transaction Semantics</h2>
              <span className="text-xs font-mono text-emerald-400">What will this QR actually make the user do?</span>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Scammers frequently send QR codes promising a "refund", "cashback", or "lottery receipt". In reality, the QR contains a <code>upi://pay</code> command that debits money from the victim's account. PaymentTruth intercepts user intent: if you expected to receive funds, any payment QR instantly triggers a Fraud Alert. It also flags mismatches between the shop you visited and the payee name in the QR code.
          </p>
        </div>

        {/* ScamDNA */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-indigo-500/30">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">ScamDNA™ — Pattern Intelligence</h2>
              <span className="text-xs font-mono text-indigo-400">Is this the same scam using another domain?</span>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Phishing gangs constantly register fresh disposable domains (e.g., <code>sbi-secure-one.xyz</code> $\to$ <code>sbi-update-two.top</code>) while reusing the exact same HTML DOM structures, form labels, favicons, and deceptive templates. ScamDNA computes structural fingerprints to detect cloned kits on day-zero domains.
          </p>
        </div>
      </div>

      {/* Security Principles */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
        <h4 className="font-mono font-bold text-white uppercase tracking-wider text-sm mb-2">
          Strict Security & Privacy Guarantees:
        </h4>
        <p>• <strong>Zero Credential Access:</strong> We never capture or log passwords, OTPs, CVVs, or UPI PINs. Content scripts only inspect field types and label metadata.</p>
        <p>• <strong>Deterministic Verdicts:</strong> All scoring and explanations are derived from explainable security signals, never from non-deterministic LLMs.</p>
        <p>• <strong>Privacy-Safe Logging:</strong> Sensitive URL query parameters (e.g. <code>?token=</code>, <code>?email=</code>) are automatically stripped before storage.</p>
      </div>
    </div>
  );
};
