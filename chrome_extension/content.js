(()=>{function A(){const e=document.title||"",o=[];document.querySelectorAll("h1, h2").forEach(d=>{var x;const b=(x=d.textContent)==null?void 0:x.trim();b&&b.length<100&&o.push(b)});const s=[];document.querySelectorAll("img").forEach(d=>{var k,w,i;const b=(k=d.getAttribute("alt"))==null?void 0:k.trim(),x=((w=d.className)==null?void 0:w.toLowerCase())||"",C=((i=d.id)==null?void 0:i.toLowerCase())||"";b&&(x.includes("logo")||C.includes("logo")||b.toLowerCase().includes("logo"))&&s.push(b)});let n=!1,l=!1,a=!1,f=!1,m=!1,h=!1;document.querySelectorAll("input, select, textarea").forEach(d=>{const b=(d.getAttribute("type")||"").toLowerCase(),x=(d.getAttribute("name")||"").toLowerCase(),C=(d.getAttribute("id")||"").toLowerCase(),k=(d.getAttribute("placeholder")||"").toLowerCase(),w=(d.getAttribute("aria-label")||"").toLowerCase(),i=`${x} ${C} ${k} ${w}`;(b==="password"||i.includes("password")||i.includes("pwd"))&&(n=!0),(i.includes("otp")||i.includes("one time password")||i.includes("verification code")||i.includes("2fa"))&&(l=!0),(i.includes("cvv")||i.includes("cvc")||i.includes("security code"))&&(a=!0),(i.includes("card")||i.includes("pan number")||i.includes("debit"))&&(f=!0),(i.includes("kyc")||i.includes("aadhaar")||i.includes("pan card"))&&(m=!0),(i.includes("upi pin")||i.includes("mpin"))&&(h=!0)});const y=document.querySelector("link[rel*='icon']"),D=y?y.href:void 0;return{url:window.location.href,title:e,headings:o.slice(0,5),logoAltText:s.slice(0,3),hasPasswordField:n,hasOtpField:l,hasCvvField:a,hasCardField:f,hasKycField:m,hasUpiPinField:h,faviconUrl:D}}try{const e=A();chrome.runtime.sendMessage({type:"PAGE_METADATA_EXTRACTED",payload:e})}catch{}let t=null,u=null,c=null;function L(e=!1){return(!t||!document.contains(t))&&(t=document.createElement("div"),t.id="phishlens-inspector-host",t.style.position="fixed",t.style.zIndex="2147483647",u=t.attachShadow({mode:"open"}),document.body.appendChild(t)),e?(t.style.top="0",t.style.left="0",t.style.right="0",t.style.bottom="0",t.style.width="100vw",t.style.height="100vh",t.style.pointerEvents="auto"):(t.style.top="20px",t.style.right="20px",t.style.left="auto",t.style.bottom="auto",t.style.width="auto",t.style.height="auto",t.style.pointerEvents="none"),u}function g(){c&&(clearTimeout(c),c=null),t&&(t.remove(),t=null,u=null)}const p={shield:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',camera:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',alertTriangle:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',alertOctagon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',checkCircle:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',externalLink:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'};function v(){chrome.runtime.sendMessage({type:"OPEN_POPUP_FOR_QR"}),g()}const z=`
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
  `;function S(e){var s,n,l,a,f;const o=L(!1);o.innerHTML=`
      <style>${z}</style>
      <div class="hud-card">
        ${e}
      </div>
    `,(s=o.querySelector(".close-btn"))==null||s.addEventListener("click",g),(n=o.querySelector("#btn-dismiss"))==null||n.addEventListener("click",g),(l=o.querySelector("#btn-hud-capture-qr"))==null||l.addEventListener("click",v),(a=o.querySelector("#btn-hud-capture-top"))==null||a.addEventListener("click",v),(f=o.querySelector("#btn-retry-capture"))==null||f.addEventListener("click",v)}function O(e,o){if(!e)return;let s=0;const n=setInterval(async()=>{if(s++,s>10||!u){clearInterval(n);return}try{const l=await fetch(`http://localhost:5001/api/v1/preview/${e}`);if(!l.ok)return;const a=await l.json();if(a.status==="ready"&&a.imageUrl&&u){clearInterval(n);const f=u.getElementById(o);f&&(f.innerHTML=`
              <div style="margin: 12px 0; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; font-family: ui-monospace, monospace;">Safe Preview (Sandboxed)</span>
                  ${a.visualImpersonation?`<span style="font-size: 9px; font-weight: 700; color: #b91c1c; background: #fee2e2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px;">⚠️ ${a.visualImpersonation.similarity}% Match</span>`:""}
                </div>
                <div style="width: 100%; height: 130px; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1; background: #0f172a;">
                  <img src="http://localhost:5001${a.imageUrl}" style="width: 100%; height: 100%; object-fit: cover; object-position: top; display: block;" alt="Safe sandboxed preview" />
                </div>
                <div style="font-size: 9px; color: #64748b; margin-top: 4px; text-align: center;">Sandboxed preview - nothing was loaded on your device</div>
              </div>
            `)}else a.status==="failed"&&clearInterval(n)}catch{}},1e3)}function E(e){var n,l,a;c&&clearTimeout(c);const o=L(!0),s=Math.max(0,100-e.riskScore);o.innerHTML=`
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
          <div class="blocker-icon-box">${p.alertOctagon}</div>
          <span class="badge-threat">Dangerous Site Blocked</span>
          <h1 class="blocker-title">DO NOT PROCEED</h1>
          <p class="blocker-subtitle">
            PhishLens blocked this page to protect your credentials and data. The threat score is <strong>${e.riskScore}/100</strong> (Safety Score: ${s}%).
          </p>

          <div class="score-pill-container">
            <div class="score-pill score-pill-threat">
              Threat Score: <strong>${e.riskScore}/100</strong>
            </div>
            <div class="score-pill score-pill-safety">
              Safety Score: <strong>${s}/100 (Unsafe)</strong>
            </div>
          </div>

          <div class="url-box">
            <strong>Destination:</strong> ${r(e.finalUrl||e.url)}
          </div>

          <div class="reason-box">
            <div class="reason-heading">Security Evidence</div>
            <div class="reason-explanation">${r(e.explanation)}</div>

            ${(n=e.intentGuard)!=null&&n.claimedBrand?`
              <div style="font-size: 11px; color: #475569; margin-top: 4px;">
                Detected Impersonation: <strong>${r(e.intentGuard.claimedBrand)}</strong>
                (${e.intentGuard.isOfficialDomain?"Verified Domain":'<span style="color:#b91c1c;font-weight:bold;">Fake Unofficial Domain</span>'})
              </div>
            `:""}
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
    `,e.previewJobId&&O(e.previewJobId,"phishlens-preview-blocker-container"),(l=o.querySelector("#btn-safety-back"))==null||l.addEventListener("click",()=>{window.history.length>1?window.history.back():window.location.href="https://google.com"}),(a=o.querySelector("#btn-proceed-unsafe"))==null||a.addEventListener("click",()=>{chrome.runtime.sendMessage({type:"BYPASS_BLOCK_FOR_TAB"},()=>{g()})})}function R(e,o){c&&clearTimeout(c),S(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge">${p.shield}</div>
          <div>
            <div class="brand-title">PhishLens Inspector</div>
            <div class="brand-subtitle">Intent-Aware Security</div>
          </div>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>
      <div class="url-box">${r(e)}</div>
      <div style="text-align: center; padding: 20px 0;">
        <div class="spinner"></div>
        <div style="font-size: 12px; font-weight: 600; color: #0f172a; margin-bottom: 2px;">
          ${r(o||"Inspecting Destination...")}
        </div>
        <div style="font-size: 10px; color: #64748b;">Analyzing redirect hops, domain age, typosquatting & intent...</div>
      </div>
    `)}function I(e){const o=e.verdict||"SAFE",s=o==="DANGER",n=o==="CAUTION",l=s?"decision-danger":n?"decision-caution":"decision-safe",a=s?p.alertOctagon:n?p.alertTriangle:p.checkCircle,f=s?"DO NOT CLICK / MALICIOUS LINK":n?"PROCEED WITH CAUTION":"SAFE TO CLICK / PROCEED",m=s?"This link exhibits high impersonation or credential trap signals. Do not submit data.":n?"Unverified domain or suspicious structure detected. Confirm address before proceeding.":"No major phishing indicators detected on this destination.";let h="";e.intentGuard&&(h=`
        <div class="section-box">
          <div class="section-label">IntentGuard™ Identity</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #64748b;">Claimed Brand:</span>
            <strong style="color: #0f172a;">${r(e.intentGuard.claimedBrand||"None detected")}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Official Domain:</span>
            <strong style="color: ${e.intentGuard.isOfficialDomain?"#15803d":"#b91c1c"};">
              ${e.intentGuard.isOfficialDomain?"Verified":"Fake / Unofficial"}
            </strong>
          </div>
          ${e.intentGuard.lookalikeMatch?`
            <div style="margin-top: 4px; font-size: 10px; color: #b91c1c;">
              Mimics official address: <strong>${r(e.intentGuard.lookalikeMatch)}</strong>
            </div>
          `:""}
        </div>
      `);let $="";e.why&&e.why.length>0&&($=`
        <div class="section-box">
          <div class="section-label">Evidence (${e.why.length})</div>
          <ul style="list-style: none; padding: 0;">
            ${e.why.slice(0,3).map(y=>`
              <li style="color: #475569; font-size: 10px; margin-bottom: 3px; line-height: 1.35;">• ${r(y)}</li>
            `).join("")}
          </ul>
        </div>
      `),S(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge">${p.shield}</div>
          <div>
            <div class="brand-title">PhishLens Inspector</div>
            <div class="brand-subtitle">Intent-Aware Security</div>
          </div>
        </div>
        <div class="header-actions">
          <button id="btn-hud-capture-top" class="btn-capture-top" title="Scan Screen for QR">
            ${p.camera} Capture Screen QR
          </button>
          <button class="close-btn" title="Close">✕</button>
        </div>
      </div>

      <div class="decision-banner ${l}">
        <div style="margin-top: 1px;">${a}</div>
        <div>
          <div class="decision-title">${f}</div>
          <div class="decision-subtext">${m}</div>
        </div>
      </div>

      <div class="status-row">
        <span class="badge ${o==="DANGER"?"badge-danger":o==="CAUTION"?"badge-caution":"badge-safe"}">
          ${o}
        </span>
        <div class="score-text">
          ${e.riskScore} <span class="score-denom">/ 100</span>
        </div>
      </div>

      <div class="url-box" title="${r(e.finalUrl||e.url)}">
        ${e.isShortened?'<div style="color: #b45309; font-weight: 700; margin-bottom: 2px;">Shortened URL Unmasked</div>':""}
        ${e.finalUrl&&e.finalUrl!==e.url?`
          <div style="font-size: 9px; color: #64748b; margin-bottom: 2px;">Initial: ${r(e.url)}</div>
          <div style="font-weight: 700; color: #0f172a;">Destination: ${r(e.finalUrl)}</div>
        `:`
          <div>${r(e.url)}</div>
        `}
      </div>

      <div class="explanation">${r(e.explanation)}</div>

      ${h}
      ${$}

      <div id="phishlens-preview-hud-container"></div>

      <div class="footer-actions">
        ${e.finalUrl&&e.finalUrl!==window.location.href?`
          <a href="${r(e.finalUrl)}" target="_blank" class="btn btn-primary">
            Open Destination ${p.externalLink}
          </a>
        `:`
          <a href="http://localhost:3000" target="_blank" class="btn btn-primary">
            Open Full PWA ${p.externalLink}
          </a>
        `}
        <button id="btn-dismiss" class="btn btn-secondary">
          Dismiss
        </button>
      </div>
    `),e.previewJobId&&O(e.previewJobId,"phishlens-preview-hud-container"),c&&clearTimeout(c),c=setTimeout(g,3e4)}function T(e,o){S(`
      <div class="header">
        <div class="brand-wrap">
          <div class="logo-badge" style="background: #b91c1c;">${p.alertTriangle}</div>
          <div>
            <div class="brand-title">PhishLens Inspector</div>
            <div class="brand-subtitle">Scan Incomplete</div>
          </div>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>
      <div class="url-box">${r(o)}</div>
      <div style="color: #b91c1c; font-size: 11px; padding: 8px 0; line-height: 1.4;">${r(e)}</div>
      <div class="footer-actions">
        <button id="btn-dismiss" class="btn btn-secondary">Dismiss</button>
      </div>
    `)}function r(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}try{chrome.runtime.sendMessage({type:"CHECK_SHOULD_BLOCK"},e=>{chrome.runtime.lastError||e&&e.shouldBlock&&e.scanResult&&E(e.scanResult)})}catch{}try{chrome.runtime.sendMessage({type:"CHECK_AUTO_INSPECT"},e=>{chrome.runtime.lastError||e&&e.shouldInspect&&e.scanResult&&(e.scanResult.riskScore>70?E(e.scanResult):I(e.scanResult))})}catch{}chrome.runtime.onMessage.addListener(e=>{e.type==="PHISHLENS_BLOCK_PAGE"?E(e.result):e.type==="PHISHLENS_SHOW_OVERLAY_LOADING"?R(e.url,e.message):e.type==="PHISHLENS_SHOW_OVERLAY_RESULT"?I(e.result):e.type==="PHISHLENS_SHOW_OVERLAY_ERROR"?T(e.error,e.url):e.type==="TRIGGER_SCREEN_QR_CAPTURE"&&v()})})();
