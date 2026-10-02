import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Shield,
  QrCode,
  Globe,
  Camera,
  ExternalLink,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { BrowserQRCodeReader } from '@zxing/browser';

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
}

interface QrScanResult {
  scanId: string;
  inputType: string;
  verdict: 'SAFE' | 'CAUTION' | 'DANGER';
  riskScore: number;
  explanation: string;
  why: string[];
  rawContent?: string;
  url?: string;
  paymentTruth?: {
    isUPI: boolean;
    upiId?: string;
    payeeName?: string;
    amount?: string | null;
    actionDescription: string;
    intentMismatch: boolean;
    merchantMatchStatus?: string;
  };
}

// Multi-scale + inverted QR code detection from captured tab screenshot
async function detectQrFromScreenshot(dataUrl: string): Promise<string | null> {
  const codeReader = new BrowserQRCodeReader();

  // 1. Direct decode
  try {
    const result = await codeReader.decodeFromImageUrl(dataUrl);
    if (result && result.getText()) {
      return result.getText();
    }
  } catch {
    // Continue to canvas scaling
  }

  // 2. Multi-scale canvas decode
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const scales = [0.75, 0.5, 1.25];
      for (const scale of scales) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const res = await codeReader.decodeFromCanvas(canvas);
          if (res && res.getText()) {
            resolve(res.getText());
            return;
          }
        } catch {
          // Continue
        }
      }

      // 3. Color inversion attempt (for dark mode QR codes)
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            d[i] = 255 - d[i];
            d[i + 1] = 255 - d[i + 1];
            d[i + 2] = 255 - d[i + 2];
          }
          ctx.putImageData(imgData, 0, 0);
          const res = await codeReader.decodeFromCanvas(canvas);
          if (res && res.getText()) {
            resolve(res.getText());
            return;
          }
        }
      } catch {
        // Continue
      }

      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

const Popup: React.FC = () => {
  const [data, setData] = useState<TabScanState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoBlockDangerous, setAutoBlockDangerous] = useState<boolean>(true);

  // Screen QR Capture States
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [qrResult, setQrResult] = useState<QrScanResult | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showWebpageSection, setShowWebpageSection] = useState<boolean>(true);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id && activeTab.url) {
        const stored = await chrome.storage.local.get([`tab_${activeTab.id}`, 'autoBlockDangerous']);
        if (stored[`tab_${activeTab.id}`]) {
          setData(stored[`tab_${activeTab.id}`]);
        }
        if (stored.autoBlockDangerous !== undefined) {
          setAutoBlockDangerous(stored.autoBlockDangerous);
        }
      }
      setLoading(false);
    });
  }, []);

  const toggleAutoBlock = async () => {
    const newVal = !autoBlockDangerous;
    setAutoBlockDangerous(newVal);
    await chrome.storage.local.set({ autoBlockDangerous: newVal });
  };

  const openPwa = () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  };

  // Perform Screen Capture & QR Analysis
  const handleCaptureScreenQr = async () => {
    setIsCapturing(true);
    setQrError(null);
    setQrResult(null);

    chrome.tabs.captureVisibleTab(null as unknown as number, { format: 'png' }, async (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        setQrError('Failed to capture active tab screenshot. Make sure Chrome permissions are enabled.');
        setIsCapturing(false);
        return;
      }

      try {
        const detectedPayload = await detectQrFromScreenshot(dataUrl);

        if (!detectedPayload) {
          setQrError('No QR code detected on this webpage. Ensure the QR code is clearly visible in the browser viewport and try again.');
          setIsCapturing(false);
          return;
        }

        // Send detected payload to backend /api/v1/scans/qr
        const response = await fetch('http://localhost:5001/api/v1/scans/qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qrContent: detectedPayload,
            expectedIntent: 'NOT_SURE',
          }),
        });

        if (!response.ok) {
          throw new Error(`Scanner error: HTTP ${response.status}`);
        }

        const scanData: QrScanResult = await response.json();
        setQrResult({
          ...scanData,
          rawContent: detectedPayload,
        });
      } catch (err: unknown) {
        setQrError((err as Error).message || 'Failed to inspect QR code.');
      } finally {
        setIsCapturing(false);
      }
    });
  };

  // Analyze a test or uploaded QR payload directly
  const handleAnalyzePayload = async (payload: string, expectedIntent: 'PAY_MERCHANT' | 'RECEIVE_MONEY' | 'NOT_SURE' = 'NOT_SURE') => {
    setIsCapturing(true);
    setQrError(null);
    setQrResult(null);

    try {
      const response = await fetch('http://localhost:5001/api/v1/scans/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrContent: payload,
          expectedIntent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Scanner error: HTTP ${response.status}`);
      }

      const scanData: QrScanResult = await response.json();
      setQrResult({
        ...scanData,
        rawContent: payload,
      });
    } catch (err: unknown) {
      setQrError((err as Error).message || 'Analysis failed');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    setQrError(null);
    const codeReader = new BrowserQRCodeReader();
    const imgUrl = URL.createObjectURL(file);

    try {
      const result = await codeReader.decodeFromImageUrl(imgUrl);
      URL.revokeObjectURL(imgUrl);
      if (result) {
        await handleAnalyzePayload(result.getText());
      }
    } catch {
      setQrError('No readable QR code found in the uploaded image.');
      setIsCapturing(false);
    }
  };

  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pageVerdict = data?.verdict || 'SAFE';

  return (
    <div style={{ padding: '14px', boxSizing: 'border-box', background: '#f8f9fa', minHeight: '430px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>PhishLens</div>
            <div style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase' }}>Security Layer</div>
          </div>
        </div>

        <button
          onClick={openPwa}
          title="Open Web Dashboard"
          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. PRIMARY FEATURE: CAPTURE SCREEN QR BUTTON & ACTION CARD    */}
      {/* ============================================================== */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '10px',
          padding: '12px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <QrCode size={15} color="#0f172a" />
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
              On-Screen QR & UPI Scanner
            </span>
          </div>
          <span style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace', fontWeight: '600' }}>
            SCREEN DETECT
          </span>
        </div>

        <button
          onClick={handleCaptureScreenQr}
          disabled={isCapturing}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#0f172a',
            color: '#ffffff',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            cursor: isCapturing ? 'not-allowed' : 'pointer',
            opacity: isCapturing ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background 0.15s ease',
          }}
        >
          {isCapturing ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Scanning Webpage for QR Code...</span>
            </>
          ) : (
            <>
              <Camera size={15} />
              <span>Capture & Scan QR on Current Page</span>
            </>
          )}
        </button>

        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px', textAlign: 'center', lineHeight: '1.3' }}>
          Takes a snapshot of the visible tab to inspect UPI payments or hidden QR links.
        </div>
      </div>

      {/* Captured Screen QR Result Display */}
      {qrResult && (
        <div style={{ marginBottom: '14px' }}>
          {/* Decision Action Banner ("Click or Not / Pay or Not") */}
          <div
            style={{
              background: qrResult.verdict === 'DANGER' ? '#fef2f2' : qrResult.verdict === 'CAUTION' ? '#fffbeb' : '#f0fdf4',
              border: `1px solid ${qrResult.verdict === 'DANGER' ? '#fecaca' : qrResult.verdict === 'CAUTION' ? '#fde68a' : '#bbf7d0'}`,
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '10px',
            }}
          >
            {/* Decision Headline */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {qrResult.verdict === 'DANGER' ? (
                  <AlertOctagon size={16} color="#b91c1c" />
                ) : qrResult.verdict === 'CAUTION' ? (
                  <AlertTriangle size={16} color="#b45309" />
                ) : (
                  <CheckCircle2 size={16} color="#15803d" />
                )}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: qrResult.verdict === 'DANGER' ? '#b91c1c' : qrResult.verdict === 'CAUTION' ? '#b45309' : '#15803d',
                    letterSpacing: '-0.2px',
                  }}
                >
                  {qrResult.verdict === 'DANGER'
                    ? qrResult.paymentTruth?.isUPI ? 'DO NOT PAY / FRAUD DETECTED' : 'DO NOT CLICK / MALICIOUS LINK'
                    : qrResult.verdict === 'CAUTION'
                    ? qrResult.paymentTruth?.isUPI ? 'EXERCISE CAUTION / CONFIRM RECIPIENT' : 'PROCEED WITH CAUTION'
                    : qrResult.paymentTruth?.isUPI ? 'SAFE TO PAY / VERIFIED UPI' : 'SAFE TO CLICK / PROCEED'}
                </span>
              </div>

              <span style={{ fontSize: '15px', fontWeight: '800', fontFamily: 'monospace', color: '#0f172a' }}>
                {qrResult.riskScore} <span style={{ fontSize: '10px', color: '#64748b' }}>/100</span>
              </span>
            </div>

            {/* Explanation */}
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', lineHeight: '1.4', marginBottom: '8px' }}>
              {qrResult.explanation}
            </div>

            {/* Decoded Content */}
            {qrResult.rawContent && (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    color: '#475569',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {qrResult.rawContent}
                </span>
                <button
                  onClick={() => handleCopyContent(qrResult.rawContent!)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b' }}
                  title="Copy QR Payload"
                >
                  {copied ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </div>

          {/* PaymentTruth Semantics */}
          {qrResult.paymentTruth?.isUPI && (
            <div style={{ background: '#ffffff', borderRadius: '8px', padding: '10px', border: '1px solid #e2e8f0', marginBottom: '10px', fontSize: '11px' }}>
              <div style={{ color: '#0f172a', fontWeight: '700', fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>
                PaymentTruth™ Semantics
              </div>
              <div style={{ color: '#475569', marginBottom: '2px' }}>
                Payee: <strong style={{ color: '#0f172a' }}>{qrResult.paymentTruth.payeeName || 'Unknown'}</strong>
              </div>
              <div style={{ color: '#475569', marginBottom: '2px' }}>
                UPI ID: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{qrResult.paymentTruth.upiId}</strong>
              </div>
              {qrResult.paymentTruth.amount && (
                <div style={{ color: '#475569', marginBottom: '2px' }}>
                  Amount: <strong style={{ color: '#0f172a' }}>₹{qrResult.paymentTruth.amount}</strong>
                </div>
              )}
              <div style={{ color: qrResult.paymentTruth.intentMismatch ? '#b91c1c' : '#475569', fontWeight: '600', marginTop: '4px' }}>
                {qrResult.paymentTruth.actionDescription}
              </div>
            </div>
          )}

          {/* Observed Signals */}
          {qrResult.why && qrResult.why.length > 0 && (
            <div style={{ background: '#ffffff', borderRadius: '8px', padding: '10px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', fontFamily: 'monospace', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Observed Evidence:
              </div>
              {qrResult.why.map((reason, idx) => (
                <div key={idx} style={{ fontSize: '11px', color: '#475569', marginBottom: '2px', lineHeight: '1.3' }}>
                  • {reason}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {qrResult.rawContent && /^https?:\/\//i.test(qrResult.rawContent) && (
              <button
                onClick={() => {
                  if (qrResult.verdict === 'DANGER') {
                    if (confirm('Warning: Flagged as DANGEROUS phishing. Open anyway?')) {
                      chrome.tabs.create({ url: qrResult.rawContent });
                    }
                  } else {
                    chrome.tabs.create({ url: qrResult.rawContent });
                  }
                }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: qrResult.verdict === 'DANGER' ? '#fee2e2' : '#0f172a',
                  color: qrResult.verdict === 'DANGER' ? '#b91c1c' : '#ffffff',
                  border: qrResult.verdict === 'DANGER' ? '1px solid #fca5a5' : 'none',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {qrResult.verdict === 'DANGER' ? 'Open Anyway' : 'Open Link'}
              </button>
            )}

            <button
              onClick={handleCaptureScreenQr}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Scan Again
            </button>
          </div>
        </div>
      )}

      {/* Screen QR Error Banner */}
      {qrError && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '12px',
            fontSize: '11px',
            color: '#92400e',
            lineHeight: '1.4',
          }}
        >
          <div style={{ fontWeight: '700', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={13} color="#b45309" />
            <span>Detection Status</span>
          </div>
          {qrError}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. WEBPAGE SAFETY SECTION (URL VERDICT & AUTO-BLOCK)           */}
      {/* ============================================================== */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
        <div
          onClick={() => setShowWebpageSection(!showWebpageSection)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={13} color="#64748b" />
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', fontFamily: 'monospace' }}>
              Current Webpage Status
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#64748b' }}>
            {showWebpageSection ? 'Hide ▲' : 'Show ▼'}
          </span>
        </div>

        {showWebpageSection && (
          <div>
            {/* Auto-Block Toggle Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '8px',
                padding: '8px 10px',
                border: '1px solid #e2e8f0',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#0f172a' }}>
                  Auto-Block Dangerous Sites (&gt;70)
                </div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>
                  {autoBlockDangerous ? 'Active threat defense ON' : 'Warning banner only'}
                </div>
              </div>
              <button
                type="button"
                onClick={toggleAutoBlock}
                style={{
                  width: '32px',
                  height: '18px',
                  borderRadius: '9px',
                  background: autoBlockDangerous ? '#0f172a' : '#cbd5e1',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  padding: '0',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: '2px',
                    left: autoBlockDangerous ? '16px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748b', fontSize: '12px' }}>
                Scanning active webpage...
              </div>
            ) : !data ? (
              <div style={{ background: '#ffffff', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', marginBottom: '2px' }}>Ready to Inspect</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px' }}>Navigate to any site to view live security verdicts.</div>
                <button
                  onClick={() => window.location.reload()}
                  style={{ padding: '5px 10px', background: '#0f172a', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Refresh Verdict
                </button>
              </div>
            ) : (
              <div>
                {/* Active Page Verdict Card */}
                <div
                  style={{
                    background: pageVerdict === 'DANGER' ? '#fef2f2' : pageVerdict === 'CAUTION' ? '#fffbeb' : '#f0fdf4',
                    border: `1px solid ${pageVerdict === 'DANGER' ? '#fecaca' : pageVerdict === 'CAUTION' ? '#fde68a' : '#bbf7d0'}`,
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#ffffff',
                        color: pageVerdict === 'DANGER' ? '#b91c1c' : pageVerdict === 'CAUTION' ? '#b45309' : '#15803d',
                        border: '1px solid currentColor',
                      }}
                    >
                      {data.verdict}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>
                      {data.riskScore} <span style={{ fontSize: '10px', color: '#64748b' }}>/100</span>
                    </span>
                  </div>

                  {/* Recommendation Decision Banner */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${pageVerdict === 'DANGER' ? '#fecaca' : pageVerdict === 'CAUTION' ? '#fde68a' : '#bbf7d0'}`,
                      borderRadius: '6px',
                      padding: '5px 8px',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {pageVerdict === 'DANGER' ? (
                      <AlertOctagon size={13} color="#b91c1c" />
                    ) : pageVerdict === 'CAUTION' ? (
                      <AlertTriangle size={13} color="#b45309" />
                    ) : (
                      <CheckCircle2 size={13} color="#15803d" />
                    )}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        color: pageVerdict === 'DANGER' ? '#b91c1c' : pageVerdict === 'CAUTION' ? '#b45309' : '#15803d',
                      }}
                    >
                      {pageVerdict === 'DANGER'
                        ? 'DO NOT CLICK / SUSPICIOUS'
                        : pageVerdict === 'CAUTION'
                        ? 'PROCEED WITH CAUTION'
                        : 'SAFE TO CLICK / PROCEED'}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#0f172a', lineHeight: '1.4', marginBottom: '4px' }}>
                    {data.explanation}
                  </div>

                  <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {data.url}
                  </div>
                </div>

                {/* IntentGuard Card */}
                {data.intentGuard && (
                  <div style={{ background: '#ffffff', borderRadius: '8px', padding: '10px', border: '1px solid #e2e8f0', marginBottom: '8px', fontSize: '11px' }}>
                    <div style={{ color: '#0f172a', fontWeight: '700', fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase', marginBottom: '3px' }}>
                      Identity Layer
                    </div>
                    <div style={{ color: '#475569' }}>
                      Claimed Brand: <strong style={{ color: '#0f172a' }}>{data.intentGuard.claimedBrand || 'None detected'}</strong>
                    </div>
                    <div style={{ color: data.intentGuard.isOfficialDomain ? '#15803d' : '#b91c1c', marginTop: '2px' }}>
                      Official Domain: <strong>{data.intentGuard.isOfficialDomain ? 'YES' : 'NO'}</strong>
                    </div>
                    {data.intentGuard.hasCredentialTrap && (
                      <div style={{ color: '#b91c1c', fontWeight: '600', marginTop: '3px' }}>
                        Sensitive credential inputs detected on unofficial host.
                      </div>
                    )}
                  </div>
                )}

                {/* Evidence List */}
                {data.why && data.why.length > 0 && (
                  <div style={{ background: '#ffffff', borderRadius: '8px', padding: '10px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', fontFamily: 'monospace', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Observed Evidence:
                    </div>
                    {data.why.slice(0, 3).map((item, idx) => (
                      <div key={idx} style={{ fontSize: '10px', color: '#475569', marginBottom: '2px', lineHeight: '1.3' }}>
                        • {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Demo Simulation & File Upload Box */}
      <div style={{ background: '#ffffff', borderRadius: '8px', padding: '10px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', fontFamily: 'monospace', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
          Test Scenarios / Image Upload:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
          <button
            onClick={() => handleAnalyzePayload('https://sbi-online-banking-portal.net/login')}
            style={{
              padding: '5px 8px',
              borderRadius: '5px',
              background: '#f8f9fa',
              border: '1px solid #e2e8f0',
              fontSize: '10px',
              fontWeight: '600',
              color: '#0f172a',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            Fake Bank Link QR
          </button>

          <button
            onClick={() => handleAnalyzePayload('upi://pay?pa=rahul@upi&pn=Rahul%20Kumar&am=5000', 'RECEIVE_MONEY')}
            style={{
              padding: '5px 8px',
              borderRadius: '5px',
              background: '#f8f9fa',
              border: '1px solid #e2e8f0',
              fontSize: '10px',
              fontWeight: '600',
              color: '#b91c1c',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            Reverse Payment QR
          </button>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '6px',
            borderRadius: '6px',
            border: '1px dashed #cbd5e1',
            fontSize: '10px',
            color: '#64748b',
            cursor: 'pointer',
          }}
        >
          <Upload size={12} />
          <span>Or Upload QR Image File</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('popup-root') as HTMLElement);
root.render(<Popup />);
