// PhishLens Content Script — Safe DOM Metadata, Link Inspector HUD & Screen QR Trigger
// STRICT PRIVACY: NEVER reads input.value, NEVER logs user keystrokes.

(() => {
  const API_BASE = 'http://localhost:5001/api/v1';

  // 1. Extract Safe Page Metadata for IntentGuard Analysis
  function extractSafeMetadata() {
    const title = document.title || '';
    const headings: string[] = [];
    document.querySelectorAll('h1, h2').forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length < 100) headings.push(text);
    });

    const logoAltText: string[] = [];
    document.querySelectorAll('img').forEach((img) => {
      const alt = img.getAttribute('alt')?.trim();
      const className = img.className?.toLowerCase() || '';
      const id = img.id?.toLowerCase() || '';
      if (alt && (className.includes('logo') || id.includes('logo') || alt.toLowerCase().includes('logo'))) {
        logoAltText.push(alt);
      }
    });

    let hasPasswordField = false;
    let hasOtpField = false;
    let hasCvvField = false;
    let hasCardField = false;
    let hasKycField = false;
    let hasUpiPinField = false;

    const inputElements = document.querySelectorAll('input, select, textarea');
    inputElements.forEach((input) => {
      const type = (input.getAttribute('type') || '').toLowerCase();
      const name = (input.getAttribute('name') || '').toLowerCase();
      const id = (input.getAttribute('id') || '').toLowerCase();
      const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
      const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();

      const descriptors = `${name} ${id} ${placeholder} ${ariaLabel}`;

      if (type === 'password' || descriptors.includes('password') || descriptors.includes('pwd')) {
        hasPasswordField = true;
      }
      if (descriptors.includes('otp') || descriptors.includes('one time password') || descriptors.includes('verification code') || descriptors.includes('2fa')) {
        hasOtpField = true;
      }
      if (descriptors.includes('cvv') || descriptors.includes('cvc') || descriptors.includes('security code')) {
        hasCvvField = true;
      }
      if (descriptors.includes('card') || descriptors.includes('pan number') || descriptors.includes('debit')) {
        hasCardField = true;
      }
      if (descriptors.includes('kyc') || descriptors.includes('aadhaar') || descriptors.includes('pan card')) {
        hasKycField = true;
      }
      if (descriptors.includes('upi pin') || descriptors.includes('mpin')) {
        hasUpiPinField = true;
      }
    });

    const faviconEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    const faviconUrl = faviconEl ? faviconEl.href : undefined;

    return {
      url: window.location.href,
      title,
      headings: headings.slice(0, 5),
      logoAltText: logoAltText.slice(0, 3),
      hasPasswordField,
      hasOtpField,
      hasCvvField,
      hasCardField,
      hasKycField,
      hasUpiPinField,
      faviconUrl,
    };
  }

  // Send page metadata safely to background service worker
  try {
    const metadata = extractSafeMetadata();
    chrome.runtime.sendMessage({
      type: 'PAGE_METADATA_EXTRACTED',
      payload: metadata,
    });
  } catch {
    // Context may be invalidated if extension reloaded
  }

  // -------------------------------------------------------------
  // In-Page Floating HUD Link Inspector & Threat Blocker (Shadow DOM)
  // -------------------------------------------------------------
  let overlayHost: HTMLElement | null = null;
  let shadowRoot: ShadowRoot | null = null;
  let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

  function ensureShadowRoot(isBlocker: boolean = false): ShadowRoot {
    if (!overlayHost || !document.contains(overlayHost)) {
      overlayHost = document.createElement('div');
      overlayHost.id = 'phishlens-inspector-host';
      overlayHost.style.position = 'fixed';
      overlayHost.style.zIndex = '2147483647';
      shadowRoot = overlayHost.attachShadow({ mode: 'open' });
      document.body.appendChild(overlayHost);
    }

    if (isBlocker) {
      overlayHost.style.top = '0';
      overlayHost.style.left = '0';
      overlayHost.style.right = '0';
      overlayHost.style.bottom = '0';
      overlayHost.style.width = '100vw';
      overlayHost.style.height = '100vh';
      overlayHost.style.pointerEvents = 'auto';
    } else {
      overlayHost.style.top = '20px';
      overlayHost.style.right = '20px';
      overlayHost.style.left = 'auto';
      overlayHost.style.bottom = 'auto';
      overlayHost.style.width = 'auto';
      overlayHost.style.height = 'auto';
      overlayHost.style.pointerEvents = 'none';
    }

    return shadowRoot!;
  }

  function dismissOverlay() {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }
    if (overlayHost) {
      overlayHost.remove();
      overlayHost = null;
      shadowRoot = null;
    }
  }

  // Inline SVG icons (strictly no emojis)
  const icons = {
    shield: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    camera: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
    qr: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7h.01M16 7h.01M8 15h.01M16 15h.01M12 12h.01"/></svg>`,
    alertTriangle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    alertOctagon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    checkCircle: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    externalLink: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    arrowRight: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    copy: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  };

  // Trigger Screen QR Capture — Opens the PhishLens extension popup scanner
  function triggerScreenQrCapture() {
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP_FOR_QR' });
    dismissOverlay();
  }

  interface ScanResultPayload {
    scanId: string;
    url: string;
    finalUrl?: string;
    isShortened?: boolean;
    verdict: 'SAFE' | 'CAUTION' | 'DANGER';
    riskScore: number;
    explanation: string;
    why: string[];
    intentGuard?: {
      claimedBrand?: string;
      isOfficialDomain: boolean;
      hasCredentialTrap: boolean;
      lookalikeMatch?: string;
    };
    geminiAdvisor?: {
      apparentBrand?: string | null;
      legitimateOfficialDomain?: string | null;
      summaryExplanation?: string;
      threatLevel?: string;
      socialEngineeringTactics?: string[];
    };
  }

  interface QrScanResultPayload {
    scanId: string;
    inputType: string;
    verdict: 'SAFE' | 'CAUTION' | 'DANGER';
    riskScore: number;
    explanation: string;
    why: string[];
    paymentTruth?: {
      isUPI: boolean;
      upiId?: string;
      payeeName?: string;
      amount?: string | null;
      actionDescription: string;
      intentMismatch: boolean;
      merchantMatchStatus?: string;
    };
    intentGuard?: {
      claimedBrand?: string;
      isOfficialDomain: boolean;
      hasCredentialTrap: boolean;
      lookalikeMatch?: string;
    };
  }

  // Base Light Mode CSS for Inspector Card
  const baseHudStyles = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .hud-card {
      pointer-events: auto;
      width: 390px;
      max-width: calc(100vw - 40px);
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05);
      color: #0f172a;
      padding: 16px;
      animation: phishlens-slide-in 0.22s ease-out;
    }
    @keyframes phishlens-slide-in {
      from { opacity: 0; transform: translateY(-10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    .brand-wrap { display: flex; align-items: center; gap: 8px; }
    .logo-badge {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-title { font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.2; }
    .brand-subtitle { font-size: 9px; color: #64748b; font-family: ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.5px; }
    .header-actions { display: flex; align-items: center; gap: 6px; }
    .btn-capture-top {
      background: #f8f9fa;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 600;
      color: #0f172a;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s;
    }
    .btn-capture-top:hover {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 16px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      border-radius: 4px;
    }
    .close-btn:hover { color: #0f172a; background: #f1f5f9; }
    
    /* Explicit Click / Decision Recommendation Banner */
    .decision-banner {
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .decision-danger {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
    }
    .decision-caution {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #b45309;
    }
    .decision-safe {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
    }
    .decision-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.2px;
      line-height: 1.2;
    }
    .decision-subtext {
      font-size: 10px;
      margin-top: 2px;
      opacity: 0.9;
      line-height: 1.3;
    }

    /* Score and Status */
    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 6px 10px;
      background: #f8f9fa;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      font-family: ui-monospace, monospace;
      text-transform: uppercase;
    }
    .badge-safe { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-caution { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge-danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .score-text {
      font-size: 14px;
      font-weight: 800;
      font-family: ui-monospace, monospace;
      color: #0f172a;
    }
    .score-denom { font-size: 10px; color: #64748b; font-weight: normal; }

    /* Content & Explanation */
    .url-box {
      font-size: 10px;
      font-family: ui-monospace, monospace;
      color: #334155;
      background: #f8f9fa;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      word-break: break-all;
      margin-bottom: 10px;
      line-height: 1.35;
    }
    .explanation {
      font-size: 11px;
      color: #334155;
      font-weight: 500;
      line-height: 1.45;
      margin-bottom: 10px;
    }
    .section-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 10px;
      font-size: 11px;
    }
    .section-label {
      font-size: 9px;
      font-weight: 700;
      font-family: ui-monospace, monospace;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
    }

    /* Actions */
    .footer-actions { display: flex; gap: 6px; margin-top: 12px; }
    .btn {
      flex: 1;
      padding: 7px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      cursor: pointer;
      text-decoration: none;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.15s;
    }
    .btn-primary { background: #0f172a; color: #ffffff; }
    .btn-primary:hover { background: #1e293b; }
    .btn-secondary { background: #f8f9fa; color: #475569; border: 1px solid #cbd5e1; }
    .btn-secondary:hover { background: #e2e8f0; color: #0f172a; }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e2e8f0;
      border-top-color: #0f172a;
      border-radius: 50%;
      animation: phishlens-spin 0.7s linear infinite;
      margin: 0 auto 8px auto;
    }
    @keyframes phishlens-spin { to { transform: rotate(360deg); } }
  `;

  function renderOverlay(html: string) {
    const root = ensureShadowRoot(false);
    root.innerHTML = `
      <style>${baseHudStyles}</style>
      <div class="hud-card">
        ${html}
      </div>
    `;

    root.querySelector('.close-btn')?.addEventListener('click', dismissOverlay);
    root.querySelector('#btn-dismiss')?.addEventListener('click', dismissOverlay);
    root.querySelector('#btn-hud-capture-qr')?.addEventListener('click', triggerScreenQrCapture);
    root.querySelector('#btn-hud-capture-top')?.addEventListener('click', triggerScreenQrCapture);
    root.querySelector('#btn-retry-capture')?.addEventListener('click', triggerScreenQrCapture);
  }

  // -------------------------------------------------------------
  // Full-Screen Threat Blocker Interstitial (Score > 70)
  // -------------------------------------------------------------
  function showBlockerOverlay(result: ScanResultPayload) {
    if (autoDismissTimer) clearTimeout(autoDismissTimer);

    const root = ensureShadowRoot(true);
    const safetyScore = Math.max(0, 100 - result.riskScore);

    root.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .blocker-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-y: auto;
          animation: phishlens-fade-in 0.2s ease-out;
        }
        @keyframes phishlens-fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .blocker-modal {
          max-width: 520px;
          width: 100%;
          background: #ffffff;
          border: 1px solid #fecaca;
          border-radius: 16px;
          box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(239, 68, 68, 0.1);
          padding: 28px 24px;
          text-align: center;
          color: #0f172a;
        }
        .blocker-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px auto;
        }
        .badge-threat {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 4px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          font-size: 10px;
          font-weight: 700;
          font-family: ui-monospace, monospace;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .blocker-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
        }
        .blocker-subtitle {
          font-size: 13px;
          color: #475569;
          line-height: 1.45;
          margin-bottom: 16px;
        }
        .score-pill-container {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 16px;
        }
        .score-pill {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-family: ui-monospace, monospace;
        }
        .score-pill-threat {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }
        .score-pill-safety {
          background: #f8f9fa;
          border: 1px solid #e2e8f0;
          color: #64748b;
        }
        .url-box {
          font-size: 11px;
          font-family: ui-monospace, monospace;
          color: #334155;
          background: #f8f9fa;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
          word-break: break-all;
          margin-bottom: 14px;
          text-align: left;
        }
        .reason-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 20px;
          text-align: left;
          font-size: 12px;
        }
        .reason-heading {
          font-size: 10px;
          font-weight: 700;
          font-family: ui-monospace, monospace;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .reason-explanation {
          color: #0f172a;
          font-weight: 500;
          line-height: 1.4;
          margin-bottom: 6px;
        }
        .blocker-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .btn-safety {
          padding: 11px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          background: #0f172a;
          border: none;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-safety:hover { background: #1e293b; }
        .btn-unsafe {
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          background: transparent;
          border: 1px solid #cbd5e1;
          cursor: pointer;
        }
        .btn-unsafe:hover { color: #b91c1c; border-color: #fca5a5; }
      </style>

      <div class="blocker-backdrop">
        <div class="blocker-modal">
          <div class="blocker-icon-box">${icons.alertOctagon}</div>
          <span class="badge-threat">Dangerous Site Blocked</span>
          <h1 class="blocker-title">DO NOT PROCEED</h1>
          <p class="blocker-subtitle">
            PhishLens blocked this page to protect your credentials and data. The threat score is <strong>${result.riskScore}/100</strong> (Safety Score: ${safetyScore}%).
          </p>

          <div class="score-pill-container">
            <div class="score-pill score-pill-threat">
              Threat Score: <strong>${result.riskScore}/100</strong>
            </div>
            <div class="score-pill score-pill-safety">
              Safety Score: <strong>${safetyScore}/100 (Unsafe)</strong>
            </div>
          </div>

          <div class="url-box">
            <strong>Destination:</strong> ${escapeHtml(result.finalUrl || result.url)}
          </div>

          <div class="reason-box">
            <div class="reason-heading">Security Evidence</div>
            <div class="reason-explanation">${escapeHtml(result.explanation)}</div>

            ${result.intentGuard?.claimedBrand ? `
              <div style="font-size: 11px; color: #475569; margin-top: 4px;">
                Detected Impersonation: <strong>${escapeHtml(result.intentGuard.claimedBrand)}</strong>
                (${result.intentGuard.isOfficialDomain ? 'Verified Domain' : '<span style="color:#b91c1c;font-weight:bold;">Fake Unofficial Domain</span>'})
              </div>
            ` : ''}
          </div>

          <div class="blocker-actions">
            <button id="btn-safety-back" class="btn-safety">
              Go Back to Safety (Recommended)
            </button>
            <button id="btn-proceed-unsafe" class="btn-unsafe">
              I understand the risks, proceed to site anyway
            </button>
          </div>
        </div>
      </div>
    `;

    root.querySelector('#btn-safety-back')?.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'https://google.com';
      }
    });

    root.querySelector('#btn-proceed-unsafe')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'BYPASS_BLOCK_FOR_TAB' }, () => {
        dismissOverlay();
      });
    });
  }

  // Loading state overlay
  function showLoadingOverlay(url: string, message?: string) {
    if (autoDismissTimer) clearTimeout(autoDismissTimer);
    renderOverlay(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge">${icons.shield}</div>
          <div>
            <div class="brand-title">PhishLens Inspector</div>
            <div class="brand-subtitle">Intent-Aware Security</div>
          </div>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>
      <div class="url-box">${escapeHtml(url)}</div>
      <div style="text-align: center; padding: 20px 0;">
        <div class="spinner"></div>
        <div style="font-size: 12px; font-weight: 600; color: #0f172a; margin-bottom: 2px;">
          ${escapeHtml(message || 'Inspecting Destination...')}
        </div>
        <div style="font-size: 10px; color: #64748b;">Analyzing redirect hops, domain age, typosquatting & intent...</div>
      </div>
    `);
  }

  // Display No QR Found state
  function showNoQrOverlay() {
    renderOverlay(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge">${icons.qr}</div>
          <div>
            <div class="brand-title">Screen QR Scanner</div>
            <div class="brand-subtitle">No QR Code Found</div>
          </div>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>

      <div style="background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; margin-bottom: 12px;">
        <div style="color: #64748b; margin-bottom: 6px;">${icons.camera}</div>
        <div style="font-size: 12px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">
          No QR code detected on screen
        </div>
        <div style="font-size: 10px; color: #64748b; line-height: 1.4;">
          Make sure the QR code is clearly visible in the browser viewport, then click Capture again.
        </div>
      </div>

      <div class="footer-actions">
        <button id="btn-retry-capture" class="btn btn-primary">
          ${icons.camera} Retry Capture
        </button>
        <button id="btn-dismiss" class="btn btn-secondary">
          Dismiss
        </button>
      </div>
    `);
  }

  // Display QR Scan Result
  function showQrResultOverlay(result: QrScanResultPayload, rawContent: string) {
    const verdict = result.verdict || 'SAFE';
    const isDanger = verdict === 'DANGER';
    const isCaution = verdict === 'CAUTION';

    const decisionBannerClass = isDanger ? 'decision-danger' : isCaution ? 'decision-caution' : 'decision-safe';
    const decisionIcon = isDanger ? icons.alertOctagon : isCaution ? icons.alertTriangle : icons.checkCircle;

    const isUpi = result.paymentTruth?.isUPI;
    const clickDecision = isDanger
      ? isUpi ? 'DO NOT PAY / FRAUD DETECTED' : 'DO NOT CLICK / MALICIOUS LINK'
      : isCaution
      ? isUpi ? 'EXERCISE CAUTION / CONFIRM RECIPIENT' : 'PROCEED WITH CAUTION'
      : isUpi ? 'SAFE TO PAY / VERIFIED UPI' : 'SAFE TO CLICK / PROCEED';

    const decisionSubtext = isDanger
      ? 'High risk indicator found. Proceeding may cause financial or credential loss.'
      : isCaution
      ? 'Payee or domain does not strictly match expectations. Review details before proceeding.'
      : 'No suspicious redirect chains or deceptive patterns detected.';

    let paymentTruthHtml = '';
    if (result.paymentTruth?.isUPI) {
      paymentTruthHtml = `
        <div class="section-box">
          <div class="section-label">PaymentTruth™ Semantics</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #64748b;">Payee Name:</span>
            <strong style="color: #0f172a;">${escapeHtml(result.paymentTruth.payeeName || 'Unknown')}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #64748b;">UPI ID:</span>
            <strong style="color: #0f172a; font-family: ui-monospace, monospace; font-size: 10px;">${escapeHtml(result.paymentTruth.upiId || '')}</strong>
          </div>
          ${result.paymentTruth.amount ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: #64748b;">Requested Amount:</span>
              <strong style="color: #0f172a;">₹${escapeHtml(result.paymentTruth.amount)}</strong>
            </div>
          ` : ''}
          <div style="margin-top: 4px; font-size: 10px; color: ${result.paymentTruth.intentMismatch ? '#b91c1c' : '#334155'}; font-weight: 600;">
            ${escapeHtml(result.paymentTruth.actionDescription)}
          </div>
        </div>
      `;
    }

    renderOverlay(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge">${icons.qr}</div>
          <div>
            <div class="brand-title">PhishLens Screen QR</div>
            <div class="brand-subtitle">${isUpi ? 'UPI Payment Scan' : 'Decoded URL Scan'}</div>
          </div>
        </div>
        <div class="header-actions">
          <button id="btn-hud-capture-top" class="btn-capture-top" title="Capture Screen Again">
            ${icons.camera} Capture
          </button>
          <button class="close-btn" title="Close">✕</button>
        </div>
      </div>

      <div class="decision-banner ${decisionBannerClass}">
        <div style="margin-top: 1px;">${decisionIcon}</div>
        <div>
          <div class="decision-title">${clickDecision}</div>
          <div class="decision-subtext">${decisionSubtext}</div>
        </div>
      </div>

      <div class="status-row">
        <span class="badge ${verdict === 'DANGER' ? 'badge-danger' : verdict === 'CAUTION' ? 'badge-caution' : 'badge-safe'}">
          ${verdict}
        </span>
        <div class="score-text">
          ${result.riskScore} <span class="score-denom">/ 100</span>
        </div>
      </div>

      <div class="url-box" title="${escapeHtml(rawContent)}">
        <strong>Scanned Payload:</strong> ${escapeHtml(rawContent)}
      </div>

      <div class="explanation">${escapeHtml(result.explanation)}</div>

      ${paymentTruthHtml}

      ${result.why && result.why.length > 0 ? `
        <div class="section-box">
          <div class="section-label">Evidence & Signals</div>
          <ul style="list-style: none; padding: 0;">
            ${result.why.slice(0, 3).map((item) => `
              <li style="color: #475569; font-size: 10px; margin-bottom: 3px; line-height: 1.35;">• ${escapeHtml(item)}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="footer-actions">
        <a href="http://localhost:3000" target="_blank" class="btn btn-primary">
          Open Full PWA ${icons.externalLink}
        </a>
        <button id="btn-dismiss" class="btn btn-secondary">
          Dismiss
        </button>
      </div>
    `);
  }

  // Display Standard URL / Link Inspection Result
  function showResultOverlay(result: ScanResultPayload) {
    const verdict = result.verdict || 'SAFE';
    const isDanger = verdict === 'DANGER';
    const isCaution = verdict === 'CAUTION';

    const decisionBannerClass = isDanger ? 'decision-danger' : isCaution ? 'decision-caution' : 'decision-safe';
    const decisionIcon = isDanger ? icons.alertOctagon : isCaution ? icons.alertTriangle : icons.checkCircle;

    const clickDecision = isDanger
      ? 'DO NOT CLICK / MALICIOUS LINK'
      : isCaution
      ? 'PROCEED WITH CAUTION'
      : 'SAFE TO CLICK / PROCEED';

    const decisionSubtext = isDanger
      ? 'This link exhibits high impersonation or credential trap signals. Do not submit data.'
      : isCaution
      ? 'Unverified domain or suspicious structure detected. Confirm address before proceeding.'
      : 'No major phishing indicators detected on this destination.';

    let intentGuardHtml = '';
    if (result.intentGuard) {
      intentGuardHtml = `
        <div class="section-box">
          <div class="section-label">IntentGuard™ Identity</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #64748b;">Claimed Brand:</span>
            <strong style="color: #0f172a;">${escapeHtml(result.intentGuard.claimedBrand || 'None detected')}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Official Domain:</span>
            <strong style="color: ${result.intentGuard.isOfficialDomain ? '#15803d' : '#b91c1c'};">
              ${result.intentGuard.isOfficialDomain ? 'Verified' : 'Fake / Unofficial'}
            </strong>
          </div>
          ${result.intentGuard.lookalikeMatch ? `
            <div style="margin-top: 4px; font-size: 10px; color: #b91c1c;">
              Mimics official address: <strong>${escapeHtml(result.intentGuard.lookalikeMatch)}</strong>
            </div>
          ` : ''}
        </div>
      `;
    }

    let whyListHtml = '';
    if (result.why && result.why.length > 0) {
      whyListHtml = `
        <div class="section-box">
          <div class="section-label">Evidence (${result.why.length})</div>
          <ul style="list-style: none; padding: 0;">
            ${result.why.slice(0, 3).map((item) => `
              <li style="color: #475569; font-size: 10px; margin-bottom: 3px; line-height: 1.35;">• ${escapeHtml(item)}</li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    renderOverlay(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge">${icons.shield}</div>
          <div>
            <div class="brand-title">PhishLens Inspector</div>
            <div class="brand-subtitle">Intent-Aware Security</div>
          </div>
        </div>
        <div class="header-actions">
          <button id="btn-hud-capture-top" class="btn-capture-top" title="Scan Screen for QR">
            ${icons.camera} Capture Screen QR
          </button>
          <button class="close-btn" title="Close">✕</button>
        </div>
      </div>

      <div class="decision-banner ${decisionBannerClass}">
        <div style="margin-top: 1px;">${decisionIcon}</div>
        <div>
          <div class="decision-title">${clickDecision}</div>
          <div class="decision-subtext">${decisionSubtext}</div>
        </div>
      </div>

      <div class="status-row">
        <span class="badge ${verdict === 'DANGER' ? 'badge-danger' : verdict === 'CAUTION' ? 'badge-caution' : 'badge-safe'}">
          ${verdict}
        </span>
        <div class="score-text">
          ${result.riskScore} <span class="score-denom">/ 100</span>
        </div>
      </div>

      <div class="url-box" title="${escapeHtml(result.finalUrl || result.url)}">
        ${result.isShortened ? '<div style="color: #b45309; font-weight: 700; margin-bottom: 2px;">Shortened URL Unmasked</div>' : ''}
        ${result.finalUrl && result.finalUrl !== result.url ? `
          <div style="font-size: 9px; color: #64748b; margin-bottom: 2px;">Initial: ${escapeHtml(result.url)}</div>
          <div style="font-weight: 700; color: #0f172a;">Destination: ${escapeHtml(result.finalUrl)}</div>
        ` : `
          <div>${escapeHtml(result.url)}</div>
        `}
      </div>

      <div class="explanation">${escapeHtml(result.explanation)}</div>

      ${intentGuardHtml}
      ${whyListHtml}

      <div class="footer-actions">
        ${result.finalUrl && result.finalUrl !== window.location.href ? `
          <a href="${escapeHtml(result.finalUrl)}" target="_blank" class="btn btn-primary">
            Open Destination ${icons.externalLink}
          </a>
        ` : `
          <a href="http://localhost:3000" target="_blank" class="btn btn-primary">
            Open Full PWA ${icons.externalLink}
          </a>
        `}
        <button id="btn-dismiss" class="btn btn-secondary">
          Dismiss
        </button>
      </div>
    `);

    // Auto-dismiss after 30 seconds
    if (autoDismissTimer) clearTimeout(autoDismissTimer);
    autoDismissTimer = setTimeout(dismissOverlay, 30000);
  }

  function showErrorOverlay(error: string, url: string) {
    renderOverlay(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge" style="background: #b91c1c;">${icons.alertTriangle}</div>
          <div>
            <div class="brand-title">PhishLens Inspector</div>
            <div class="brand-subtitle">Scan Incomplete</div>
          </div>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>
      <div class="url-box">${escapeHtml(url)}</div>
      <div style="color: #b91c1c; font-size: 11px; padding: 8px 0; line-height: 1.4;">${escapeHtml(error)}</div>
      <div class="footer-actions">
        <button id="btn-dismiss" class="btn btn-secondary">Dismiss</button>
      </div>
    `);
  }

  // -------------------------------------------------------------
  // Gmail Special Feature: Extract Email Data & In-Page Sentinel
  // -------------------------------------------------------------
  function extractGmailData() {
    const isGmail = window.location.hostname.includes('mail.google.com');
    if (!isGmail) {
      return { isGmail: false, isEmailOpen: false, links: [] };
    }

    // 1. Subject Extraction
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

    // 2. Sender Name and Email
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
        const match = emailSpan.textContent?.match(/<([^>]+)>/) || emailSpan.textContent?.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (match) senderEmail = match[1];
      }
    }
    if (!senderEmail && senderEl?.textContent) {
      const match = senderEl.textContent.match(/<([^>]+)>/) || senderEl.textContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
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

    const hasSubject = !!subject && subject.toLowerCase() !== 'inbox' && !subject.toLowerCase().startsWith('inbox (');
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

        const text = a.textContent?.trim() || a.getAttribute('title')?.trim() || a.getAttribute('aria-label')?.trim() || '';
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
      senderName: senderName || 'Unknown Sender',
      senderEmail: senderEmail || 'unknown@domain.com',
      bodySnippet,
      links: uniqueLinks,
    };
  }

  function showEmailReportOverlay(report: any) {
    const isDanger = report.emailVerdict === 'DANGER';
    const isCaution = report.emailVerdict === 'CAUTION';

    const decisionBannerClass = isDanger
      ? 'decision-danger'
      : isCaution
      ? 'decision-caution'
      : 'decision-safe';

    const decisionIcon = isDanger
      ? icons.alertOctagon
      : isCaution
      ? icons.alertTriangle
      : icons.checkCircle;

    const verdictLabel = isDanger
      ? 'DANGEROUS EMAIL / PHISHING DETECTED'
      : isCaution
      ? 'CAUTION: SUSPICIOUS EMAIL'
      : 'SAFE EMAIL: NO THREATS DETECTED';

    let senderHtml = '';
    if (report.senderAnalysis) {
      const sa = report.senderAnalysis;
      senderHtml = `
        <div class="section-box">
          <div class="section-label">Sender Identity Analysis</div>
          <div style="font-size: 11px; margin-bottom: 4px; color: #0f172a;">
            <strong>${escapeHtml(sa.senderName || 'Unknown')}</strong> &lt;${escapeHtml(sa.senderEmail || 'Unknown')}&gt;
          </div>
          ${sa.isSpoofed ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 8px; color: #991b1b; font-size: 10.5px; line-height: 1.35; margin-top: 4px;">
              <strong>🚨 Brand Impersonation:</strong> ${escapeHtml(sa.details)}
            </div>
          ` : `
            <div style="color: #15803d; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
              <span>✓</span> Sender address domain matches official registration.
            </div>
          `}
        </div>
      `;
    }

    let urgencyHtml = '';
    if (report.urgencySignals && report.urgencySignals.length > 0) {
      urgencyHtml = `
        <div class="section-box" style="background: #fffbeb; border-color: #fef3c7;">
          <div class="section-label" style="color: #92400e;">Psychological Urgency Tactics (${report.urgencySignals.length})</div>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${report.urgencySignals.map((u: string) => `
              <li style="font-size: 10.5px; color: #78350f; margin-bottom: 2px;">⚠️ ${escapeHtml(u)}</li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    let linksHtml = '';
    if (report.linksAnalyzed && report.linksAnalyzed.length > 0) {
      linksHtml = `
        <div class="section-box">
          <div class="section-label">
            Contained Links (${report.linksAnalyzed.length}) — 
            <span style="color: ${report.summary.dangerCount > 0 ? '#dc2626' : '#64748b'}; font-weight: 700;">
              ${report.summary.dangerCount} Danger, ${report.summary.cautionCount} Caution, ${report.summary.safeCount} Safe
            </span>
          </div>
          <div style="max-height: 160px; overflow-y: auto; padding-right: 2px;">
            ${report.linksAnalyzed.map((l: any) => {
              const linkDanger = l.verdict === 'DANGER';
              const linkCaution = l.verdict === 'CAUTION';
              const badgeBg = linkDanger ? '#fef2f2' : linkCaution ? '#fffbeb' : '#f0fdf4';
              const badgeBorder = linkDanger ? '#fecaca' : linkCaution ? '#fde68a' : '#bbf7d0';
              const badgeText = linkDanger ? '#b91c1c' : linkCaution ? '#b45309' : '#15803d';

              return `
                <div style="background: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 6px; padding: 6px 8px; margin-bottom: 6px; font-size: 10.5px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                    <span style="font-weight: 700; color: ${badgeText};">${escapeHtml(l.verdict)} (${l.riskScore}/100)</span>
                    ${l.text ? `<span style="color: #64748b; font-size: 10px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">"${escapeHtml(l.text)}"</span>` : ''}
                  </div>
                  <div style="font-family: monospace; font-size: 10px; color: #334155; word-break: break-all; margin-bottom: 2px;">
                    ${escapeHtml(l.finalUrl || l.url)}
                  </div>
                  <div style="color: #475569; font-size: 10px; line-height: 1.3;">
                    ${escapeHtml(l.explanation)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      linksHtml = `
        <div class="section-box" style="color: #15803d; font-size: 10.5px;">
          ✓ No external hyperlinks detected in this email message.
        </div>
      `;
    }

    renderOverlay(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge">${icons.shield}</div>
          <div>
            <div class="brand-title">PhishLens Email Sentinel</div>
            <div class="brand-subtitle">Gmail Intent & Link Analysis</div>
          </div>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>

      <div class="decision-banner ${decisionBannerClass}">
        <div style="margin-top: 1px;">${decisionIcon}</div>
        <div>
          <div class="decision-title">${verdictLabel} (${report.emailRiskScore}/100)</div>
          <div class="decision-subtext">${escapeHtml(report.explanation)}</div>
        </div>
      </div>

      <div style="font-size: 11px; font-weight: 600; color: #0f172a; padding: 4px 0 2px 0;">
        Subject: "${escapeHtml(report.subject)}"
      </div>

      ${senderHtml}
      ${urgencyHtml}
      ${linksHtml}

      <div class="footer-actions">
        <button id="btn-dismiss" class="btn btn-secondary" style="flex: 1;">Close Report</button>
        <button id="btn-open-pwa-report" class="btn btn-primary" style="flex: 1;">Report to Triage</button>
      </div>
    `);

    // Wire up report button
    const pwaBtn = shadowRoot?.getElementById('btn-open-pwa-report');
    if (pwaBtn) {
      pwaBtn.addEventListener('click', () => {
        const firstDanger = report.linksAnalyzed?.find((l: any) => l.verdict === 'DANGER');
        const urlToReport = firstDanger?.url || (report.linksAnalyzed?.[0]?.url || '');
        const targetUrl = `http://localhost:3000/report?url=${encodeURIComponent(urlToReport)}&note=${encodeURIComponent(`Reported via Gmail Sentinel: ${report.subject} (Sender: ${report.senderAnalysis?.senderEmail})`)}`;
        window.open(targetUrl, '_blank');
        dismissOverlay();
      });
    }
  }

  // -------------------------------------------------------------
  // Gmail Active Listening Engine: Auto-scan, In-Mail Banner & Link Highlighting
  // -------------------------------------------------------------
  const scannedThreadsCache = new Map<string, any>();
  let isAutoScanning = false;
  let lastScannedKey = '';

  function highlightHarmfulLinksInBody(report: any) {
    if (!report?.linksAnalyzed || report.linksAnalyzed.length === 0) return;

    const dangerLinks = report.linksAnalyzed.filter((l: any) => l.verdict === 'DANGER');
    const cautionLinks = report.linksAnalyzed.filter((l: any) => l.verdict === 'CAUTION');

    const bodyContainers = document.querySelectorAll('div.a3s, div.ii.gt, div.adn');
    bodyContainers.forEach((container) => {
      const anchors = container.querySelectorAll('a[href]');
      anchors.forEach((a) => {
        const anchorEl = a as HTMLAnchorElement;
        let href = anchorEl.getAttribute('href') || '';
        if (href.includes('google.com/url?') || href.includes('google.com/url/')) {
          try {
            const parsed = new URL(href);
            const q = parsed.searchParams.get('q');
            if (q) href = q;
          } catch {}
        }

        // Check if matches a danger link
        const matchedDanger = dangerLinks.find((dl: any) => dl.url === href || dl.finalUrl === href || href.startsWith(dl.url));
        if (matchedDanger) {
          if (!anchorEl.classList.contains('phishlens-highlighted-danger')) {
            anchorEl.classList.add('phishlens-highlighted-danger');
            anchorEl.style.cssText += `
              outline: 2px dashed #dc2626 !important;
              background: #fee2e2 !important;
              color: #991b1b !important;
              padding: 2px 6px !important;
              border-radius: 4px !important;
              text-decoration: none !important;
              font-weight: 700 !important;
              cursor: pointer !important;
              position: relative !important;
            `;

            // Append warning badge
            if (!anchorEl.parentElement?.querySelector('.phishlens-danger-badge')) {
              const badge = document.createElement('span');
              badge.className = 'phishlens-danger-badge';
              badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 3px;
                margin-left: 6px;
                padding: 1px 6px;
                background: #dc2626;
                color: #ffffff;
                font-size: 10px;
                font-weight: 700;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                border-radius: 4px;
                vertical-align: middle;
                user-select: none;
              `;
              badge.textContent = '⚠️ Harmful Link';
              anchorEl.parentNode?.insertBefore(badge, anchorEl.nextSibling);
            }

            // Click interception modal
            anchorEl.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const proceed = confirm(
                `🚨 PHISHLENS SECURITY WARNING\n\n` +
                `This link in this email is flagged as DANGEROUS PHISHING (Score: ${matchedDanger.riskScore}/100).\n\n` +
                `Target Destination: ${matchedDanger.url}\n` +
                `Reason: ${matchedDanger.explanation}\n\n` +
                `Do you really want to risk opening this link?`
              );
              if (proceed) {
                window.open(matchedDanger.url, '_blank');
              }
            };
          }
        } else {
          // Check if matches caution
          const matchedCaution = cautionLinks.find((cl: any) => cl.url === href || cl.finalUrl === href);
          if (matchedCaution && !anchorEl.classList.contains('phishlens-highlighted-caution')) {
            anchorEl.classList.add('phishlens-highlighted-caution');
            anchorEl.style.cssText += `
              outline: 1px solid #d97706 !important;
              background: #fffbeb !important;
              padding: 1px 4px !important;
              border-radius: 3px !important;
            `;
          }
        }
      });
    });
  }

  function renderInMailBanner(report: any, state: 'scanning' | 'done') {
    let banner = document.getElementById('phishlens-inmail-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'phishlens-inmail-banner';
      banner.style.cssText = `
        margin: 10px 0 14px 0;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        transition: all 0.2s ease;
        animation: phishlens-fade-in 0.2s ease;
        z-index: 5;
      `;

      const subjectHeader =
        document.querySelector('h2.hP') ||
        document.querySelector('div[role="main"] h2') ||
        document.querySelector('h2[data-thread-perm-id]');

      if (subjectHeader && subjectHeader.parentElement) {
        const parent = subjectHeader.parentElement;
        if (parent.nextSibling) {
          parent.parentNode?.insertBefore(banner, parent.nextSibling);
        } else {
          parent.parentNode?.appendChild(banner);
        }
      } else {
        const main = document.querySelector('div[role="main"]');
        main?.insertBefore(banner, main.firstChild);
      }
    }

    if (state === 'scanning') {
      banner.style.background = '#f8f9fa';
      banner.style.border = '1px solid #e2e8f0';
      banner.style.padding = '8px 12px';
      banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
          <div style="display: flex; align-items: center; gap: 8px; color: #475569;">
            <div style="width: 14px; height: 14px; border: 2px solid #cbd5e1; border-top-color: #2563eb; border-radius: 50%; animation: phishlens-spin 0.7s linear infinite;"></div>
            <strong style="color: #0f172a;">PhishLens Sentinel:</strong>
            <span>Active listening enabled — evaluating sender domain authenticity & scanning embedded links...</span>
          </div>
        </div>
      `;
      return;
    }

    const isDanger = report.emailVerdict === 'DANGER';
    const isCaution = report.emailVerdict === 'CAUTION';

    banner.style.background = isDanger ? '#fef2f2' : isCaution ? '#fffbeb' : '#f0fdf4';
    banner.style.border = `1px solid ${isDanger ? '#fecaca' : isCaution ? '#fde68a' : '#bbf7d0'}`;
    banner.style.padding = '10px 14px';

    const iconSvg = isDanger
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" stroke-width="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
      : isCaution
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;

    const titleColor = isDanger ? '#b91c1c' : isCaution ? '#b45309' : '#15803d';
    const titleText = isDanger
      ? `🚨 DANGEROUS PHISHING EMAIL DETECTED (Risk Score: ${report.emailRiskScore}/100)`
      : isCaution
      ? `⚠️ CAUTION: SUSPICIOUS EMAIL (Risk Score: ${report.emailRiskScore}/100)`
      : `✓ VERIFIED LEGITIMATE EMAIL (Legitimacy Score: ${Math.max(0, 100 - report.emailRiskScore)}/100)`;

    const subText = isDanger
      ? `${escapeHtml(report.explanation)} — Do not click highlighted red links.`
      : isCaution
      ? `${escapeHtml(report.explanation)}`
      : `Sender domain authenticated (${escapeHtml(report.senderAnalysis?.senderEmail || 'Verified')}). ${report.summary?.totalLinks || 0} links verified clean.`;

    banner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
        <div style="display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 260px;">
          <div style="margin-top: 1px;">${iconSvg}</div>
          <div>
            <div style="font-size: 11.5px; font-weight: 800; color: ${titleColor}; letter-spacing: 0.2px;">
              ${titleText}
            </div>
            <div style="font-size: 10.5px; color: #334155; margin-top: 2px; line-height: 1.35;">
              ${subText}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 6px;">
          <button id="phishlens-btn-show-details" style="
            background: #0f172a;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            padding: 5px 10px;
            font-size: 10.5px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s;
          ">
            View Details
          </button>
          ${isDanger ? `
            <button id="phishlens-btn-report-banner" style="
              background: #fee2e2;
              color: #b91c1c;
              border: 1px solid #fca5a5;
              border-radius: 6px;
              padding: 5px 10px;
              font-size: 10.5px;
              font-weight: 600;
              cursor: pointer;
            ">
              Report Scam
            </button>
          ` : ''}
        </div>
      </div>
    `;

    banner.querySelector('#phishlens-btn-show-details')?.addEventListener('click', () => {
      showEmailReportOverlay(report);
    });

    banner.querySelector('#phishlens-btn-report-banner')?.addEventListener('click', () => {
      const firstDanger = report.linksAnalyzed?.find((l: any) => l.verdict === 'DANGER');
      const targetLink = firstDanger?.url || (report.linksAnalyzed?.[0]?.url || '');
      const url = `http://localhost:3000/report?url=${encodeURIComponent(targetLink)}&note=${encodeURIComponent(`Reported from Gmail Active Listening: ${report.subject} (Sender: ${report.senderAnalysis?.senderEmail})`)}`;
      window.open(url, '_blank');
    });
  }

  // Active Listening Loop
  async function triggerActiveEmailScan() {
    if (isAutoScanning) return;
    const emailData = extractGmailData();
    if (!emailData.isGmail || !emailData.isEmailOpen) return;

    // Build unique thread identity key
    const currentKey = `${emailData.subject}__${emailData.senderEmail}__${window.location.hash}`;
    if (currentKey === lastScannedKey && scannedThreadsCache.has(currentKey)) {
      const cached = scannedThreadsCache.get(currentKey);
      renderInMailBanner(cached, 'done');
      highlightHarmfulLinksInBody(cached);
      return;
    }

    lastScannedKey = currentKey;
    isAutoScanning = true;
    renderInMailBanner(null, 'scanning');

    try {
      const resp = await fetch(`${API_BASE}/scans/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });

      if (!resp.ok) {
        throw new Error(`Scan API error ${resp.status}`);
      }

      const report = await resp.json();
      scannedThreadsCache.set(currentKey, report);

      renderInMailBanner(report, 'done');
      highlightHarmfulLinksInBody(report);

      // Notify background service worker to update toolbar badge
      chrome.runtime.sendMessage({
        type: 'GMAIL_EMAIL_SCANNED',
        result: report,
      });
    } catch (err) {
      console.warn('PhishLens Active Listening scan failed:', err);
      const banner = document.getElementById('phishlens-inmail-banner');
      if (banner) {
        banner.style.display = 'none';
      }
    } finally {
      isAutoScanning = false;
    }
  }

  function initGmailActiveListening() {
    if (!window.location.hostname.includes('mail.google.com')) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleCheck = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        triggerActiveEmailScan();
      }, 400);
    };

    window.addEventListener('hashchange', scheduleCheck);
    window.addEventListener('popstate', scheduleCheck);

    const observer = new MutationObserver(() => {
      const subjectHeader =
        document.querySelector('h2.hP') ||
        document.querySelector('div[role="main"] h2') ||
        document.querySelector('h2[data-thread-perm-id]');
      if (subjectHeader) {
        scheduleCheck();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    scheduleCheck();
  }

  initGmailActiveListening();

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 1. Check if this page should be blocked (Score > 70 and Auto-Block enabled)
  try {
    chrome.runtime.sendMessage({ type: 'CHECK_SHOULD_BLOCK' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.shouldBlock && response.scanResult) {
        showBlockerOverlay(response.scanResult);
      }
    });
  } catch {
    // Ignore
  }

  // 2. Check if this tab was opened from context menu to inspect
  try {
    chrome.runtime.sendMessage({ type: 'CHECK_AUTO_INSPECT' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.shouldInspect && response.scanResult) {
        if (response.scanResult.riskScore > 70) {
          showBlockerOverlay(response.scanResult);
        } else {
          showResultOverlay(response.scanResult);
        }
      }
    });
  } catch {
    // Ignore
  }

  // 3. Listen for messages from background script & popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PHISHLENS_BLOCK_PAGE') {
      showBlockerOverlay(message.result);
    } else if (message.type === 'PHISHLENS_SHOW_OVERLAY_LOADING') {
      showLoadingOverlay(message.url, message.message);
    } else if (message.type === 'PHISHLENS_SHOW_OVERLAY_RESULT') {
      showResultOverlay(message.result);
    } else if (message.type === 'PHISHLENS_SHOW_OVERLAY_ERROR') {
      showErrorOverlay(message.error, message.url);
    } else if (message.type === 'TRIGGER_SCREEN_QR_CAPTURE') {
      triggerScreenQrCapture();
    } else if (message.type === 'EXTRACT_GMAIL_DATA') {
      const data = extractGmailData();
      sendResponse(data);
      return true;
    } else if (message.type === 'SHOW_GMAIL_SCAN_OVERLAY') {
      showEmailReportOverlay(message.report);
      sendResponse({ success: true });
      return true;
    }
  });
})();
