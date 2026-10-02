import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Shield, AlertTriangle, ShieldAlert, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface TabScanState {
  scanId: string;
  url: string;
  verdict: 'SAFE' | 'CAUTION' | 'DANGER';
  riskScore: number;
  explanation: string;
  why: string[];
  intentGuard?: {
    claimedBrand?: string;
    isOfficialDomain: boolean;
    hasCredentialTrap: boolean;
  };
  geminiAdvisor?: {
    apparentBrand?: string | null;
    legitimateOfficialDomain?: string | null;
    impersonationConfidence?: number;
    socialEngineeringTactics?: string[];
    summaryExplanation?: string;
    actionableAdvice?: string;
    threatLevel?: string;
  };
}

const Popup: React.FC = () => {
  const [data, setData] = useState<TabScanState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id && activeTab.url) {
        setCurrentUrl(activeTab.url);
        const stored = await chrome.storage.local.get(`tab_${activeTab.id}`);
        if (stored[`tab_${activeTab.id}`]) {
          setData(stored[`tab_${activeTab.id}`]);
        }
      }
      setLoading(false);
    });
  }, []);

  const openPwa = () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  };

  const colorStyles = {
    SAFE: {
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/20',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    CAUTION: {
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/20',
      text: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    DANGER: {
      border: 'border-rose-500/40',
      bg: 'bg-rose-950/25',
      text: 'text-rose-400',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
  };

  const verdict = data?.verdict || 'SAFE';
  const theme = colorStyles[verdict];

  return (
    <div style={{ padding: '16px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #06b6d4, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '-0.3px', color: '#fff' }}>PhishLens</div>
            <div style={{ fontSize: '9px', color: '#06b6d4', fontFamily: 'monospace', textTransform: 'uppercase' }}>Intent-Aware Security</div>
          </div>
        </div>

        <button
          onClick={openPwa}
          title="Open Web Dashboard"
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '12px' }}>
          Scanning active webpage...
        </div>
      ) : !data ? (
        <div style={{ background: '#111827', borderRadius: '12px', padding: '16px', border: '1px solid #1f293d', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>Ready to Scan</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>Navigate to any site to view live security verdicts.</div>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 14px', background: '#2563eb', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Refresh Verdict
          </button>
        </div>
      ) : (
        <div>
          {/* Main Verdict Card */}
          <div
            style={{
              background: verdict === 'DANGER' ? '#290c14' : verdict === 'CAUTION' ? '#241a0b' : '#08231c',
              border: `1px solid ${verdict === 'DANGER' ? '#ef4444' : verdict === 'CAUTION' ? '#f59e0b' : '#10b981'}`,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  padding: '3px 8px',
                  borderRadius: '20px',
                  background: 'rgba(255,255,255,0.1)',
                  color: verdict === 'DANGER' ? '#f87171' : verdict === 'CAUTION' ? '#fbbf24' : '#34d399',
                  border: '1px solid currentColor',
                }}
              >
                {data.verdict}
              </span>
              <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'monospace', color: '#fff' }}>
                {data.riskScore} <span style={{ fontSize: '10px', color: '#94a3b8' }}>/100</span>
              </span>
            </div>

            <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', lineHeight: '1.4', marginBottom: '6px' }}>
              {data.explanation}
            </div>

            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#06b6d4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.url}
            </div>
          </div>

          {/* IntentGuard Card */}
          {data.intentGuard && (
            <div style={{ background: '#111827', borderRadius: '12px', padding: '12px', border: '1px solid #1f293d', marginBottom: '12px', fontSize: '11px' }}>
              <div style={{ color: '#06b6d4', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: '6px' }}>
                INTENTGUARD™ IDENTITY
              </div>
              <div style={{ color: '#cbd5e1', marginBottom: '4px' }}>
                Claimed Brand: <strong>{data.intentGuard.claimedBrand || 'None detected'}</strong>
              </div>
              <div style={{ color: data.intentGuard.isOfficialDomain ? '#34d399' : '#f87171' }}>
                Official Domain: <strong>{data.intentGuard.isOfficialDomain ? 'YES' : 'NO'}</strong>
              </div>
              {data.intentGuard.hasCredentialTrap && (
                <div style={{ color: '#f87171', fontWeight: 'bold', marginTop: '4px' }}>
                  ⚠️ Sensitive credential inputs detected!
                </div>
              )}
            </div>
          )}

          {/* Gemini AI Threat Advisor Card */}
          {data.geminiAdvisor && (
            <div style={{ background: '#1e113a', borderRadius: '12px', padding: '12px', border: '1px solid rgba(168, 85, 247, 0.35)', marginBottom: '12px', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ color: '#c084fc', fontWeight: 'bold', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>✨</span> GEMINI 3.8 FLASH AI
                </div>
                <span style={{ fontSize: '9px', background: 'rgba(168, 85, 247, 0.2)', color: '#e9d5ff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  {data.geminiAdvisor.threatLevel}
                </span>
              </div>
              <div style={{ color: '#e2e8f0', marginBottom: '6px', lineHeight: '1.3' }}>
                {data.geminiAdvisor.summaryExplanation}
              </div>
              {data.geminiAdvisor.apparentBrand && (
                <div style={{ color: '#c084fc', fontSize: '10px' }}>
                  Impersonates: <strong>{data.geminiAdvisor.apparentBrand}</strong> (Official: {data.geminiAdvisor.legitimateOfficialDomain || 'N/A'})
                </div>
              )}
            </div>
          )}

          {/* Why list */}
          {data.why && data.why.length > 0 && (
            <div style={{ background: '#0f172a', borderRadius: '12px', padding: '12px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                Evidence:
              </div>
              {data.why.slice(0, 3).map((item, idx) => (
                <div key={idx} style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '4px', lineHeight: '1.3' }}>
                  • {item}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('popup-root')!).render(<Popup />);
