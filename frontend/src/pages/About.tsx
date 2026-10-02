import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, Eye, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'privacy' | 'terms'>('architecture');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Architecture & Privacy Guarantees
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          PhishLens verifies whether the recipient identity, final destination, and transaction semantics match the user's intent.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center space-x-2 mb-8">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
            activeTab === 'architecture'
              ? 'bg-slate-900 text-white font-semibold'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Detection Architecture
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
            activeTab === 'privacy'
              ? 'bg-slate-900 text-white font-semibold'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Privacy Policy
        </button>
        <button
          onClick={() => setActiveTab('terms')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
            activeTab === 'terms'
              ? 'bg-slate-900 text-white font-semibold'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Terms of Service
        </button>
      </div>

      {/* Tab 1: Architecture */}
      {activeTab === 'architecture' && (
        <div className="space-y-4 mb-8">
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center text-xs font-mono font-bold">
                1
              </span>
              <h2 className="text-base font-bold text-slate-900">
                IntentGuard: Brand & Domain Verification
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-8">
              Verifies if the website hosting the page officially belongs to the organization it claims to represent. It cross-checks candidate hosts against official brand registrations, evaluates registration age via RDAP (&lt; 7 days triggers elevated risk), and inspects the page for sensitive password and OTP credential harvesting forms.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center text-xs font-mono font-bold">
                2
              </span>
              <h2 className="text-base font-bold text-slate-900">
                PaymentTruth: Payment Direction & Payee Matching
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-8">
              Scammers frequently trick victims into scanning QR codes by claiming they will receive cashback or a refund. In reality, the QR triggers a debit. PaymentTruth validates user intent: when an incoming transfer is expected, any payment initiation immediately fires a critical fraud alert. It also checks whether the payment recipient name matches the merchant specified by the customer.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center text-xs font-mono font-bold">
                3
              </span>
              <h2 className="text-base font-bold text-slate-900">
                ScamDNA: Phishing Kit Fingerprinting
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-8">
              Attackers continuously migrate phishing infrastructure across disposable domain names while reusing the same page templates, headings, and form fields. ScamDNA computes structural 64-bit SimHash fingerprints and RapidFuzz token ratios to detect cloned kits across new domains.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Privacy Policy */}
      {activeTab === 'privacy' && (
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4 text-xs text-slate-700 leading-relaxed mb-8">
          <h2 className="text-base font-bold text-slate-900 mb-2">PhishLens Privacy Policy</h2>
          <p>
            This privacy policy explains how PhishLens processes user data when scanning links and QR codes.
          </p>

          <h3 className="font-semibold text-slate-900 pt-2">1. Cryptographic Hashing of Query Parameters</h3>
          <p>
            When a URL or payment string is submitted, all query parameter values (such as session tokens, tracking IDs, or personal emails) are immediately transformed into SHA-256 cryptographic hashes before any database persistence or server logging occurs. Raw parameter values are never stored.
          </p>

          <h3 className="font-semibold text-slate-900 pt-2">2. Zero Credential Capture</h3>
          <p>
            The Chrome Extension content scripts inspect only structural HTML attributes (such as input field types, labels, and placeholders). PhishLens never reads, captures, or transmits values entered into form fields, including passwords, OTPs, CVVs, or UPI PINs.
          </p>

          <h3 className="font-semibold text-slate-900 pt-2">3. Server-Side SSRF Isolation</h3>
          <p>
            All redirect expansions are conducted via isolated server-side requests with strict Private Network / SSRF blocking rules. Requests to loopback addresses, private subnets, and cloud metadata endpoints are immediately rejected.
          </p>
        </div>
      )}

      {/* Tab 3: Terms of Service */}
      {activeTab === 'terms' && (
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4 text-xs text-slate-700 leading-relaxed mb-8">
          <h2 className="text-base font-bold text-slate-900 mb-2">Terms of Service</h2>
          <p>
            By using PhishLens, you acknowledge and agree to the following terms:
          </p>

          <h3 className="font-semibold text-slate-900 pt-2">1. Informational Security Guidance</h3>
          <p>
            PhishLens provides intent verification and heuristic security analysis to assist users in identifying potentially fraudulent websites and payment requests. While PhishLens incorporates multi-layered threat intelligence, no automated system can guarantee 100% detection of all cyber risks.
          </p>

          <h3 className="font-semibold text-slate-900 pt-2">2. User Responsibility</h3>
          <p>
            Users remain responsible for their financial decisions and transactions. PhishLens is not a payment gateway or bank and does not hold or transfer funds.
          </p>

          <h3 className="font-semibold text-slate-900 pt-2">3. Acceptable Use</h3>
          <p>
            You agree not to use PhishLens to test malicious payloads against private network endpoints or attempt denial-of-service activities against the scanning infrastructure.
          </p>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="text-slate-600">
          Ready to verify a payment QR or analyze a suspicious link?
        </span>
        <div className="flex items-center space-x-2">
          <Link
            to="/scan-qr"
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
          >
            Scan QR
          </Link>
          <Link
            to="/check-url"
            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium hover:bg-slate-50 transition-colors"
          >
            Check Link
          </Link>
        </div>
      </div>
    </div>
  );
};
