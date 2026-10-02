(()=>{function $(){const e=document.title||"",t=[];document.querySelectorAll("h1, h2").forEach(a=>{var f;const d=(f=a.textContent)==null?void 0:f.trim();d&&d.length<100&&t.push(d)});const s=[];document.querySelectorAll("img").forEach(a=>{var m,u,n;const d=(m=a.getAttribute("alt"))==null?void 0:m.trim(),f=((u=a.className)==null?void 0:u.toLowerCase())||"",w=((n=a.id)==null?void 0:n.toLowerCase())||"";d&&(f.includes("logo")||w.includes("logo")||d.toLowerCase().includes("logo"))&&s.push(d)});let l=!1,c=!1,p=!1,b=!1,x=!1,E=!1;document.querySelectorAll("input, select, textarea").forEach(a=>{const d=(a.getAttribute("type")||"").toLowerCase(),f=(a.getAttribute("name")||"").toLowerCase(),w=(a.getAttribute("id")||"").toLowerCase(),m=(a.getAttribute("placeholder")||"").toLowerCase(),u=(a.getAttribute("aria-label")||"").toLowerCase(),n=`${f} ${w} ${m} ${u}`;(d==="password"||n.includes("password")||n.includes("pwd"))&&(l=!0),(n.includes("otp")||n.includes("one time password")||n.includes("verification code")||n.includes("2fa"))&&(c=!0),(n.includes("cvv")||n.includes("cvc")||n.includes("security code"))&&(p=!0),(n.includes("card")||n.includes("pan number")||n.includes("debit"))&&(b=!0),(n.includes("kyc")||n.includes("aadhaar")||n.includes("pan card"))&&(x=!0),(n.includes("upi pin")||n.includes("mpin"))&&(E=!0)});const S=document.querySelector("link[rel*='icon']"),O=S?S.href:void 0;return{url:window.location.href,title:e,headings:t.slice(0,5),logoAltText:s.slice(0,3),hasPasswordField:l,hasOtpField:c,hasCvvField:p,hasCardField:b,hasKycField:x,hasUpiPinField:E,faviconUrl:O}}try{const e=$();chrome.runtime.sendMessage({type:"PAGE_METADATA_EXTRACTED",payload:e})}catch{}let o=null,h=null,r=null;function k(e=!1){return(!o||!document.contains(o))&&(o=document.createElement("div"),o.id="phishlens-inspector-host",o.style.position="fixed",o.style.zIndex="2147483647",h=o.attachShadow({mode:"open"}),document.body.appendChild(o)),e?(o.style.top="0",o.style.left="0",o.style.right="0",o.style.bottom="0",o.style.width="100vw",o.style.height="100vh",o.style.pointerEvents="auto"):(o.style.top="20px",o.style.right="20px",o.style.left="auto",o.style.bottom="auto",o.style.width="auto",o.style.height="auto",o.style.pointerEvents="none"),h}function g(){r&&(clearTimeout(r),r=null),o&&(o.remove(),o=null,h=null)}function v(e){var l,c,p,b;r&&clearTimeout(r);const t=k(!0),s=Math.max(0,100-e.riskScore);t.innerHTML=`
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
            PhishLens blocked this page because it has a safety score of only <span class="highlight-red">${s}%</span> (Risk Score: <span class="highlight-red">${e.riskScore}/100</span> &gt; 70 threshold).
          </p>

          <div class="score-pill-container">
            <div class="score-pill score-pill-threat">
              Threat Score: <strong>${e.riskScore}/100</strong>
            </div>
            <div class="score-pill score-pill-safety">
              Safety Score: <strong>${s}/100 (Very Low)</strong>
            </div>
          </div>

          <div class="url-box">
            <strong>Blocked Destination:</strong> ${i(e.finalUrl||e.url)}
          </div>

          <div class="reason-box">
            <div class="reason-heading">Threat Evidence & Analysis</div>
            <div class="reason-explanation">${i(e.explanation)}</div>

            ${(l=e.intentGuard)!=null&&l.claimedBrand?`
              <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">
                • Detected Impersonation: <strong>${i(e.intentGuard.claimedBrand)}</strong>
                (Official Domain: ${e.intentGuard.isOfficialDomain?"YES":'<span style="color:#f87171;font-weight:bold;">NO - FAKE SITE</span>'})
              </div>
            `:""}

            ${(c=e.geminiAdvisor)!=null&&c.summaryExplanation?`
              <div class="gemini-quote">
                <strong>✨ Gemini 3.8 Flash AI:</strong> ${i(e.geminiAdvisor.summaryExplanation)}
              </div>
            `:""}
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
    `,(p=t.querySelector("#btn-safety-back"))==null||p.addEventListener("click",()=>{window.history.length>1?window.history.back():window.location.href="https://google.com"}),(b=t.querySelector("#btn-proceed-unsafe"))==null||b.addEventListener("click",()=>{chrome.runtime.sendMessage({type:"BYPASS_BLOCK_FOR_TAB"},()=>{g()})})}function y(e){var s,l;const t=k(!1);t.innerHTML=`
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
        ${e}
      </div>
    `,(s=t.querySelector(".close-btn"))==null||s.addEventListener("click",g),(l=t.querySelector("#btn-dismiss"))==null||l.addEventListener("click",g)}function L(e,t){r&&clearTimeout(r),y(`
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
      <div class="url-box">${i(e)}</div>
      <div style="text-align: center; padding: 18px 0;">
        <div class="spinner"></div>
        <div style="font-size: 12px; font-weight: 600; color: #fff; margin-bottom: 4px;">
          ${i(t||"Inspecting Destination...")}
        </div>
        <div style="font-size: 10px; color: #94a3b8;">Analyzing redirect hops, domain age, typosquatting & Gemini AI...</div>
      </div>
    `)}function A(e){const t=e.verdict||"SAFE",s=t==="DANGER"?"badge-danger":t==="CAUTION"?"badge-caution":"badge-safe",l=t==="DANGER"?"#ef4444":t==="CAUTION"?"#f59e0b":"#10b981";let c="";e.intentGuard&&(c=`
        <div class="section-box">
          <div class="section-label">IntentGuard™ Identity</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8;">Claimed Brand:</span>
            <strong style="color: #fff;">${i(e.intentGuard.claimedBrand||"None detected")}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #94a3b8;">Official Domain:</span>
            <strong style="color: ${e.intentGuard.isOfficialDomain?"#34d399":"#f87171"};">
              ${e.intentGuard.isOfficialDomain?"YES (Verified)":"NO (Unverified)"}
            </strong>
          </div>
          ${e.intentGuard.lookalikeMatch?`
            <div style="margin-top: 4px; font-size: 10px; color: #f87171;">
              ⚠️ Mimics legitimate official address: <strong>${i(e.intentGuard.lookalikeMatch)}</strong>
            </div>
          `:""}
        </div>
      `);let p="";e.geminiAdvisor&&(p=`
        <div class="gemini-box">
          <div class="gemini-label">
            <span>✨ GEMINI 3.8 FLASH AI</span>
            <span>${i(e.geminiAdvisor.threatLevel||"ANALYZED")}</span>
          </div>
          <div style="line-height: 1.35; margin-bottom: 4px;">${i(e.geminiAdvisor.summaryExplanation||"")}</div>
          ${e.geminiAdvisor.socialEngineeringTactics&&e.geminiAdvisor.socialEngineeringTactics.length>0?`
            <div style="font-size: 10px; color: #d8b4fe;">
              Tactics: <strong>${i(e.geminiAdvisor.socialEngineeringTactics.join(", "))}</strong>
            </div>
          `:""}
        </div>
      `);let b="";e.why&&e.why.length>0&&(b=`
        <div class="section-box">
          <div class="section-label">Evidence (${e.why.length})</div>
          <ul style="list-style: none; padding: 0;">
            ${e.why.slice(0,3).map(x=>`
              <li style="color: #cbd5e1; font-size: 11px; margin-bottom: 4px; line-height: 1.3;">• ${i(x)}</li>
            `).join("")}
          </ul>
        </div>
      `),y(`
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

      <div class="url-box" title="${i(e.finalUrl||e.url)}">
        ${e.isShortened?'<div style="color: #fbbf24; font-weight: bold; margin-bottom: 2px;">⚡ Shortened URL Unmasked</div>':""}
        ${e.finalUrl&&e.finalUrl!==e.url?`
          <div style="font-size: 9px; color: #94a3b8; margin-bottom: 3px;">Initial link: ${i(e.url)}</div>
          <div style="font-size: 11px; font-weight: bold; color: #38bdf8;">Final Destination: ${i(e.finalUrl)}</div>
        `:`
          <div>${i(e.url)}</div>
        `}
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding: 10px 12px; background: rgba(15, 23, 42, 0.6); border-radius: 12px; border: 1px solid ${l}40;">
        <span class="badge ${s}">${t}</span>
        <div class="score">
          ${e.riskScore} <span class="score-denom">/ 100</span>
        </div>
      </div>

      <div class="explanation">${i(e.explanation)}</div>

      ${c}
      ${p}
      ${b}

      <div class="footer-actions">
        ${e.finalUrl&&e.finalUrl!==window.location.href?`
          <a href="${i(e.finalUrl)}" target="_blank" class="btn btn-primary" style="background: linear-gradient(135deg, #059669, #0284c7); text-decoration: none;">
            🚀 Go to Final URL
          </a>
        `:`
          <a href="http://localhost:3000" target="_blank" class="btn btn-primary">
            Open Full PWA
          </a>
        `}
        <button id="btn-dismiss" class="btn btn-secondary">
          Dismiss
        </button>
      </div>
    `),r&&clearTimeout(r),r=setTimeout(g,3e4)}function z(e,t){y(`
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
      <div class="url-box">${i(t)}</div>
      <div style="color: #f87171; font-size: 11px; padding: 10px 0;">${i(e)}</div>
      <div class="footer-actions">
        <button id="btn-dismiss" class="btn btn-secondary">Dismiss</button>
      </div>
    `)}function i(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}try{chrome.runtime.sendMessage({type:"CHECK_SHOULD_BLOCK"},e=>{chrome.runtime.lastError||e&&e.shouldBlock&&e.scanResult&&v(e.scanResult)})}catch{}try{chrome.runtime.sendMessage({type:"CHECK_AUTO_INSPECT"},e=>{chrome.runtime.lastError||e&&e.shouldInspect&&e.scanResult&&(e.scanResult.riskScore>70?v(e.scanResult):A(e.scanResult))})}catch{}chrome.runtime.onMessage.addListener(e=>{e.type==="PHISHLENS_BLOCK_PAGE"?v(e.result):e.type==="PHISHLENS_SHOW_OVERLAY_LOADING"?L(e.url,e.message):e.type==="PHISHLENS_SHOW_OVERLAY_RESULT"?A(e.result):e.type==="PHISHLENS_SHOW_OVERLAY_ERROR"&&z(e.error,e.url)})})();
