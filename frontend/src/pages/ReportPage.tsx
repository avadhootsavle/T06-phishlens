import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Flag, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { submitReport } from '../services/api';

export const ReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const scanId = searchParams.get('scanId') || undefined;

  const [category, setCategory] = useState<string>('PHISHING_WEBSITE');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: 'PHISHING_WEBSITE', label: 'Phishing / Fake Website' },
    { value: 'SUSPICIOUS_PAYMENT', label: 'Fraudulent UPI Payment Request' },
    { value: 'INCORRECT_RECIPIENT', label: 'Incorrect Merchant / Payee Mismatch' },
    { value: 'BRAND_IMPERSONATION', label: 'Unauthorized Brand Impersonation' },
    { value: 'FALSE_POSITIVE', label: 'Incorrect Warning (Legitimate Site Marked Risky)' },
    { value: 'OTHER', label: 'Other Security Suspicion' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await submitReport(scanId, category, note);
      setSuccess(true);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 md:py-12">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-slate-800 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Report Security Threat</h1>
            <p className="text-xs text-slate-400">
              Help protect the community by submitting verified fraud signals.
            </p>
          </div>
        </div>

        {success ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Report Received</h3>
            <p className="text-xs text-slate-300 mb-6">
              Thank you for contributing to community threat intelligence. Our automated systems and admin queue are reviewing your submission.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold uppercase tracking-wider"
            >
              Return Home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {scanId && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span className="text-slate-400 block mb-0.5">Linked Scan ID</span>
                <span className="font-mono text-cyan-400 font-semibold">{scanId}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block mb-2">
                Report Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block mb-2">
                Additional Details / Evidence (Optional)
              </label>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explain what suspicious behavior was observed (e.g. asking for OTP, unfamiliar UPI ID, fake logo)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs font-mono uppercase tracking-wider shadow-lg disabled:opacity-50"
            >
              {submitting ? 'Submitting Report...' : 'Submit Community Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
