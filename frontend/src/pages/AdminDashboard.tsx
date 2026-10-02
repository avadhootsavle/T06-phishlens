import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SlidersHorizontal,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Store,
  QrCode,
  Download,
  Ban,
  ShieldCheck,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchAdminReports,
  updateReportStatus,
  fetchMerchants,
  createMerchant,
  revokeMerchant,
} from '../services/api';
import { ReportItem, MerchantRecord } from '../types';
import { VerdictBadge } from '../components/VerdictBadge';

export const AdminDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'merchants' ? 'merchants' : 'reports';
  const [activeTab, setActiveTab] = useState<'reports' | 'merchants'>(initialTab);

  // --- Reports State ---
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [summary, setSummary] = useState<{ total: number; counts: Record<string, number> }>({
    total: 0,
    counts: {},
  });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loadingReports, setLoadingReports] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // --- Merchants State ---
  const [merchants, setMerchants] = useState<MerchantRecord[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState<boolean>(false);
  const [newShopName, setNewShopName] = useState<string>('');
  const [newVpa, setNewVpa] = useState<string>('');
  const [newCity, setNewCity] = useState<string>('');
  const [registering, setRegistering] = useState<boolean>(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState<{
    merchant: MerchantRecord;
    token: string;
    stickerUrl: string;
  } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const data = await fetchAdminReports(statusFilter || undefined);
      setReports(data.reports);
      setSummary(data.summary);
    } catch {
      // Handle error
    } finally {
      setLoadingReports(false);
    }
  };

  const loadMerchantsList = async () => {
    setLoadingMerchants(true);
    try {
      const data = await fetchMerchants();
      setMerchants(data.merchants);
    } catch {
      // Handle error
    } finally {
      setLoadingMerchants(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    } else {
      loadMerchantsList();
    }
  }, [activeTab, statusFilter]);

  const handleTabChange = (tab: 'reports' | 'merchants') => {
    setActiveTab(tab);
    setSearchParams(tab === 'merchants' ? { tab: 'merchants' } : {});
  };

  const handleUpdateReport = async (
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

  const handleRegisterMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    if (!newShopName.trim() || newShopName.trim().length < 2) {
      setRegisterError('Shop name must be at least 2 characters.');
      return;
    }

    if (!newVpa.trim() || !newVpa.includes('@')) {
      setRegisterError('Please enter a valid UPI VPA (e.g. shopname@upi).');
      return;
    }

    setRegistering(true);
    try {
      const res = await createMerchant({
        shopName: newShopName.trim(),
        vpa: newVpa.trim(),
        city: newCity.trim() || undefined,
      });

      setJustRegistered(res);
      setNewShopName('');
      setNewVpa('');
      setNewCity('');
      await loadMerchantsList();
    } catch (err: unknown) {
      setRegisterError((err as Error).message || 'Failed to register merchant');
    } finally {
      setRegistering(false);
    }
  };

  const handleRevoke = async (id: string, shopName: string) => {
    if (!window.confirm(`Are you sure you want to REVOKE verification for '${shopName}'? Future scans of this QR sticker will warn customers.`)) {
      return;
    }

    setRevokingId(id);
    try {
      await revokeMerchant(id);
      await loadMerchantsList();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to revoke merchant');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2 text-slate-600 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>PhishLens Control Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {activeTab === 'reports' ? 'Report Review & Triage' : 'Verified Merchant QR Registry'}
          </h1>
        </div>

        <button
          onClick={activeTab === 'reports' ? loadReports : loadMerchantsList}
          disabled={loadingReports || loadingMerchants}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-700 hover:text-slate-900 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingReports || loadingMerchants ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 mb-8">
        <button
          onClick={() => handleTabChange('reports')}
          className={`pb-3 px-4 text-xs font-mono uppercase tracking-wider font-semibold border-b-2 transition-colors ${
            activeTab === 'reports'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Reports Triage ({summary.total})
        </button>
        <button
          onClick={() => handleTabChange('merchants')}
          className={`pb-3 px-4 text-xs font-mono uppercase tracking-wider font-semibold border-b-2 transition-colors ${
            activeTab === 'merchants'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Verified Merchants ({merchants.length})
        </button>
      </div>

      {/* TAB 1: REPORTS */}
      {activeTab === 'reports' && (
        <div>
          {/* KPI Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 block mb-1">Total Submissions</span>
              <span className="text-2xl font-bold font-mono text-slate-900">{summary.total}</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-amber-700 block mb-1">Pending Review</span>
              <span className="text-2xl font-bold font-mono text-amber-800">
                {summary.counts.PENDING || 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-red-700 block mb-1">Confirmed Phishing</span>
              <span className="text-2xl font-bold font-mono text-red-800">
                {summary.counts.CONFIRMED || 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-emerald-700 block mb-1">False Positives</span>
              <span className="text-2xl font-bold font-mono text-emerald-800">
                {summary.counts.FALSE_POSITIVE || 0}
              </span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
            {['', 'PENDING', 'CONFIRMED', 'FALSE_POSITIVE', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors shrink-0 ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {st === '' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Reports Table / List */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {loadingReports ? (
              <div className="p-12 text-center text-xs text-slate-500 font-mono">
                Loading submissions...
              </div>
            ) : reports.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 font-mono">
                No reports found matching this criteria.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <div key={report.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-800">
                          {report.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {report.note && (
                        <p className="text-xs text-slate-700 mb-2 italic">"{report.note}"</p>
                      )}

                      {report.scan && (
                        <div className="flex items-center space-x-3 text-xs text-slate-600">
                          <VerdictBadge verdict={report.scan.verdict} size="sm" />
                          <span className="font-mono text-slate-800">{report.scan.hostname || 'QR Scan'}</span>
                          <span className="font-mono text-slate-500">Score: {report.scan.riskScore}/100</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleUpdateReport(report.id, 'CONFIRMED')}
                        disabled={updatingId === report.id || report.status === 'CONFIRMED'}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-40"
                      >
                        Confirm Scam
                      </button>
                      <button
                        onClick={() => handleUpdateReport(report.id, 'FALSE_POSITIVE')}
                        disabled={updatingId === report.id || report.status === 'FALSE_POSITIVE'}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-40"
                      >
                        False Positive
                      </button>
                      <button
                        onClick={() => handleUpdateReport(report.id, 'REJECTED')}
                        disabled={updatingId === report.id || report.status === 'REJECTED'}
                        className="px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIED MERCHANTS */}
      {activeTab === 'merchants' && (
        <div className="space-y-8">
          {/* Registration Form Card */}
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-2 text-slate-900 font-bold mb-1 text-base">
              <Store className="w-5 h-5 text-emerald-700" />
              <h2>Register Shop &amp; Issue Ed25519 Cryptographic Sticker</h2>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Generates a tamper-evident, cryptographically signed QR code sticker verified by the PhishLens public key.
            </p>

            {registerError && (
              <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            {justRegistered && (
              <div className="p-4 mb-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-sm">Successfully Registered: {justRegistered.merchant.shopName}</span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    VPA: <strong className="font-mono">{justRegistered.merchant.vpa}</strong> • Ed25519 Token Generated
                  </p>
                </div>

                <a
                  href={justRegistered.stickerUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Sticker PNG</span>
                </a>
              </div>
            )}

            <form onSubmit={handleRegisterMerchant} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="e.g. ABC Medical Store"
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  UPI VPA (Payee Address) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newVpa}
                  onChange={(e) => setNewVpa(e.target.value)}
                  placeholder="e.g. abcmedical@upi"
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  City (optional)
                </label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="e.g. Mumbai, Pune"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div className="sm:col-span-3 pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={registering}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{registering ? 'Signing & Registering...' : 'Register Shop & Issue Sticker'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Registered Merchants List */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                Registered Merchant Registry ({merchants.length})
              </span>
              <span className="text-[11px] font-mono text-slate-500">Ed25519 Trust Layer</span>
            </div>

            {loadingMerchants ? (
              <div className="p-12 text-center text-xs text-slate-500 font-mono">
                Loading merchants...
              </div>
            ) : merchants.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 font-mono">
                No merchants registered yet. Use the form above to issue your first sticker.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {merchants.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center space-x-2.5 mb-1">
                        <span className="font-bold text-slate-900 text-sm">{m.shopName}</span>
                        {m.status === 'ACTIVE' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-800 border border-red-200">
                            REVOKED
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-600 font-mono">
                        <span className="text-blue-700 font-medium">{m.vpa}</span>
                        {m.city && <span>• {m.city}</span>}
                        <span className="text-slate-400">• Registered {new Date(m.createdAt).toLocaleDateString()}</span>
                        {m.revokedAt && (
                          <span className="text-red-600">• Revoked {new Date(m.revokedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      {m.status === 'ACTIVE' && (
                        <a
                          href={`/api/v1/merchants/${m.id}/sticker.png`}
                          target="_blank"
                          rel="noreferrer"
                          download={`sticker_${m.shopName.replace(/[^a-zA-Z0-9]/g, '_')}.png`}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Download Sticker</span>
                        </a>
                      )}

                      {m.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleRevoke(m.id, m.shopName)}
                          disabled={revokingId === m.id}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs font-mono font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>{revokingId === m.id ? 'Revoking...' : 'Revoke'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400 italic">
                          Revoked &amp; Inactive
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
