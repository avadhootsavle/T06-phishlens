// PhishLens Content Script — Safe DOM Metadata, Link Inspector HUD & Threat Blocker
// STRICT PRIVACY: NEVER reads input.value, NEVER logs user keystrokes.

(() => {
  function extractSafeMetadata() {
    // 1. Page Title & Headings
    const title = document.title || '';
    const headings: string[] = [];
    document.querySelectorAll('h1, h2').forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length < 100) headings.push(text);
    });

    // 2. Logo Alt Attributes
    const logoAltText: string[] = [];
    document.querySelectorAll('img').forEach((img) => {
      const alt = img.getAttribute('alt')?.trim();
      const className = img.className?.toLowerCase() || '';
      const id = img.id?.toLowerCase() || '';
      if (alt && (className.includes('logo') || id.includes('logo') || alt.toLowerCase().includes('logo'))) {
        logoAltText.push(alt);
      }
    });

    // 3. Inspect Form Inputs for Credential Traps (without touching .value!)
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

    // 4. Favicon
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
          background: rgba(8, 12, 24, 0.98);
          backdrop-filter: blur(28px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          overflow-y: auto;
          animation: phishlens-fade-in 0.3s ease-out;
        }
        @keyframes phishlens-fade-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .blocker-modal {
          max-width: 580px;
          width: 100%;
          background: rgba(15, 23, 42, 0.95);
          border: 2px solid rgba(239, 68, 68, 0.8);
          border-radius: 28px;
          box-shadow: 0 0 70px rgba(239, 68, 68, 0.35), 0 25px 50px -12px rgba(0, 0, 0, 0.9);
          padding: 32px 28px;
          text-align: center;
          color: #f1f5f9;
        }
        .blocker-icon-box {
          width: 68px;
          height: 68px;
          border-radius: 22px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          margin: 0 auto 16px auto;
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
          animation: phishlens-pulse 2s infinite;
        }
        @keyframes phishlens-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }
          50% { transform: scale(1.06); box-shadow: 0 0 35px rgba(239, 68, 68, 0.7); }
        }
        .badge-threat {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.6);
          color: #f87171;
          font-size: 11px;
          font-weight: 800;
          font-family: ui-monospace, monospace;
          letter-spacing: 0.8px;
          margin-bottom: 12px;
          text-transform: uppercase;
        }
        .blocker-title {
          font-size: 22px;
          font-weight: 900;
          color: #fff;
          margin-bottom: 8px;
          letter-spacing: -0.4px;
        }
        .blocker-subtitle {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 18px;
        }
        .highlight-red {
          color: #f87171;
          font-weight: 800;
          font-family: ui-monospace, monospace;
        }
        .score-pill-container {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-bottom: 18px;
        }
        .score-pill {
          padding: 8px 14px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(51, 65, 85, 0.8);
          font-size: 11px;
          font-family: ui-monospace, monospace;
        }
        .score-pill-threat {
          border-color: rgba(239, 68, 68, 0.5);
          color: #fca5a5;
        }
        .score-pill-safety {
          border-color: rgba(245, 158, 11, 0.5);
          color: #fde68a;
        }
        .url-box {
          font-size: 11px;
          font-family: ui-monospace, monospace;
          color: #38bdf8;
          background: rgba(2, 6, 23, 0.8);
          border: 1px solid rgba(51, 65, 85, 0.6);
          border-radius: 10px;
          padding: 8px 12px;
          word-break: break-all;
          margin-bottom: 18px;
          text-align: left;
        }
        .reason-box {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.7);
          border-radius: 16px;
          padding: 14px 16px;
          margin-bottom: 22px;
          text-align: left;
          font-size: 12px;
        }
        .reason-heading {
          font-size: 10px;
          font-weight: 800;
          font-family: ui-monospace, monospace;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .reason-explanation {
          color: #e2e8f0;
          font-weight: 600;
          line-height: 1.4;
          margin-bottom: 8px;
        }
        .gemini-quote {
          background: rgba(88, 28, 135, 0.25);
          border-left: 3px solid #a855f7;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 11px;
          color: #e9d5ff;
          margin-top: 8px;
          line-height: 1.35;
        }
        .blocker-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .btn-safety {
          padding: 14px 20px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(135deg, #059669, #0284c7);
          border: none;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
          box-shadow: 0 4px 15px rgba(5, 150, 105, 0.35);
        }
        .btn-safety:hover {
          transform: translateY(-1px);
          opacity: 0.95;
        }
        .btn-unsafe {
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          background: transparent;
          border: 1px solid rgba(148, 163, 184, 0.3);
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
        }
        .btn-unsafe:hover {
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.6);
        }
      </style>

      <div class="blocker-backdrop">
        <div class="blocker-modal">
          <div class="blocker-icon-box">🛡️</div>
          <span class="badge-threat">CRITICAL THREAT BLOCKED</span>
          <h1 class="blocker-title">Dangerous Website Blocked</h1>
          <p class="blocker-subtitle">
            PhishLens blocked this page because it has a safety score of only <span class="highlight-red">${safetyScore}%</span> (Risk Score: <span class="highlight-red">${result.riskScore}/100</span> &gt; 70 threshold).
          </p>

          <div class="score-pill-container">
            <div class="score-pill score-pill-threat">
              Threat Score: <strong>${result.riskScore}/100</strong>
            </div>
            <div class="score-pill score-pill-safety">
              Safety Score: <strong>${safetyScore}/100 (Very Low)</strong>
            </div>
          </div>

          <div class="url-box">
            <strong>Blocked Destination:</strong> ${escapeHtml(result.finalUrl || result.url)}
          </div>

          <div class="reason-box">
            <div class="reason-heading">Threat Evidence & Analysis</div>
            <div class="reason-explanation">${escapeHtml(result.explanation)}</div>

            ${result.intentGuard?.claimedBrand ? `
              <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">
                • Detected Impersonation: <strong>${escapeHtml(result.intentGuard.claimedBrand)}</strong>
                (Official Domain: ${result.intentGuard.isOfficialDomain ? 'YES' : '<span style="color:#f87171;font-weight:bold;">NO - FAKE SITE</span>'})
              </div>
            ` : ''}

            ${result.geminiAdvisor?.summaryExplanation ? `
              <div class="gemini-quote">
                <strong>✨ Gemini 3.8 Flash AI:</strong> ${escapeHtml(result.geminiAdvisor.summaryExplanation)}
              </div>
            ` : ''}
          </div>

          <div class="blocker-actions">
            <button id="btn-safety-back" class="btn-safety">
              🛡️ Go Back to Safety (Recommended)
            </button>
            <button id="btn-proceed-unsafe" class="btn-unsafe">
              I understand the risks, proceed to site anyway ➔
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

  // -------------------------------------------------------------
  // Standard Floating HUD Link Inspector
  // -------------------------------------------------------------
  function renderOverlay(html: string) {
    const root = ensureShadowRoot(false);
    root.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .hud-card {
          pointer-events: auto;
          width: 380px;
          max-width: calc(100vw - 40px);
          background: rgba(10, 15, 30, 0.96);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 20px;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.8), 0 0 25px rgba(6, 182, 212, 0.15);
          color: #f1f5f9;
          padding: 18px;
          backdrop-filter: blur(20px);
          animation: phishlens-slide-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes phishlens-slide-in {
          from { opacity: 0; transform: translateY(-16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .brand { display: flex; align-items: center; gap: 8px; }
        .logo-box { width: 26px; height: 26px; border-radius: 8px; background: linear-gradient(135deg, #06b6d4, #2563eb); display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .brand-title { font-size: 13px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
        .brand-subtitle { font-size: 9px; color: #38bdf8; font-family: ui-monospace, monospace; text-transform: uppercase; }
        .close-btn { background: transparent; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 2px 6px; border-radius: 6px; }
        .close-btn:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
        .url-box { font-size: 10px; font-family: ui-monospace, monospace; color: #38bdf8; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(51, 65, 85, 0.6); border-radius: 8px; padding: 6px 10px; word-break: break-all; margin-bottom: 12px; }
        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 800; font-family: ui-monospace, monospace; text-transform: uppercase; }
        .badge-safe { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
        .badge-caution { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
        .badge-danger { background: rgba(239, 68, 68, 0.25); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5); }
        .score { font-size: 18px; font-weight: 900; font-family: ui-monospace, monospace; color: #fff; }
        .score-denom { font-size: 11px; color: #64748b; font-weight: normal; }
        .explanation { font-size: 12px; color: #e2e8f0; font-weight: 600; line-height: 1.4; margin-bottom: 12px; }
        .section-box { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(30, 41, 59, 0.8); border-radius: 12px; padding: 10px 12px; margin-bottom: 10px; font-size: 11px; }
        .section-label { font-size: 9px; font-weight: 800; font-family: ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 6px; }
        .gemini-box { background: rgba(88, 28, 135, 0.25); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; font-size: 11px; color: #f1f5f9; }
        .gemini-label { display: flex; align-items: center; justify-content: space-between; font-size: 9px; font-weight: 800; font-family: ui-monospace, monospace; color: #c084fc; margin-bottom: 4px; }
        .footer-actions { display: flex; gap: 8px; margin-top: 12px; }
        .btn { flex: 1; padding: 8px 12px; border-radius: 10px; font-size: 11px; font-weight: 700; text-align: center; cursor: pointer; text-decoration: none; border: none; }
        .btn-primary { background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; }
        .btn-primary:hover { opacity: 0.95; }
        .btn-secondary { background: rgba(30, 41, 59, 0.8); color: #cbd5e1; border: 1px solid rgba(51, 65, 85, 0.6); }
        .btn-secondary:hover { background: rgba(51, 65, 85, 0.8); color: #fff; }
        .spinner { width: 22px; height: 22px; border: 2.5px solid rgba(56, 189, 248, 0.2); border-top-color: #38bdf8; border-radius: 50%; animation: phishlens-spin 0.8s linear infinite; margin: 0 auto 10px auto; }
        @keyframes phishlens-spin { to { transform: rotate(360deg); } }
      </style>
      <div class="hud-card">
        ${html}
      </div>
    `;

    root.querySelector('.close-btn')?.addEventListener('click', dismissOverlay);
    root.querySelector('#btn-dismiss')?.addEventListener('click', dismissOverlay);
  }

  function showLoadingOverlay(url: string, message?: string) {
    if (autoDismissTimer) clearTimeout(autoDismissTimer);
    renderOverlay(`
      <div class="header">
        <div class="brand">
          <div class="logo-box">🛡️</div>
          <div>
            <div class="brand-title">PhishLens Inspector</div>
            <div class="brand-subtitle">Intent-Aware Security</div>
          </div>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>
      <div class="url-box">${escapeHtml(url)}</div>
      <div style="text-align: center; padding: 18px 0;">
        <div class="spinner"></div>
        <div style="font-size: 12px; font-weight: 600; color: #fff; margin-bottom: 4px;">
          ${escapeHtml(message || 'Inspecting Destination...')}
        </div>
        <div style="font-size: 10px; color: #94a3b8;">Analyzing redirect hops, domain age, typosquatting & Gemini AI...</div>
      </div>
    `);
  }

  function showResultOverlay(result: ScanResultPayload) {
    const verdict = result.verdict || 'SAFE';
    const badgeClass = verdict === 'DANGER' ? 'badge-danger' : verdict === 'CAUTION' ? 'badge-caution' : 'badge-safe';
    const verdictColor = verdict === 'DANGER' ? '#ef4444' : verdict === 'CAUTION' ? '#f59e0b' : '#10b981';

    let intentGuardHtml = '';
    if (result.intentGuard) {
      intentGuardHtml = `
        <div class="section-box">
          <div class="section-label">IntentGuard™ Identity</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8;">Claimed Brand:</span>
            <strong style="color: #fff;">${escapeHtml(result.intentGuard.claimedBrand || 'None detected')}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #94a3b8;">Official Domain:</span>
            <strong style="color: ${result.intentGuard.isOfficialDomain ? '#34d399' : '#f87171'};">
              ${result.intentGuard.isOfficialDomain ? 'YES (Verified)' : 'NO (Unverified)'}
            </strong>
          </div>
          ${result.intentGuard.lookalikeMatch ? `
            <div style="margin-top: 4px; font-size: 10px; color: #f87171;">
              ⚠️ Mimics legitimate official address: <strong>${escapeHtml(result.intentGuard.lookalikeMatch)}</strong>
            </div>
          ` : ''}
        </div>
      `;
    }

    let geminiHtml = '';
    if (result.geminiAdvisor) {
      geminiHtml = `
        <div class="gemini-box">
          <div class="gemini-label">
            <span>✨ GEMINI 3.8 FLASH AI</span>
            <span>${escapeHtml(result.geminiAdvisor.threatLevel || 'ANALYZED')}</span>
          </div>
          <div style="line-height: 1.35; margin-bottom: 4px;">${escapeHtml(result.geminiAdvisor.summaryExplanation || '')}</div>
          ${result.geminiAdvisor.socialEngineeringTactics && result.geminiAdvisor.socialEngineeringTactics.length > 0 ? `
            <div style="font-size: 10px; color: #d8b4fe;">
              Tactics: <strong>${escapeHtml(result.geminiAdvisor.socialEngineeringTactics.join(', '))}</strong>
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
              <li style="color: #cbd5e1; font-size: 11px; margin-bottom: 4px; line-height: 1.3;">• ${escapeHtml(item)}</li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    renderOverlay(`
      <div class="header">
        <div class="brand">
          <div class="logo-box">🛡️</div>
          <div>
            <div class="brand-title">PhishLens Inspector</div>
            <div class="brand-subtitle">Intent-Aware Security</div>
          </div>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>

      <div class="url-box" title="${escapeHtml(result.finalUrl || result.url)}">
        ${result.isShortened ? '<div style="color: #fbbf24; font-weight: bold; margin-bottom: 2px;">⚡ Shortened URL Unmasked</div>' : ''}
        ${result.finalUrl && result.finalUrl !== result.url ? `
          <div style="font-size: 9px; color: #94a3b8; margin-bottom: 3px;">Initial link: ${escapeHtml(result.url)}</div>
          <div style="font-size: 11px; font-weight: bold; color: #38bdf8;">Final Destination: ${escapeHtml(result.finalUrl)}</div>
        ` : `
          <div>${escapeHtml(result.url)}</div>
        `}
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding: 10px 12px; background: rgba(15, 23, 42, 0.6); border-radius: 12px; border: 1px solid ${verdictColor}40;">
        <span class="badge ${badgeClass}">${verdict}</span>
        <div class="score">
          ${result.riskScore} <span class="score-denom">/ 100</span>
        </div>
      </div>

      <div class="explanation">${escapeHtml(result.explanation)}</div>

      ${intentGuardHtml}
      ${geminiHtml}
      ${whyListHtml}

      <div class="footer-actions">
        ${result.finalUrl && result.finalUrl !== window.location.href ? `
          <a href="${escapeHtml(result.finalUrl)}" target="_blank" class="btn btn-primary" style="background: linear-gradient(135deg, #059669, #0284c7); text-decoration: none;">
            🚀 Go to Final URL
          </a>
        ` : `
          <a href="http://localhost:3000" target="_blank" class="btn btn-primary">
            Open Full PWA
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
        <div class="brand">
          <div class="logo-box" style="background: #ef4444;">⚠️</div>
          <div>
            <div class="brand-title">PhishLens Error</div>
            <div class="brand-subtitle">Scan Incomplete</div>
          </div>
        </div>
        <button class="close-btn">✕</button>
      </div>
      <div class="url-box">${escapeHtml(url)}</div>
      <div style="color: #f87171; font-size: 11px; padding: 10px 0;">${escapeHtml(error)}</div>
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
    }
  });
})();
