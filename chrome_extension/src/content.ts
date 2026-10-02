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
    previewJobId?: string;
    previewUrl?: string;
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

  // Poll and render sandboxed preview thumbnail in Shadow DOM
  function pollAndRenderPreview(previewJobId: string, targetContainerId: string) {
    if (!previewJobId) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 10 || !shadowRoot) {
        clearInterval(interval);
        return;
      }
      try {
        const resp = await fetch(`http://localhost:5001/api/v1/preview/${previewJobId}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.status === 'ready' && data.imageUrl && shadowRoot) {
          clearInterval(interval);
          const container = shadowRoot.getElementById(targetContainerId);
          if (container) {
            container.innerHTML = `
              <div style="margin: 12px 0; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; font-family: ui-monospace, monospace;">Safe Preview (Sandboxed)</span>
                  ${data.visualImpersonation ? `<span style="font-size: 9px; font-weight: 700; color: #b91c1c; background: #fee2e2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px;">⚠️ ${data.visualImpersonation.similarity}% Match</span>` : ''}
                </div>
                <div style="width: 100%; height: 130px; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1; background: #0f172a;">
                  <img src="http://localhost:5001${data.imageUrl}" style="width: 100%; height: 100%; object-fit: cover; object-position: top; display: block;" alt="Safe sandboxed preview" />
                </div>
                <div style="font-size: 9px; color: #64748b; margin-top: 4px; text-align: center;">Sandboxed preview - nothing was loaded on your device</div>
              </div>
            `;
          }
        } else if (data.status === 'failed') {
          clearInterval(interval);
        }
      } catch {}
    }, 1000);
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

          <div id="phishlens-preview-blocker-container"></div>

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

    if (result.previewJobId) {
      pollAndRenderPreview(result.previewJobId, 'phishlens-preview-blocker-container');
    }

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

      <div id="phishlens-preview-hud-container"></div>

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

    if (result.previewJobId) {
      pollAndRenderPreview(result.previewJobId, 'phishlens-preview-hud-container');
    }

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

  // 3. Listen for messages from background script
  chrome.runtime.onMessage.addListener((message) => {
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
    }
  });
})();
