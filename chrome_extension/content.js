(()=>{const Z="http://localhost:5001/api/v1";function Q(){const e=document.title||"",n=[];document.querySelectorAll("h1, h2").forEach(o=>{var y;const c=(y=o.textContent)==null?void 0:y.trim();c&&c.length<100&&n.push(c)});const t=[];document.querySelectorAll("img").forEach(o=>{var u,S,p;const c=(u=o.getAttribute("alt"))==null?void 0:u.trim(),y=((S=o.className)==null?void 0:S.toLowerCase())||"",g=((p=o.id)==null?void 0:p.toLowerCase())||"";c&&(y.includes("logo")||g.includes("logo")||c.toLowerCase().includes("logo"))&&t.push(c)});let i=!1,s=!1,b=!1,m=!1,r=!1,d=!1;document.querySelectorAll("input, select, textarea").forEach(o=>{const c=(o.getAttribute("type")||"").toLowerCase(),y=(o.getAttribute("name")||"").toLowerCase(),g=(o.getAttribute("id")||"").toLowerCase(),u=(o.getAttribute("placeholder")||"").toLowerCase(),S=(o.getAttribute("aria-label")||"").toLowerCase(),p=`${y} ${g} ${u} ${S}`;(c==="password"||p.includes("password")||p.includes("pwd"))&&(i=!0),(p.includes("otp")||p.includes("one time password")||p.includes("verification code")||p.includes("2fa"))&&(s=!0),(p.includes("cvv")||p.includes("cvc")||p.includes("security code"))&&(b=!0),(p.includes("card")||p.includes("pan number")||p.includes("debit"))&&(m=!0),(p.includes("kyc")||p.includes("aadhaar")||p.includes("pan card"))&&(r=!0),(p.includes("upi pin")||p.includes("mpin"))&&(d=!0)});const a=document.querySelector("link[rel*='icon']"),v=a?a.href:void 0;return{url:window.location.href,title:e,headings:n.slice(0,5),logoAltText:t.slice(0,3),hasPasswordField:i,hasOtpField:s,hasCvvField:b,hasCardField:m,hasKycField:r,hasUpiPinField:d,faviconUrl:v}}try{const e=Q();chrome.runtime.sendMessage({type:"PAGE_METADATA_EXTRACTED",payload:e})}catch{}let f=null,$=null,E=null;function G(e=!1){return(!f||!document.contains(f))&&(f=document.createElement("div"),f.id="phishlens-inspector-host",f.style.position="fixed",f.style.zIndex="2147483647",$=f.attachShadow({mode:"open"}),document.body.appendChild(f)),e?(f.style.top="0",f.style.left="0",f.style.right="0",f.style.bottom="0",f.style.width="100vw",f.style.height="100vh",f.style.pointerEvents="auto"):(f.style.top="20px",f.style.right="20px",f.style.left="auto",f.style.bottom="auto",f.style.width="auto",f.style.height="auto",f.style.pointerEvents="none"),$}function C(){E&&(clearTimeout(E),E=null),f&&(f.remove(),f=null,$=null)}const k={shield:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',camera:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',alertTriangle:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',alertOctagon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',checkCircle:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',externalLink:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'};function z(){chrome.runtime.sendMessage({type:"OPEN_POPUP_FOR_QR"}),C()}const X=`
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
  `;function R(e){var t,i,s,b,m;const n=G(!1);n.innerHTML=`
      <style>${X}</style>
      <div class="hud-card">
        ${e}
      </div>
    `,(t=n.querySelector(".close-btn"))==null||t.addEventListener("click",C),(i=n.querySelector("#btn-dismiss"))==null||i.addEventListener("click",C),(s=n.querySelector("#btn-hud-capture-qr"))==null||s.addEventListener("click",z),(b=n.querySelector("#btn-hud-capture-top"))==null||b.addEventListener("click",z),(m=n.querySelector("#btn-retry-capture"))==null||m.addEventListener("click",z)}function D(e){var i,s,b;E&&clearTimeout(E);const n=G(!0),t=Math.max(0,100-e.riskScore);n.innerHTML=`
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
          <div class="blocker-icon-box">${k.alertOctagon}</div>
          <span class="badge-threat">Dangerous Site Blocked</span>
          <h1 class="blocker-title">DO NOT PROCEED</h1>
          <p class="blocker-subtitle">
            PhishLens blocked this page to protect your credentials and data. The threat score is <strong>${e.riskScore}/100</strong> (Safety Score: ${t}%).
          </p>

          <div class="score-pill-container">
            <div class="score-pill score-pill-threat">
              Threat Score: <strong>${e.riskScore}/100</strong>
            </div>
            <div class="score-pill score-pill-safety">
              Safety Score: <strong>${t}/100 (Unsafe)</strong>
            </div>
          </div>

          <div class="url-box">
            <strong>Destination:</strong> ${l(e.finalUrl||e.url)}
          </div>

          <div class="reason-box">
            <div class="reason-heading">Security Evidence</div>
            <div class="reason-explanation">${l(e.explanation)}</div>

            ${(i=e.intentGuard)!=null&&i.claimedBrand?`
              <div style="font-size: 11px; color: #475569; margin-top: 4px;">
                Detected Impersonation: <strong>${l(e.intentGuard.claimedBrand)}</strong>
                (${e.intentGuard.isOfficialDomain?"Verified Domain":'<span style="color:#b91c1c;font-weight:bold;">Fake Unofficial Domain</span>'})
              </div>
            `:""}
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
    `,(s=n.querySelector("#btn-safety-back"))==null||s.addEventListener("click",()=>{window.history.length>1?window.history.back():window.location.href="https://google.com"}),(b=n.querySelector("#btn-proceed-unsafe"))==null||b.addEventListener("click",()=>{chrome.runtime.sendMessage({type:"BYPASS_BLOCK_FOR_TAB"},()=>{C()})})}function J(e,n){E&&clearTimeout(E),R(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge">${k.shield}</div>
          <div>
            <div class="brand-title">PhishLens Inspector</div>
            <div class="brand-subtitle">Intent-Aware Security</div>
          </div>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>
      <div class="url-box">${l(e)}</div>
      <div style="text-align: center; padding: 20px 0;">
        <div class="spinner"></div>
        <div style="font-size: 12px; font-weight: 600; color: #0f172a; margin-bottom: 2px;">
          ${l(n||"Inspecting Destination...")}
        </div>
        <div style="font-size: 10px; color: #64748b;">Analyzing redirect hops, domain age, typosquatting & intent...</div>
      </div>
    `)}function _(e){const n=e.verdict||"SAFE",t=n==="DANGER",i=n==="CAUTION",s=t?"decision-danger":i?"decision-caution":"decision-safe",b=t?k.alertOctagon:i?k.alertTriangle:k.checkCircle,m=t?"DO NOT CLICK / MALICIOUS LINK":i?"PROCEED WITH CAUTION":"SAFE TO CLICK / PROCEED",r=t?"This link exhibits high impersonation or credential trap signals. Do not submit data.":i?"Unverified domain or suspicious structure detected. Confirm address before proceeding.":"No major phishing indicators detected on this destination.";let d="";e.intentGuard&&(d=`
        <div class="section-box">
          <div class="section-label">IntentGuard™ Identity</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #64748b;">Claimed Brand:</span>
            <strong style="color: #0f172a;">${l(e.intentGuard.claimedBrand||"None detected")}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Official Domain:</span>
            <strong style="color: ${e.intentGuard.isOfficialDomain?"#15803d":"#b91c1c"};">
              ${e.intentGuard.isOfficialDomain?"Verified":"Fake / Unofficial"}
            </strong>
          </div>
          ${e.intentGuard.lookalikeMatch?`
            <div style="margin-top: 4px; font-size: 10px; color: #b91c1c;">
              Mimics official address: <strong>${l(e.intentGuard.lookalikeMatch)}</strong>
            </div>
          `:""}
        </div>
      `);let x="";e.why&&e.why.length>0&&(x=`
        <div class="section-box">
          <div class="section-label">Evidence (${e.why.length})</div>
          <ul style="list-style: none; padding: 0;">
            ${e.why.slice(0,3).map(a=>`
              <li style="color: #475569; font-size: 10px; margin-bottom: 3px; line-height: 1.35;">• ${l(a)}</li>
            `).join("")}
          </ul>
        </div>
      `),R(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge">${k.shield}</div>
          <div>
            <div class="brand-title">PhishLens Inspector</div>
            <div class="brand-subtitle">Intent-Aware Security</div>
          </div>
        </div>
        <div class="header-actions">
          <button id="btn-hud-capture-top" class="btn-capture-top" title="Scan Screen for QR">
            ${k.camera} Capture Screen QR
          </button>
          <button class="close-btn" title="Close">✕</button>
        </div>
      </div>

      <div class="decision-banner ${s}">
        <div style="margin-top: 1px;">${b}</div>
        <div>
          <div class="decision-title">${m}</div>
          <div class="decision-subtext">${r}</div>
        </div>
      </div>

      <div class="status-row">
        <span class="badge ${n==="DANGER"?"badge-danger":n==="CAUTION"?"badge-caution":"badge-safe"}">
          ${n}
        </span>
        <div class="score-text">
          ${e.riskScore} <span class="score-denom">/ 100</span>
        </div>
      </div>

      <div class="url-box" title="${l(e.finalUrl||e.url)}">
        ${e.isShortened?'<div style="color: #b45309; font-weight: 700; margin-bottom: 2px;">Shortened URL Unmasked</div>':""}
        ${e.finalUrl&&e.finalUrl!==e.url?`
          <div style="font-size: 9px; color: #64748b; margin-bottom: 2px;">Initial: ${l(e.url)}</div>
          <div style="font-weight: 700; color: #0f172a;">Destination: ${l(e.finalUrl)}</div>
        `:`
          <div>${l(e.url)}</div>
        `}
      </div>

      <div class="explanation">${l(e.explanation)}</div>

      ${d}
      ${x}

      <div class="footer-actions">
        ${e.finalUrl&&e.finalUrl!==window.location.href?`
          <a href="${l(e.finalUrl)}" target="_blank" class="btn btn-primary">
            Open Destination ${k.externalLink}
          </a>
        `:`
          <a href="http://localhost:3000" target="_blank" class="btn btn-primary">
            Open Full PWA ${k.externalLink}
          </a>
        `}
        <button id="btn-dismiss" class="btn btn-secondary">
          Dismiss
        </button>
      </div>
    `),E&&clearTimeout(E),E=setTimeout(C,3e4)}function ee(e,n){R(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge" style="background: #b91c1c;">${k.alertTriangle}</div>
          <div>
            <div class="brand-title">PhishLens Inspector</div>
            <div class="brand-subtitle">Scan Incomplete</div>
          </div>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>
      <div class="url-box">${l(n)}</div>
      <div style="color: #b91c1c; font-size: 11px; padding: 8px 0; line-height: 1.4;">${l(e)}</div>
      <div class="footer-actions">
        <button id="btn-dismiss" class="btn btn-secondary">Dismiss</button>
      </div>
    `)}function q(){var u,S,p,L,I,T,O,j,F;if(!window.location.hostname.includes("mail.google.com"))return{isGmail:!1,isEmailOpen:!1,links:[]};const n=document.querySelector("h2.hP")||document.querySelector('div[role="main"] h2')||document.querySelector("h2[data-thread-perm-id]")||document.querySelector("h2[data-legacy-thread-id]");let t=((u=n==null?void 0:n.textContent)==null?void 0:u.trim())||"";t||(t=document.title.replace(/\s*-\s*Gmail$/i,"").replace(/^Inbox\s*\(\d+\)\s*-\s*/i,"").replace(/^Inbox\s*-\s*/i,"").trim());const i=document.querySelector("span.gD")||document.querySelector("span[email]")||document.querySelector('div[role="main"] span[email]')||document.querySelector('div[role="main"] span.gD')||document.querySelector("span.go");let s=(i==null?void 0:i.getAttribute("name"))||((S=i==null?void 0:i.textContent)==null?void 0:S.trim())||"",b=(i==null?void 0:i.getAttribute("email"))||"";if(!b){const h=document.querySelector('span.go, div[role="main"] span.go');if(h){const A=((p=h.textContent)==null?void 0:p.match(/<([^>]+)>/))||((L=h.textContent)==null?void 0:L.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/));A&&(b=A[1])}}if(!b&&(i!=null&&i.textContent)){const h=i.textContent.match(/<([^>]+)>/)||i.textContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);h&&(b=h[1])}s&&s.includes("<")&&(s=s.split("<")[0].trim());const m=["div.a3s","div.ii.gt","div.adn",'div[role="listitem"] .ii','div[role="listitem"]',"div[data-message-id]","div.gs",'div[role="main"] table.cf','div[role="main"] div[dir="ltr"]'],r=document.querySelectorAll(m.join(", "));let d=null;if(r.length>0){for(let h=r.length-1;h>=0;h--){const A=r[h];if(A.offsetParent!==null||A.clientHeight>0){d=A;break}}d||(d=r[r.length-1])}const a=!!t&&t.toLowerCase()!=="inbox"&&!t.toLowerCase().startsWith("inbox (")||r.length>0||window.location.hash.length>10,v=((T=(I=d==null?void 0:d.textContent)==null?void 0:I.slice(0,800))==null?void 0:T.trim())||((F=(j=(O=document.querySelector('div[role="main"]'))==null?void 0:O.textContent)==null?void 0:j.slice(0,800))==null?void 0:F.trim())||"",o=r.length>0?Array.from(r):[document.querySelector('div[role="main"]')||document.body],c=[];o.forEach(h=>{h&&h.querySelectorAll("a[href]").forEach(A=>{var V,W,K;let w=(A.getAttribute("href")||"").trim();if(!w)return;if(w.includes("google.com/url?")||w.includes("google.com/url/"))try{const Y=new URL(w).searchParams.get("q");Y&&(w=Y)}catch{}if(w.startsWith("https://mail.google.com")||w.startsWith("http://mail.google.com")||w.startsWith("https://accounts.google.com/SignOut")||w.startsWith("mailto:")||w.startsWith("tel:")||w.startsWith("javascript:")||w==="#"||w.startsWith("#"))return;const ne=((V=A.textContent)==null?void 0:V.trim())||((W=A.getAttribute("title"))==null?void 0:W.trim())||((K=A.getAttribute("aria-label"))==null?void 0:K.trim())||"";c.push({url:w,text:ne})})});const y=new Set,g=[];for(const h of c)y.has(h.url)||(y.add(h.url),g.push(h));return{isGmail:!0,isEmailOpen:a,subject:t||"Active Email Message",senderName:s||"Unknown Sender",senderEmail:b||"unknown@domain.com",bodySnippet:v,links:g}}function B(e){const n=e.emailVerdict==="DANGER",t=e.emailVerdict==="CAUTION",i=n?"decision-danger":t?"decision-caution":"decision-safe",s=n?k.alertOctagon:t?k.alertTriangle:k.checkCircle,b=n?"DANGEROUS EMAIL / PHISHING DETECTED":t?"CAUTION: SUSPICIOUS EMAIL":"SAFE EMAIL: NO THREATS DETECTED";let m="";if(e.senderAnalysis){const a=e.senderAnalysis;m=`
        <div class="section-box">
          <div class="section-label">Sender Identity Analysis</div>
          <div style="font-size: 11px; margin-bottom: 4px; color: #0f172a;">
            <strong>${l(a.senderName||"Unknown")}</strong> &lt;${l(a.senderEmail||"Unknown")}&gt;
          </div>
          ${a.isSpoofed?`
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 8px; color: #991b1b; font-size: 10.5px; line-height: 1.35; margin-top: 4px;">
              <strong>🚨 Brand Impersonation:</strong> ${l(a.details)}
            </div>
          `:`
            <div style="color: #15803d; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
              <span>✓</span> Sender address domain matches official registration.
            </div>
          `}
        </div>
      `}let r="";e.urgencySignals&&e.urgencySignals.length>0&&(r=`
        <div class="section-box" style="background: #fffbeb; border-color: #fef3c7;">
          <div class="section-label" style="color: #92400e;">Psychological Urgency Tactics (${e.urgencySignals.length})</div>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${e.urgencySignals.map(a=>`
              <li style="font-size: 10.5px; color: #78350f; margin-bottom: 2px;">⚠️ ${l(a)}</li>
            `).join("")}
          </ul>
        </div>
      `);let d="";e.linksAnalyzed&&e.linksAnalyzed.length>0?d=`
        <div class="section-box">
          <div class="section-label">
            Contained Links (${e.linksAnalyzed.length}) — 
            <span style="color: ${e.summary.dangerCount>0?"#dc2626":"#64748b"}; font-weight: 700;">
              ${e.summary.dangerCount} Danger, ${e.summary.cautionCount} Caution, ${e.summary.safeCount} Safe
            </span>
          </div>
          <div style="max-height: 160px; overflow-y: auto; padding-right: 2px;">
            ${e.linksAnalyzed.map(a=>{const v=a.verdict==="DANGER",o=a.verdict==="CAUTION";return`
                <div style="background: ${v?"#fef2f2":o?"#fffbeb":"#f0fdf4"}; border: 1px solid ${v?"#fecaca":o?"#fde68a":"#bbf7d0"}; border-radius: 6px; padding: 6px 8px; margin-bottom: 6px; font-size: 10.5px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                    <span style="font-weight: 700; color: ${v?"#b91c1c":o?"#b45309":"#15803d"};">${l(a.verdict)} (${a.riskScore}/100)</span>
                    ${a.text?`<span style="color: #64748b; font-size: 10px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">"${l(a.text)}"</span>`:""}
                  </div>
                  <div style="font-family: monospace; font-size: 10px; color: #334155; word-break: break-all; margin-bottom: 2px;">
                    ${l(a.finalUrl||a.url)}
                  </div>
                  <div style="color: #475569; font-size: 10px; line-height: 1.3;">
                    ${l(a.explanation)}
                  </div>
                </div>
              `}).join("")}
          </div>
        </div>
      `:d=`
        <div class="section-box" style="color: #15803d; font-size: 10.5px;">
          ✓ No external hyperlinks detected in this email message.
        </div>
      `,R(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge">${k.shield}</div>
          <div>
            <div class="brand-title">PhishLens Email Sentinel</div>
            <div class="brand-subtitle">Gmail Intent & Link Analysis</div>
          </div>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>

      <div class="decision-banner ${i}">
        <div style="margin-top: 1px;">${s}</div>
        <div>
          <div class="decision-title">${b} (${e.emailRiskScore}/100)</div>
          <div class="decision-subtext">${l(e.explanation)}</div>
        </div>
      </div>

      <div style="font-size: 11px; font-weight: 600; color: #0f172a; padding: 4px 0 2px 0;">
        Subject: "${l(e.subject)}"
      </div>

      ${m}
      ${r}
      ${d}

      <div class="footer-actions">
        <button id="btn-dismiss" class="btn btn-secondary" style="flex: 1;">Close Report</button>
        <button id="btn-open-pwa-report" class="btn btn-primary" style="flex: 1;">Report to Triage</button>
      </div>
    `);const x=$==null?void 0:$.getElementById("btn-open-pwa-report");x&&x.addEventListener("click",()=>{var c,y,g,u;const a=(c=e.linksAnalyzed)==null?void 0:c.find(S=>S.verdict==="DANGER"),v=(a==null?void 0:a.url)||((g=(y=e.linksAnalyzed)==null?void 0:y[0])==null?void 0:g.url)||"",o=`http://localhost:3000/report?url=${encodeURIComponent(v)}&note=${encodeURIComponent(`Reported via Gmail Sentinel: ${e.subject} (Sender: ${(u=e.senderAnalysis)==null?void 0:u.senderEmail})`)}`;window.open(o,"_blank"),C()})}const U=new Map;let N=!1,M="";function P(e){if(!(e!=null&&e.linksAnalyzed)||e.linksAnalyzed.length===0)return;const n=e.linksAnalyzed.filter(s=>s.verdict==="DANGER"),t=e.linksAnalyzed.filter(s=>s.verdict==="CAUTION");document.querySelectorAll("div.a3s, div.ii.gt, div.adn").forEach(s=>{s.querySelectorAll("a[href]").forEach(m=>{var a,v;const r=m;let d=r.getAttribute("href")||"";if(d.includes("google.com/url?")||d.includes("google.com/url/"))try{const c=new URL(d).searchParams.get("q");c&&(d=c)}catch{}const x=n.find(o=>o.url===d||o.finalUrl===d||d.startsWith(o.url));if(x){if(!r.classList.contains("phishlens-highlighted-danger")){if(r.classList.add("phishlens-highlighted-danger"),r.style.cssText+=`
              outline: 2px dashed #dc2626 !important;
              background: #fee2e2 !important;
              color: #991b1b !important;
              padding: 2px 6px !important;
              border-radius: 4px !important;
              text-decoration: none !important;
              font-weight: 700 !important;
              cursor: pointer !important;
              position: relative !important;
            `,!((a=r.parentElement)!=null&&a.querySelector(".phishlens-danger-badge"))){const o=document.createElement("span");o.className="phishlens-danger-badge",o.style.cssText=`
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
              `,o.textContent="⚠️ Harmful Link",(v=r.parentNode)==null||v.insertBefore(o,r.nextSibling)}r.onclick=o=>{o.preventDefault(),o.stopPropagation(),confirm(`🚨 PHISHLENS SECURITY WARNING

This link in this email is flagged as DANGEROUS PHISHING (Score: ${x.riskScore}/100).

Target Destination: ${x.url}
Reason: ${x.explanation}

Do you really want to risk opening this link?`)&&window.open(x.url,"_blank")}}}else t.find(c=>c.url===d||c.finalUrl===d)&&!r.classList.contains("phishlens-highlighted-caution")&&(r.classList.add("phishlens-highlighted-caution"),r.style.cssText+=`
              outline: 1px solid #d97706 !important;
              background: #fffbeb !important;
              padding: 1px 4px !important;
              border-radius: 3px !important;
            `)})})}function H(e,n){var x,a,v,o,c,y;let t=document.getElementById("phishlens-inmail-banner");if(!t){t=document.createElement("div"),t.id="phishlens-inmail-banner",t.style.cssText=`
        margin: 10px 0 14px 0;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        transition: all 0.2s ease;
        animation: phishlens-fade-in 0.2s ease;
        z-index: 5;
      `;const g=document.querySelector("h2.hP")||document.querySelector('div[role="main"] h2')||document.querySelector("h2[data-thread-perm-id]");if(g&&g.parentElement){const u=g.parentElement;u.nextSibling?(x=u.parentNode)==null||x.insertBefore(t,u.nextSibling):(a=u.parentNode)==null||a.appendChild(t)}else{const u=document.querySelector('div[role="main"]');u==null||u.insertBefore(t,u.firstChild)}}if(n==="scanning"){t.style.background="#f8f9fa",t.style.border="1px solid #e2e8f0",t.style.padding="8px 12px",t.innerHTML=`
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
          <div style="display: flex; align-items: center; gap: 8px; color: #475569;">
            <div style="width: 14px; height: 14px; border: 2px solid #cbd5e1; border-top-color: #2563eb; border-radius: 50%; animation: phishlens-spin 0.7s linear infinite;"></div>
            <strong style="color: #0f172a;">PhishLens Sentinel:</strong>
            <span>Active listening enabled — evaluating sender domain authenticity & scanning embedded links...</span>
          </div>
        </div>
      `;return}const i=e.emailVerdict==="DANGER",s=e.emailVerdict==="CAUTION";t.style.background=i?"#fef2f2":s?"#fffbeb":"#f0fdf4",t.style.border=`1px solid ${i?"#fecaca":s?"#fde68a":"#bbf7d0"}`,t.style.padding="10px 14px";const b=i?'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" stroke-width="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>':s?'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',m=i?"#b91c1c":s?"#b45309":"#15803d",r=i?`🚨 DANGEROUS PHISHING EMAIL DETECTED (Risk Score: ${e.emailRiskScore}/100)`:s?`⚠️ CAUTION: SUSPICIOUS EMAIL (Risk Score: ${e.emailRiskScore}/100)`:`✓ VERIFIED LEGITIMATE EMAIL (Legitimacy Score: ${Math.max(0,100-e.emailRiskScore)}/100)`,d=i?`${l(e.explanation)} — Do not click highlighted red links.`:s?`${l(e.explanation)}`:`Sender domain authenticated (${l(((v=e.senderAnalysis)==null?void 0:v.senderEmail)||"Verified")}). ${((o=e.summary)==null?void 0:o.totalLinks)||0} links verified clean.`;t.innerHTML=`
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
        <div style="display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 260px;">
          <div style="margin-top: 1px;">${b}</div>
          <div>
            <div style="font-size: 11.5px; font-weight: 800; color: ${m}; letter-spacing: 0.2px;">
              ${r}
            </div>
            <div style="font-size: 10.5px; color: #334155; margin-top: 2px; line-height: 1.35;">
              ${d}
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
          ${i?`
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
          `:""}
        </div>
      </div>
    `,(c=t.querySelector("#phishlens-btn-show-details"))==null||c.addEventListener("click",()=>{B(e)}),(y=t.querySelector("#phishlens-btn-report-banner"))==null||y.addEventListener("click",()=>{var p,L,I,T;const g=(p=e.linksAnalyzed)==null?void 0:p.find(O=>O.verdict==="DANGER"),u=(g==null?void 0:g.url)||((I=(L=e.linksAnalyzed)==null?void 0:L[0])==null?void 0:I.url)||"",S=`http://localhost:3000/report?url=${encodeURIComponent(u)}&note=${encodeURIComponent(`Reported from Gmail Active Listening: ${e.subject} (Sender: ${(T=e.senderAnalysis)==null?void 0:T.senderEmail})`)}`;window.open(S,"_blank")})}async function te(){if(N)return;const e=q();if(!e.isGmail||!e.isEmailOpen)return;const n=`${e.subject}__${e.senderEmail}__${window.location.hash}`;if(n===M&&U.has(n)){const t=U.get(n);H(t,"done"),P(t);return}M=n,N=!0,H(null,"scanning");try{const t=await fetch(`${Z}/scans/email`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!t.ok)throw new Error(`Scan API error ${t.status}`);const i=await t.json();U.set(n,i),H(i,"done"),P(i),chrome.runtime.sendMessage({type:"GMAIL_EMAIL_SCANNED",result:i})}catch(t){console.warn("PhishLens Active Listening scan failed:",t);const i=document.getElementById("phishlens-inmail-banner");i&&(i.style.display="none")}finally{N=!1}}function ie(){if(!window.location.hostname.includes("mail.google.com"))return;let e=null;const n=()=>{e&&clearTimeout(e),e=setTimeout(()=>{te()},400)};window.addEventListener("hashchange",n),window.addEventListener("popstate",n),new MutationObserver(()=>{(document.querySelector("h2.hP")||document.querySelector('div[role="main"] h2')||document.querySelector("h2[data-thread-perm-id]"))&&n()}).observe(document.body,{childList:!0,subtree:!0}),n()}ie();function l(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}try{chrome.runtime.sendMessage({type:"CHECK_SHOULD_BLOCK"},e=>{chrome.runtime.lastError||e&&e.shouldBlock&&e.scanResult&&D(e.scanResult)})}catch{}try{chrome.runtime.sendMessage({type:"CHECK_AUTO_INSPECT"},e=>{chrome.runtime.lastError||e&&e.shouldInspect&&e.scanResult&&(e.scanResult.riskScore>70?D(e.scanResult):_(e.scanResult))})}catch{}chrome.runtime.onMessage.addListener((e,n,t)=>{if(e.type==="PHISHLENS_BLOCK_PAGE")D(e.result);else if(e.type==="PHISHLENS_SHOW_OVERLAY_LOADING")J(e.url,e.message);else if(e.type==="PHISHLENS_SHOW_OVERLAY_RESULT")_(e.result);else if(e.type==="PHISHLENS_SHOW_OVERLAY_ERROR")ee(e.error,e.url);else if(e.type==="TRIGGER_SCREEN_QR_CAPTURE")z();else if(e.type==="EXTRACT_GMAIL_DATA"){const i=q();return t(i),!0}else if(e.type==="SHOW_GMAIL_SCAN_OVERLAY")return B(e.report),t({success:!0}),!0})})();
