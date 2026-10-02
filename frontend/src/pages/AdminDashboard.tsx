import React, { useState, useEffect } from 'react';
import { Terminal, Check, X, ShieldAlert, AlertCircle, RefreshCw, Filter } from 'lucide-react';
import { fetchAdminReports, updateReportStatus } from '../services/api';
import { ReportItem } from '../types';
import { VerdictBadge } from '../components/VerdictBadge';

export const AdminDashboard: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [summary, setSummary] = useState<{ total: number; counts: Record<string, number> }>({
    total: 0,
    counts: {},
  });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminReports(statusFilter || undefined);
      setReports(data.reports);
      setSummary(data.summary);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const handleUpdate = async (
    id: string,
    newStatus: 'PENDING' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'REJECTED'
  ) => {
    setUpdatingId(id);
    try {
      await updateReportStatus(id, newStatus);
      await loadReports();
    } catch {
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <Terminal className="w-4 h-4" />
            <span>Admin Threat Operations</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Community Report Triage</h1>
        </div>

        <button
          onClick={loadReports}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl glass-card border border-slate-700 text-xs font-mono text-slate-300 hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-2xl glass-card border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Total Reports</span>
          <span className="text-2xl font-bold font-mono text-white">{summary.total}</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-amber-500/30 bg-amber-500/5">
          <span className="text-xs text-amber-400 block mb-1">Pending Review</span>
          <span className="text-2xl font-bold font-mono text-amber-300">
            {summary.counts.PENDING || 0}
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-rose-500/30 bg-rose-500/5">
          <span className="text-xs text-rose-400 block mb-1">Confirmed Phishing</span>
          <span className="text-2xl font-bold font-mono text-rose-300">
            {summary.counts.CONFIRMED || 0}
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-emerald-500/30 bg-emerald-500/5">
          <span className="text-xs text-emerald-400 block mb-1">False Positives</span>
          <span className="text-2xl font-bold font-mono text-emerald-300">
            {summary.counts.FALSE_POSITIVE || 0}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
        <span className="text-xs font-mono text-slate-400 flex items-center space-x-1 mr-2">
          <Filter className="w-3.5 h-3.5" />
          <span>Status:</span>
        </span>
        {['', 'PENDING', 'CONFIRMED', 'FALSE_POSITIVE', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              statusFilter === st
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {st === '' ? 'ALL' : st}
          </button>
        ))}
      </div>

      {/* Reports Table / List */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            Loading triage queue...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            No reports matching filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {reports.map((rep) => (
              <div key={rep.id} className="p-5 hover:bg-slate-900/40 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase ${
                        rep.status === 'CONFIRMED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : rep.status === 'FALSE_POSITIVE'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : rep.status === 'REJECTED'
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {rep.status}
                    </span>

                    <span className="font-mono text-xs text-slate-300 font-semibold">
                      {rep.category.replace(/_/g, ' ')}
                    </span>

                    <span className="text-[11px] text-slate-500">
                      {new Date(rep.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Triage Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleUpdate(rep.id, 'CONFIRMED')}
                      disabled={updatingId === rep.id || rep.status === 'CONFIRMED'}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono disabled:opacity-30 transition-colors"
                    >
                      Confirm Phishing
                    </button>
                    <button
                      onClick={() => handleUpdate(rep.id, 'FALSE_POSITIVE')}
                      disabled={updatingId === rep.id || rep.status === 'FALSE_POSITIVE'}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono disabled:opacity-30 transition-colors"
                    >
                      False Positive
                    </button>
                    <button
                      onClick={() => handleUpdate(rep.id, 'REJECTED')}
                      disabled={updatingId === rep.id || rep.status === 'REJECTED'}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-mono disabled:opacity-30 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {rep.note && (
                  <div className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 mb-3">
                    <strong>User Note:</strong> {rep.note}
                  </div>
                )}

                {rep.scan && (
                  <div className="flex items-center space-x-3 text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                    <span>Scan Target: <strong>{rep.scan.hostname || 'QR Scan'}</strong></span>
                    <span>•</span>
                    <span>Verdict: <strong className="text-slate-200">{rep.scan.verdict} ({rep.scan.riskScore}/100)</strong></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
