import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Flag, CheckCircle2, ArrowLeft, AlertCircle, Globe } from 'lucide-react';
import { submitReport } from '../services/api';

export const ReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const scanId = searchParams.get('scanId') || undefined;
  const initialUrl = searchParams.get('url') || '';

  const [websiteUrl, setWebsiteUrl] = useState<string>(initialUrl);
  const [category, setCategory] = useState<string>('PHISHING_WEBSITE');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: 'PHISHING_WEBSITE', label: 'Phishing or Impersonation Website' },
    { value: 'BRAND_IMPERSONATION', label: 'Unauthorized Brand Impersonation' },
    { value: 'SUSPICIOUS_PAYMENT', label: 'Fraudulent UPI Payment Request' },
    { value: 'INCORRECT_RECIPIENT', label: 'Payee Name or Shop Mismatch' },
    { value: 'FALSE_POSITIVE', label: 'Incorrect Warning (Legitimate Site Marked Risky)' },
    { value: 'OTHER', label: 'Other Security Suspicion' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scanId && !websiteUrl.trim() && !note.trim()) {
      setError('Please provide a website URL or description of the suspicious activity.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitReport(scanId, category, note.trim() || undefined, websiteUrl.trim() || undefined);
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
        className="inline-flex items-center space-x-1.5 text-xs font-mono text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>

      <div className="p-6 sm:p-8 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center justify-center">
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Report a Phishing Website</h1>
            <p className="text-xs text-slate-600">
              Submit suspicious URLs, impersonation attempts, or false positive warnings for triage.
            </p>
          </div>
        </div>

        {success ? (
          <div className="p-6 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900 mb-1">Report Logged</h3>
            <p className="text-xs text-slate-600 mb-6 max-w-sm mx-auto">
              Your feedback has been saved and queued for admin review and community threat intelligence.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => {
                  setSuccess(false);
                  setWebsiteUrl('');
                  setNote('');
                }}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Report Another
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {scanId && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-500 block mb-0.5">Linked Scan ID</span>
                <span className="font-mono text-slate-900 font-semibold">{scanId}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                Website URL or Link
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example-fake-login.com"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Enter the full web address or domain that you believe is malicious or suspicious.
              </p>
            </div>

            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                Report Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                Observation Details (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Describe what occurred, e.g. received via SMS claiming electricity bill discount, asked for debit card details..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              {submitting ? 'Submitting Report...' : 'Submit Report for Triage'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
