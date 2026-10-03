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
  Flag,
  Mail,
  Shield,
  Layers,
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

interface EmailLinkAnalysis {
  url: string;
  finalUrl?: string;
  text?: string;
  verdict: 'SAFE' | 'CAUTION' | 'DANGER';
  riskScore: number;
  explanation: string;
  why?: string[];
  isShortened?: boolean;
}

interface EmailReportResult {
  scanId?: string;
  emailVerdict: 'SAFE' | 'CAUTION' | 'DANGER';
  emailRiskScore: number;
  explanation: string;
  subject?: string;
  senderAnalysis?: {
    senderName?: string;
    senderEmail?: string;
    senderDomain?: string;
    isSpoofed?: boolean;
    claimedBrand?: string | null;
    details?: string;
  };
  urgencySignals?: string[];
  summary?: {
    totalLinks: number;
    dangerCount: number;
    cautionCount: number;
    safeCount: number;
  };
  linksAnalyzed?: EmailLinkAnalysis[];
}

interface GmailExtractedData {
  isGmail: boolean;
  isEmailOpen: boolean;
  subject: string;
  senderName: string;
  senderEmail: string;
  bodySnippet: string;
  links: Array<{ url: string; text: string }>;
}

// Pure function executed directly inside tab context via chrome.scripting.executeScript
function extractGmailDataInPage(): GmailExtractedData {
  const isGmail = window.location.hostname.includes('mail.google.com');
  if (!isGmail) {
    return {
      isGmail: false,
      isEmailOpen: false,
      subject: '',
      senderName: '',
      senderEmail: '',
      bodySnippet: '',
      links: [],
    };
  }

  // 1. Subject extraction
  const subjectEl =
    document.querySelector('h2.hP') ||
    document.querySelector('div[role="main"] h2') ||
    document.querySelector('h2[data-thread-perm-id]') ||
    document.querySelector('h2[data-legacy-thread-id]');
  let subject = subjectEl?.textContent?.trim() || '';
  if (!subject) {
    subject = document.title
      .replace(/\s*-\s*Gmail$/i, '')
      .replace(/^Inbox\s*\(\d+\)\s*-\s*/i, '')
      .replace(/^Inbox\s*-\s*/i, '')
      .trim();
  }

  // 2. Sender Name & Email
  const senderEl =
    document.querySelector('span.gD') ||
    document.querySelector('span[email]') ||
    document.querySelector('div[role="main"] span[email]') ||
    document.querySelector('div[role="main"] span.gD') ||
    document.querySelector('span.go');
  let senderName = senderEl?.getAttribute('name') || senderEl?.textContent?.trim() || '';
  let senderEmail = senderEl?.getAttribute('email') || '';

  if (!senderEmail) {
    const emailSpan = document.querySelector('span.go, div[role="main"] span.go');
    if (emailSpan) {
      const match =
        emailSpan.textContent?.match(/<([^>]+)>/) ||
        emailSpan.textContent?.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (match) senderEmail = match[1];
    }
  }
  if (!senderEmail && senderEl?.textContent) {
    const match =
      senderEl.textContent.match(/<([^>]+)>/) ||
      senderEl.textContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (match) senderEmail = match[1];
  }
  if (senderName && senderName.includes('<')) {
    senderName = senderName.split('<')[0].trim();
  }

  // 3. Email Body Containers
  const bodySelectors = [
    'div.a3s',
    'div.ii.gt',
    'div.adn',
    'div[role="listitem"] .ii',
    'div[role="listitem"]',
    'div[data-message-id]',
    'div.gs',
    'div[role="main"] table.cf',
    'div[role="main"] div[dir="ltr"]',
  ];
  const bodyElements = document.querySelectorAll(bodySelectors.join(', '));
  let activeBody: HTMLElement | null = null;
  if (bodyElements.length > 0) {
    for (let i = bodyElements.length - 1; i >= 0; i--) {
      const el = bodyElements[i] as HTMLElement;
      if (el.offsetParent !== null || el.clientHeight > 0) {
        activeBody = el;
        break;
      }
    }
    if (!activeBody) {
      activeBody = bodyElements[bodyElements.length - 1] as HTMLElement;
    }
  }

  const hasSubject =
    !!subject &&
    subject.toLowerCase() !== 'inbox' &&
    !subject.toLowerCase().startsWith('inbox (') &&
    subject.toLowerCase() !== 'gmail';
  const isEmailOpen = hasSubject || bodyElements.length > 0 || window.location.hash.length > 10;
  const bodySnippet =
    activeBody?.textContent?.slice(0, 800)?.trim() ||
    document.querySelector('div[role="main"]')?.textContent?.slice(0, 800)?.trim() ||
    '';

  // 4. Extract all embedded links inside active email body
  const roots = bodyElements.length > 0 ? Array.from(bodyElements) : [document.querySelector('div[role="main"]') || document.body];
  const rawLinks: Array<{ url: string; text: string }> = [];

  roots.forEach((root) => {
    if (!root) return;
    root.querySelectorAll('a[href]').forEach((a) => {
      let rawHref = (a.getAttribute('href') || '').trim();
      if (!rawHref) return;

      // Resolve Google redirect wrappers (google.com/url?q=...)
      if (rawHref.includes('google.com/url?') || rawHref.includes('google.com/url/')) {
        try {
          const parsed = new URL(rawHref);
          const targetQ = parsed.searchParams.get('q');
          if (targetQ) rawHref = targetQ;
        } catch {}
      }

      // Filter out internal Gmail actions & anchors
      if (
        rawHref.startsWith('https://mail.google.com') ||
        rawHref.startsWith('http://mail.google.com') ||
        rawHref.startsWith('https://accounts.google.com/SignOut') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('javascript:') ||
        rawHref === '#' ||
        rawHref.startsWith('#')
      ) {
        return;
      }

      const text =
        a.textContent?.trim() || a.getAttribute('title')?.trim() || a.getAttribute('aria-label')?.trim() || '';
      rawLinks.push({ url: rawHref, text });
    });
  });

  // Deduplicate links by URL
  const seen = new Set<string>();
  const uniqueLinks: Array<{ url: string; text: string }> = [];
  for (const l of rawLinks) {
    if (!seen.has(l.url)) {
      seen.add(l.url);
      uniqueLinks.push(l);
    }
  }

  return {
    isGmail: true,
    isEmailOpen,
    subject: subject || 'Active Email Message',
    senderName: senderName || 'Google User',
    senderEmail: senderEmail || 'user@example.com',
    bodySnippet,
    links: uniqueLinks,
  };
}

// Executes extraction directly inside tab using chrome.scripting.executeScript
async function extractEmailDataFromTab(tabId: number): Promise<GmailExtractedData | null> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractGmailDataInPage,
    });
    if (results && results[0]?.result) {
      return results[0].result as GmailExtractedData;
    }
  } catch (err) {
    console.warn('executeScript failed, falling back to message passing:', err);
  }

  try {
    const resp = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_GMAIL_DATA' });
    if (resp) return resp;
  } catch {}

  return null;
}

// Multi-scale + inverted QR code detection from captured tab screenshot
async function detectQrFromScreenshot(dataUrl: string): Promise<string | null> {
  const codeReader = new BrowserQRCodeReader();

  try {
    const result = await codeReader.decodeFromImageUrl(dataUrl);
    if (result && result.getText()) {
      return result.getText();
    }
  } catch {}

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
        } catch {}
      }

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
      } catch {}

      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'webpage' | 'scanner' | 'gmail'>('webpage');
  const [data, setData] = useState<TabScanState | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentHostname, setCurrentHostname] = useState<string>('');
  const [isGmailTab, setIsGmailTab] = useState(false);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);

  // Screen QR Scan States
  const [isCapturing, setIsCapturing] = useState(false);
  const [qrResult, setQrResult] = useState<QrScanResult | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoBlockDangerous, setAutoBlockDangerous] = useState(true);

  // Gmail Scanner States
  const [gmailData, setGmailData] = useState<GmailExtractedData | null>(null);
  const [isScanningEmail, setIsScanningEmail] = useState(false);
  const [emailReport, setEmailReport] = useState<EmailReportResult | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Load active tab and scan state
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const active = tabs[0];
      if (active?.id && active.url) {
        setCurrentTabId(active.id);
        let hostname = '';
        try {
          const parsed = new URL(active.url);
          hostname = parsed.hostname;
          setCurrentHostname(hostname);
        } catch {
          setCurrentHostname(active.url);
        }

        const isGmail = hostname.includes('mail.google.com') || active.url.includes('mail.google.com');
        setIsGmailTab(isGmail);

        if (isGmail) {
          setActiveTab('gmail');
          // Directly extract email metadata from the active Gmail tab
          const extracted = await extractEmailDataFromTab(active.id);
          if (extracted) {
            setGmailData(extracted);
          }
        }

        chrome.storage.local.get([`tab_${active.id}`, `scan_${active.id}`, `email_${active.id}`, 'autoBlockDangerous'], (result) => {
          const stored = result[`tab_${active.id}`] || result[`scan_${active.id}`];
          if (stored) {
            setData(stored);
          }
          if (result[`email_${active.id}`]) {
            setEmailReport(result[`email_${active.id}`]);
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
      } else if (message.type === 'GMAIL_EMAIL_SCANNED' && message.result) {
        setEmailReport(message.result);
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
      setActiveTab('scanner');
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

  // Gmail Scanner Feature
  const handleScanActiveEmail = async () => {
    setIsScanningEmail(true);
    setEmailError(null);

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const active = tabs[0];
      if (!active?.id) throw new Error('Active tab not found');

      // Direct execution inside the active tab
      let payload = await extractEmailDataFromTab(active.id);
      if (!payload) {
        payload = gmailData;
      } else {
        setGmailData(payload);
      }

      if (!payload || !payload.isEmailOpen) {
        throw new Error('Please select and open an email message in Gmail before scanning.');
      }

      const response = await fetch('http://localhost:5001/api/v1/scans/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Scan failed with status ${response.status}`);
      }

      const reportData: EmailReportResult = await response.json();
      setEmailReport(reportData);

      // Trigger in-page overlay directly inside Gmail tab
      try {
        await chrome.tabs.sendMessage(active.id, {
          type: 'SHOW_GMAIL_SCAN_OVERLAY',
          report: reportData,
        });
      } catch {}
    } catch (err: any) {
      setEmailError(err.message || 'Failed to analyze email.');
    } finally {
      setIsScanningEmail(false);
    }
  };

  const handleRunEmailPreset = async (preset: {
    subject: string;
    senderName: string;
    senderEmail: string;
    bodySnippet: string;
    links: Array<{ url: string; text: string }>;
  }) => {
    setIsScanningEmail(true);
    setEmailError(null);
    setEmailReport(null);

    try {
      const response = await fetch('http://localhost:5001/api/v1/scans/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Preset scan failed');
      }

      const reportData: EmailReportResult = await response.json();
      setEmailReport(reportData);

      if (currentTabId && isGmailTab) {
        try {
          await chrome.tabs.sendMessage(currentTabId, {
            type: 'SHOW_GMAIL_SCAN_OVERLAY',
            report: reportData,
          });
        } catch {}
      }
    } catch (err: any) {
      setEmailError(err.message || 'Failed to run test email simulation.');
    } finally {
      setIsScanningEmail(false);
    }
  };

  const handleShowInPageOverlay = async () => {
    if (!currentTabId || !emailReport) return;
    try {
      await chrome.tabs.sendMessage(currentTabId, {
        type: 'SHOW_GMAIL_SCAN_OVERLAY',
        report: emailReport,
      });
    } catch (e) {
      console.warn('Could not show in-page overlay:', e);
    }
  };

  const pageVerdict = data?.verdict || 'SAFE';

  return (
    <div style={{ padding: '14px', boxSizing: 'border-box', background: '#f8f9fa', minHeight: '460px', color: '#0f172a' }}>
      {/* Clean Header: Active Domain & Status Indicator */}
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
                activeTab === 'gmail' && emailReport
                  ? emailReport.emailVerdict === 'DANGER'
                    ? '#dc2626'
                    : emailReport.emailVerdict === 'CAUTION'
                    ? '#d97706'
                    : '#16a34a'
                  : pageVerdict === 'DANGER'
                  ? '#dc2626'
                  : pageVerdict === 'CAUTION'
                  ? '#d97706'
                  : '#16a34a',
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
              maxWidth: '240px',
            }}
            title={currentHostname}
          >
            {isGmailTab ? 'Gmail Sentinel Security' : currentHostname || 'Inspection Console'}
          </span>
        </div>

        <button
          onClick={openPwa}
          title="Open Full PhishLens Dashboard"
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

      {/* Segmented Control: [ Webpage ] [ Screen QR ] [ Gmail ] */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1.1fr',
          background: '#e2e8f0',
          padding: '2px',
          borderRadius: '7px',
          marginBottom: '12px',
          gap: '2px',
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
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <Globe size={11} />
          <span>Webpage</span>
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
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <QrCode size={11} />
          <span>Screen QR</span>
        </button>

        <button
          onClick={() => setActiveTab('gmail')}
          style={{
            padding: '5px 0',
            border: 'none',
            borderRadius: '5px',
            background: activeTab === 'gmail' ? '#ffffff' : 'transparent',
            color: activeTab === 'gmail' ? '#0f172a' : '#64748b',
            fontSize: '11px',
            fontWeight: activeTab === 'gmail' ? '600' : '500',
            cursor: 'pointer',
            boxShadow: activeTab === 'gmail' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            position: 'relative',
            transition: 'all 0.15s ease',
          }}
        >
          <Mail size={11} color={isGmailTab ? '#2563eb' : undefined} />
          <span>Gmail Scan</span>
          {isGmailTab && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#2563eb',
                display: 'inline-block',
              }}
            />
          )}
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

              {/* Identity & Signal Breakdown */}
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

              {/* Report Website Action */}
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const reportUrl = `http://localhost:3000/report?url=${encodeURIComponent(data.url || '')}&scanId=${data.scanId || ''}`;
                    chrome.tabs.create({ url: reportUrl });
                  }}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <Flag size={12} color="#dc2626" />
                  <span>Report this website for triage</span>
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

          {/* Presets and Drop zone */}
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

      {/* TAB 3: GMAIL SENTINEL SCANNER */}
      {activeTab === 'gmail' && (
        <div>
          {/* Header Description */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} color="#2563eb" />
              <span>Gmail Link & Identity Sentinel</span>
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px', lineHeight: '1.35' }}>
              Inspects sender domain authenticity, unmasks Google redirect URLs, and evaluates brand impersonation.
            </div>
          </div>

          {/* Loading Progress State */}
          {isScanningEmail ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '24px 16px',
                textAlign: 'center',
                marginBottom: '10px',
              }}
            >
              <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 10px auto', display: 'block', color: '#2563eb' }} />
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                Analyzing Email Security...
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748b', lineHeight: '1.4' }}>
                Verifying sender SPF/domain match, expanding all hyperlinks, and testing for psychological urgency traps.
              </div>
            </div>
          ) : emailError ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontWeight: '600', fontSize: '11px', marginBottom: '2px' }}>
                <AlertOctagon size={14} />
                <span>Notice</span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#991b1b', lineHeight: '1.35' }}>
                {emailError}
              </div>
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleScanActiveEmail}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '5px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '10.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Scan Open Email
                </button>
                <button
                  type="button"
                  onClick={() => setEmailError(null)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '5px',
                    background: '#f8f9fa',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '10.5px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : emailReport ? (
            /* Result View: Full Email Security Report */
            <div style={{ marginBottom: '10px' }}>
              {/* Overall Email Verdict Banner */}
              <div
                style={{
                  background:
                    emailReport.emailVerdict === 'DANGER'
                      ? '#fef2f2'
                      : emailReport.emailVerdict === 'CAUTION'
                      ? '#fffbeb'
                      : '#f0fdf4',
                  border: `1px solid ${
                    emailReport.emailVerdict === 'DANGER'
                      ? '#fecaca'
                      : emailReport.emailVerdict === 'CAUTION'
                      ? '#fde68a'
                      : '#bbf7d0'
                  }`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {emailReport.emailVerdict === 'DANGER' ? (
                      <AlertOctagon size={16} color="#b91c1c" />
                    ) : emailReport.emailVerdict === 'CAUTION' ? (
                      <AlertTriangle size={16} color="#b45309" />
                    ) : (
                      <CheckCircle2 size={16} color="#15803d" />
                    )}
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '800',
                        color:
                          emailReport.emailVerdict === 'DANGER'
                            ? '#b91c1c'
                            : emailReport.emailVerdict === 'CAUTION'
                            ? '#b45309'
                            : '#15803d',
                      }}
                    >
                      {emailReport.emailVerdict === 'DANGER'
                        ? 'Dangerous Email / Phishing'
                        : emailReport.emailVerdict === 'CAUTION'
                        ? 'Suspicious Email (Caution)'
                        : 'Legitimate / Safe Email'}
                    </span>
                  </div>

                  <span style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'monospace', color: '#0f172a' }}>
                    {emailReport.emailRiskScore} <span style={{ fontSize: '10px', color: '#64748b' }}>/ 100</span>
                  </span>
                </div>

                <div style={{ fontSize: '11px', fontWeight: '500', color: '#0f172a', lineHeight: '1.4' }}>
                  {emailReport.explanation}
                </div>
              </div>

              {/* Email Subject & Sender Verification */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '3px' }}>
                  Email Context
                </div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#0f172a', marginBottom: '6px', wordBreak: 'break-word' }}>
                  "{emailReport.subject || 'Email Scan'}"
                </div>

                {emailReport.senderAnalysis && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#334155', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>From: </span>
                      <strong>{emailReport.senderAnalysis.senderName || 'Unknown'}</strong>{' '}
                      <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#475569' }}>
                        &lt;{emailReport.senderAnalysis.senderEmail}&gt;
                      </span>
                    </div>

                    {emailReport.senderAnalysis.isSpoofed ? (
                      <div
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          marginTop: '4px',
                          fontSize: '10.5px',
                          color: '#991b1b',
                          lineHeight: '1.35',
                        }}
                      >
                        <strong>🚨 Spoofed Sender Detected:</strong> {emailReport.senderAnalysis.details}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10.5px',
                          color: '#15803d',
                          marginTop: '4px',
                        }}
                      >
                        <CheckCircle2 size={12} />
                        <span>Sender domain appears consistent.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Urgency Pressure Tactics (if detected) */}
              {emailReport.urgencySignals && emailReport.urgencySignals.length > 0 && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#92400e', marginBottom: '4px' }}>
                    Psychological Urgency Tactics ({emailReport.urgencySignals.length})
                  </div>
                  {emailReport.urgencySignals.map((u, idx) => (
                    <div key={idx} style={{ fontSize: '10.5px', color: '#78350f', marginBottom: '2px', lineHeight: '1.3' }}>
                      ⚠️ {u}
                    </div>
                  ))}
                </div>
              )}

              {/* Contained Links Security Breakdown */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>
                    Links Analyzed ({emailReport.linksAnalyzed?.length || 0})
                  </div>
                  {emailReport.summary && (
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: '600' }}>
                      <span style={{ color: emailReport.summary.dangerCount > 0 ? '#dc2626' : '#64748b' }}>
                        {emailReport.summary.dangerCount} Danger
                      </span>{' '}
                      •{' '}
                      <span style={{ color: emailReport.summary.cautionCount > 0 ? '#d97706' : '#64748b' }}>
                        {emailReport.summary.cautionCount} Caution
                      </span>{' '}
                      •{' '}
                      <span style={{ color: '#16a34a' }}>
                        {emailReport.summary.safeCount} Safe
                      </span>
                    </div>
                  )}
                </div>

                {emailReport.linksAnalyzed && emailReport.linksAnalyzed.length > 0 ? (
                  <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {emailReport.linksAnalyzed.map((link, idx) => {
                      const isLnkDanger = link.verdict === 'DANGER';
                      const isLnkCaution = link.verdict === 'CAUTION';
                      return (
                        <div
                          key={idx}
                          style={{
                            background: isLnkDanger ? '#fef2f2' : isLnkCaution ? '#fffbeb' : '#f8f9fa',
                            border: `1px solid ${isLnkDanger ? '#fecaca' : isLnkCaution ? '#fde68a' : '#e2e8f0'}`,
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '10.5px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span
                              style={{
                                fontWeight: '700',
                                color: isLnkDanger ? '#b91c1c' : isLnkCaution ? '#b45309' : '#15803d',
                              }}
                            >
                              {link.verdict} ({link.riskScore}/100)
                            </span>
                            {link.text && (
                              <span style={{ color: '#64748b', fontSize: '9.5px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                "{link.text}"
                              </span>
                            )}
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#334155', wordBreak: 'break-all', marginBottom: '3px' }}>
                            {link.finalUrl || link.url}
                          </div>
                          <div style={{ color: '#475569', fontSize: '10px', lineHeight: '1.3' }}>
                            {link.explanation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#15803d', textAlign: 'center', padding: '10px 0' }}>
                    ✓ No hyperlinks found inside this email.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {isGmailTab && (
                  <button
                    onClick={handleShowInPageOverlay}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <Layers size={12} />
                    <span>In-Page HUD</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    const firstDanger = emailReport.linksAnalyzed?.find((l) => l.verdict === 'DANGER');
                    const targetLink = firstDanger?.url || emailReport.linksAnalyzed?.[0]?.url || '';
                    const url = `http://localhost:3000/report?url=${encodeURIComponent(targetLink)}&note=${encodeURIComponent(
                      `Reported from Gmail: ${emailReport.subject} (Sender: ${emailReport.senderAnalysis?.senderEmail})`
                    )}`;
                    chrome.tabs.create({ url });
                  }}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#b91c1c',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                  }}
                >
                  <Flag size={12} />
                  <span>Report Threat</span>
                </button>
                <button
                  onClick={() => {
                    setEmailReport(null);
                    setEmailError(null);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    background: '#f8f9fa',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            /* Pre-Scan State: Detects if an email is open or guides the user */
            <div>
              {isGmailTab ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                    {gmailData?.isEmailOpen ? 'Active Email Detected' : 'Open Any Email in Gmail'}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', lineHeight: '1.4', marginBottom: '10px' }}>
                    {gmailData?.isEmailOpen
                      ? `Ready to inspect sender authenticity and verify all embedded link destinations.`
                      : `Click on any email message thread in Gmail. PhishLens will extract all links and calculate the threat rating.`}
                  </div>

                  {gmailData?.isEmailOpen && (
                    <div
                      style={{
                        background: '#f8f9fa',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        marginBottom: '10px',
                        fontSize: '10.5px',
                      }}
                    >
                      <div style={{ color: '#0f172a', fontWeight: '600', marginBottom: '2px' }}>
                        Subject: "{gmailData.subject || 'No Subject'}"
                      </div>
                      <div style={{ color: '#475569', fontSize: '10px' }}>
                        From: {gmailData.senderName} &lt;{gmailData.senderEmail}&gt;
                      </div>
                      <div style={{ color: '#2563eb', fontWeight: '600', marginTop: '4px', fontSize: '10px' }}>
                        {gmailData.links.length} embedded link{gmailData.links.length === 1 ? '' : 's'} detected
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleScanActiveEmail}
                    disabled={isScanningEmail}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <Shield size={14} color="#10b981" />
                    <span>Scan Active Email with PhishLens</span>
                  </button>
                </div>
              ) : (
                /* Not on Gmail tab */
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    textAlign: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <Mail size={24} color="#2563eb" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                    Open Gmail to Scan Real Emails
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', lineHeight: '1.4', marginBottom: '12px' }}>
                    PhishLens integrates directly with Gmail. It extracts sender headers and unmasks Google redirect links in parallel.
                  </div>
                  <button
                    type="button"
                    onClick={() => chrome.tabs.create({ url: 'https://mail.google.com' })}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Open mail.google.com
                  </button>
                </div>
              )}

              {/* Test Vectors & Simulated Scenarios */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                  Test Attack Presets:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() =>
                      handleRunEmailPreset({
                        subject: 'URGENT: Your SBI Account is Suspended',
                        senderName: 'State Bank of India Alert',
                        senderEmail: 'support@gmail.com',
                        bodySnippet:
                          'Dear customer, immediate action required. Your account has been suspended due to pending KYC verification. Click here within 24 hours to restore access.',
                        links: [
                          {
                            url: 'https://sbi-online-banking-portal.net/login',
                            text: 'Restore My Account',
                          },
                        ],
                      })
                    }
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#b91c1c' }}>
                      🚨 Fake SBI Account Suspension (Brand Spoof + Trap)
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#7f1d1d', marginTop: '2px' }}>
                      From: State Bank &lt;support@gmail.com&gt; • Link: sbi-online-banking-portal.net
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleRunEmailPreset({
                        subject: 'Urgent: Verify HDFC NetBanking Access',
                        senderName: 'HDFC Security',
                        senderEmail: 'alerts@hdfc-netverify-online.com',
                        bodySnippet:
                          'Security notice: Unauthorized login attempted from unfamiliar IP address. Verify your netbanking credentials immediately.',
                        links: [
                          {
                            url: 'https://hdfc-security-auth.top/verify',
                            text: 'Verify Identity Now',
                          },
                        ],
                      })
                    }
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#b45309' }}>
                      ⚠️ HDFC Lookalike Domain Phishing
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#78350f', marginTop: '2px' }}>
                      From: HDFC &lt;alerts@hdfc-netverify-online.com&gt; • Link: hdfc-security-auth.top
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleRunEmailPreset({
                        subject: 'Security alert for your linked Google Account',
                        senderName: 'Google Security',
                        senderEmail: 'no-reply@accounts.google.com',
                        bodySnippet:
                          'A new sign-in from Chrome on macOS was detected. You can review your devices and security activity.',
                        links: [
                          {
                            url: 'https://myaccount.google.com/notifications',
                            text: 'Review Activity',
                          },
                        ],
                      })
                    }
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#15803d' }}>
                      ✓ Legitimate Official Google Notice
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#166534', marginTop: '2px' }}>
                      From: Google &lt;no-reply@accounts.google.com&gt; • Link: myaccount.google.com
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('popup-root') as HTMLElement);
root.render(<Popup />);
