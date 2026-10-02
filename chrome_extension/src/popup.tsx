import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
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

export const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'webpage' | 'scanner'>('webpage');
  const [data, setData] = useState<TabScanState | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentHostname, setCurrentHostname] = useState<string>('');

  // Screen QR Scan States
  const [isCapturing, setIsCapturing] = useState(false);
  const [qrResult, setQrResult] = useState<QrScanResult | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoBlockDangerous, setAutoBlockDangerous] = useState(true);

  useEffect(() => {
    // 1. Load active tab and scan state
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id && activeTab.url) {
        try {
          const parsed = new URL(activeTab.url);
          setCurrentHostname(parsed.hostname);
        } catch {
          setCurrentHostname(activeTab.url);
        }

        chrome.storage.local.get([`scan_${activeTab.id}`, 'autoBlockDangerous'], (result) => {
          if (result[`scan_${activeTab.id}`]) {
            setData(result[`scan_${activeTab.id}`]);
          }
          if (result.autoBlockDangerous !== undefined) {
            setAutoBlockDangerous(result.autoBlockDangerous);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for real-time updates from background / content scripts
    const messageListener = (message: any) => {
      if (message.type === 'SCAN_RESULT' && message.data) {
        setData(message.data);
        setLoading(false);
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const toggleAutoBlock = () => {
    const newVal = !autoBlockDangerous;
    setAutoBlockDangerous(newVal);
    chrome.storage.local.set({ autoBlockDangerous: newVal });
  };

  const openPwa = () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  };

  // Primary Feature: Capture active screen and detect QR
  const handleCaptureScreenQr = async () => {
    setIsCapturing(true);
    setQrError(null);
    setQrResult(null);

    try {
      chrome.tabs.captureVisibleTab({ format: 'png' }, async (dataUrl) => {
        if (!dataUrl || chrome.runtime.lastError) {
          setQrError(chrome.runtime.lastError?.message || 'Unable to capture tab.');
          setIsCapturing(false);
          return;
        }

        try {
          const qrText = await detectQrFromScreenshot(dataUrl);
          if (!qrText) {
            setQrError('No QR code detected on this screen. Make sure the QR code is visible.');
            setIsCapturing(false);
            return;
          }

          await handleAnalyzePayload(qrText);
        } catch {
          setQrError('Failed while parsing the on-screen QR image.');
          setIsCapturing(false);
        }
      });
    } catch {
      setQrError('Could not access screen capture.');
      setIsCapturing(false);
    }
  };

  const handleAnalyzePayload = async (payloadString: string, expectedIntent?: string) => {
    setIsCapturing(true);
    setQrError(null);

    try {
      const response = await fetch('http://localhost:5001/api/v1/scans/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrContent: payloadString,
          expectedIntent: expectedIntent || 'PAY_MERCHANT',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Backend evaluation failed.');
      }

      const scanRes: QrScanResult = await response.json();
      scanRes.rawContent = payloadString;
      setQrResult(scanRes);
      setActiveTab('scanner'); // auto-switch to scanner tab to show result
    } catch (err: any) {
      setQrError(err.message || 'Verification failed.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    setQrError(null);
    setQrResult(null);

    const imgUrl = URL.createObjectURL(file);
    const codeReader = new BrowserQRCodeReader();

    try {
      const result = await codeReader.decodeFromImageUrl(imgUrl);
      URL.revokeObjectURL(imgUrl);
      if (result) {
        await handleAnalyzePayload(result.getText());
      }
    } catch {
      setQrError('No readable QR code found in this image.');
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
    <div style={{ padding: '14px', boxSizing: 'border-box', background: '#f8f9fa', minHeight: '440px', color: '#0f172a' }}>
      {/* Clean Header: Active Domain & Status Indicator (No logo, No app name) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '10px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              flexShrink: 0,
              background:
                pageVerdict === 'DANGER' ? '#dc2626' : pageVerdict === 'CAUTION' ? '#d97706' : '#16a34a',
            }}
          />
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: '600',
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '250px',
            }}
            title={currentHostname}
          >
            {currentHostname || 'Inspection Console'}
          </span>
        </div>

        <button
          onClick={openPwa}
          title="Open Full Dashboard"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '4px',
          }}
        >
          <ExternalLink size={13} />
        </button>
      </div>

      {/* Segmented Control: [ Webpage ] [ Scan QR ] */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#e2e8f0',
          padding: '2px',
          borderRadius: '7px',
          marginBottom: '12px',
        }}
      >
        <button
          onClick={() => setActiveTab('webpage')}
          style={{
            padding: '5px 0',
            border: 'none',
            borderRadius: '5px',
            background: activeTab === 'webpage' ? '#ffffff' : 'transparent',
            color: activeTab === 'webpage' ? '#0f172a' : '#64748b',
            fontSize: '11px',
            fontWeight: activeTab === 'webpage' ? '600' : '500',
            cursor: 'pointer',
            boxShadow: activeTab === 'webpage' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            transition: 'all 0.15s ease',
          }}
        >
          <Globe size={12} />
          <span>Webpage Security</span>
        </button>

        <button
          onClick={() => setActiveTab('scanner')}
          style={{
            padding: '5px 0',
            border: 'none',
            borderRadius: '5px',
            background: activeTab === 'scanner' ? '#ffffff' : 'transparent',
            color: activeTab === 'scanner' ? '#0f172a' : '#64748b',
            fontSize: '11px',
            fontWeight: activeTab === 'scanner' ? '600' : '500',
            cursor: 'pointer',
            boxShadow: activeTab === 'scanner' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            transition: 'all 0.15s ease',
          }}
        >
          <QrCode size={12} />
          <span>Screen QR</span>
        </button>
      </div>

      {/* TAB 1: WEBPAGE SECURITY */}
      {activeTab === 'webpage' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: '12px' }}>
              <RefreshCw size={16} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              Inspecting destination...
            </div>
          ) : !data ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                Ready to inspect
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', lineHeight: '1.4' }}>
                Navigate to any website to evaluate domain registration, brand claims, and credential safety.
              </div>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '6px 12px',
                  background: '#0f172a',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Refresh Tab
              </button>
            </div>
          ) : (
            <div>
              {/* Verdict Summary Card */}
              <div
                style={{
                  background:
                    pageVerdict === 'DANGER' ? '#fef2f2' : pageVerdict === 'CAUTION' ? '#fffbeb' : '#f0fdf4',
                  border: `1px solid ${
                    pageVerdict === 'DANGER' ? '#fecaca' : pageVerdict === 'CAUTION' ? '#fde68a' : '#bbf7d0'
                  }`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {pageVerdict === 'DANGER' ? (
                      <AlertOctagon size={15} color="#b91c1c" />
                    ) : pageVerdict === 'CAUTION' ? (
                      <AlertTriangle size={15} color="#b45309" />
                    ) : (
                      <CheckCircle2 size={15} color="#15803d" />
                    )}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color:
                          pageVerdict === 'DANGER' ? '#b91c1c' : pageVerdict === 'CAUTION' ? '#b45309' : '#15803d',
                      }}
                    >
                      {pageVerdict === 'DANGER'
                        ? 'Dangerous Website'
                        : pageVerdict === 'CAUTION'
                        ? 'Exercise Caution'
                        : 'No Phishing Detected'}
                    </span>
                  </div>

                  <span style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>
                    {data.riskScore} <span style={{ fontSize: '10px', color: '#64748b' }}>/ 100</span>
                  </span>
                </div>

                <div style={{ fontSize: '11px', fontWeight: '500', color: '#0f172a', lineHeight: '1.4' }}>
                  {data.explanation}
                </div>
              </div>

              {/* Identity & Signal Breakdown (Clean key-value rows) */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  padding: '10px 12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>Claimed brand</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>
                    {data.intentGuard?.claimedBrand || 'None claimed'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>Official domain</span>
                  <span style={{ fontWeight: '600', color: data.intentGuard?.isOfficialDomain ? '#16a34a' : '#64748b' }}>
                    {data.intentGuard?.isOfficialDomain ? 'Verified' : 'Unregistered'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>Form fields</span>
                  <span style={{ fontWeight: '600', color: data.intentGuard?.hasCredentialTrap ? '#dc2626' : '#16a34a' }}>
                    {data.intentGuard?.hasCredentialTrap ? 'Credential trap detected' : 'Clean'}
                  </span>
                </div>
              </div>

              {/* Observed Signals List */}
              {data.why && data.why.length > 0 && (
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    padding: '8px 12px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                    Signals:
                  </div>
                  {data.why.slice(0, 3).map((item, idx) => (
                    <div key={idx} style={{ fontSize: '11px', color: '#334155', marginBottom: '3px', lineHeight: '1.3' }}>
                      • {item}
                    </div>
                  ))}
                </div>
              )}

              {/* Auto-Block Toggle Switch */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#0f172a' }}>
                    Auto-block high risk sites
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    Intercepts dangerous sites before navigation
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
                      boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                    }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCAN ON-SCREEN QR */}
      {activeTab === 'scanner' && (
        <div>
          {/* Capture Button */}
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
              fontWeight: '600',
              cursor: isCapturing ? 'not-allowed' : 'pointer',
              opacity: isCapturing ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '8px',
              transition: 'background 0.15s ease',
            }}
          >
            {isCapturing ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Scanning active tab...</span>
              </>
            ) : (
              <>
                <Camera size={14} />
                <span>Scan QR on current page</span>
              </>
            )}
          </button>

          <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', marginBottom: '10px' }}>
            Takes a temporary screen snapshot to decode on-screen QR codes or UPI payments.
          </div>

          {/* QR Error Banner */}
          {qrError && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '8px 10px',
                marginBottom: '10px',
                fontSize: '11px',
                color: '#92400e',
                lineHeight: '1.4',
              }}
            >
              {qrError}
            </div>
          )}

          {/* Captured QR Result Display */}
          {qrResult && (
            <div style={{ marginBottom: '10px' }}>
              <div
                style={{
                  background:
                    qrResult.verdict === 'DANGER' ? '#fef2f2' : qrResult.verdict === 'CAUTION' ? '#fffbeb' : '#f0fdf4',
                  border: `1px solid ${
                    qrResult.verdict === 'DANGER' ? '#fecaca' : qrResult.verdict === 'CAUTION' ? '#fde68a' : '#bbf7d0'
                  }`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {qrResult.verdict === 'DANGER' ? (
                      <AlertOctagon size={15} color="#b91c1c" />
                    ) : qrResult.verdict === 'CAUTION' ? (
                      <AlertTriangle size={15} color="#b45309" />
                    ) : (
                      <CheckCircle2 size={15} color="#15803d" />
                    )}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color:
                          qrResult.verdict === 'DANGER'
                            ? '#b91c1c'
                            : qrResult.verdict === 'CAUTION'
                            ? '#b45309'
                            : '#15803d',
                      }}
                    >
                      {qrResult.verdict === 'DANGER'
                        ? 'Dangerous'
                        : qrResult.verdict === 'CAUTION'
                        ? 'Caution Advised'
                        : 'Safe'}
                    </span>
                  </div>

                  <span style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>
                    {qrResult.riskScore} <span style={{ fontSize: '10px', color: '#64748b' }}>/ 100</span>
                  </span>
                </div>

                <div style={{ fontSize: '11px', fontWeight: '500', color: '#0f172a', lineHeight: '1.4', marginBottom: '6px' }}>
                  {qrResult.explanation}
                </div>

                {qrResult.rawContent && (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
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
                      title="Copy"
                    >
                      {copied ? <Check size={11} color="#15803d" /> : <Copy size={11} />}
                    </button>
                  </div>
                )}
              </div>

              {/* UPI PaymentTruth Semantics */}
              {qrResult.paymentTruth?.isUPI && (
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '8px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: '#64748b' }}>Recipient</span>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>
                      {qrResult.paymentTruth.payeeName || 'Unknown'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: '#64748b' }}>UPI ID</span>
                    <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>
                      {qrResult.paymentTruth.upiId}
                    </span>
                  </div>
                  {qrResult.paymentTruth.amount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ color: '#64748b' }}>Amount</span>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>
                        ₹{qrResult.paymentTruth.amount}
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: '4px',
                      paddingTop: '4px',
                      borderTop: '1px solid #f1f5f9',
                      color: qrResult.paymentTruth.intentMismatch ? '#dc2626' : '#334155',
                      fontWeight: qrResult.paymentTruth.intentMismatch ? '600' : 'normal',
                    }}
                  >
                    {qrResult.paymentTruth.actionDescription}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {qrResult.rawContent && /^https?:\/\//i.test(qrResult.rawContent) && (
                  <button
                    onClick={() => {
                      if (qrResult.verdict === 'DANGER') {
                        if (confirm('Warning: Flagged as dangerous. Open anyway?')) {
                          chrome.tabs.create({ url: qrResult.rawContent });
                        }
                      } else {
                        chrome.tabs.create({ url: qrResult.rawContent });
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
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
                    padding: '6px 10px',
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

          {/* Test Vectors & Image Upload */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '10px',
              border: '1px solid #e2e8f0',
              marginTop: '8px',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
              Test presets:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => handleAnalyzePayload('https://sbi-online-banking-portal.net/login')}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  background: '#f8f9fa',
                  border: '1px solid #e2e8f0',
                  fontSize: '10px',
                  fontWeight: '500',
                  color: '#0f172a',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Fake Bank Link
              </button>
              <button
                type="button"
                onClick={() => handleAnalyzePayload('upi://pay?pa=rahul@upi&pn=Rahul%20Kumar&am=5000', 'RECEIVE_MONEY')}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  background: '#f8f9fa',
                  border: '1px solid #e2e8f0',
                  fontSize: '10px',
                  fontWeight: '500',
                  color: '#b91c1c',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Reverse Payment
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
              <span>Or drop QR image file</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('popup-root') as HTMLElement);
root.render(<Popup />);
