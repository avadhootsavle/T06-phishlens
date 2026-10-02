(()=>{function $(){const e=document.title||"",o=[];document.querySelectorAll("h1, h2").forEach(a=>{var c;const s=(c=a.textContent)==null?void 0:c.trim();s&&s.length<100&&o.push(s)});const l=[];document.querySelectorAll("img").forEach(a=>{var u,m,i;const s=(u=a.getAttribute("alt"))==null?void 0:u.trim(),c=((m=a.className)==null?void 0:m.toLowerCase())||"",y=((i=a.id)==null?void 0:i.toLowerCase())||"";s&&(c.includes("logo")||y.includes("logo")||s.toLowerCase().includes("logo"))&&l.push(s)});let d=!1,p=!1,b=!1,f=!1,g=!1,A=!1;document.querySelectorAll("input, select, textarea").forEach(a=>{const s=(a.getAttribute("type")||"").toLowerCase(),c=(a.getAttribute("name")||"").toLowerCase(),y=(a.getAttribute("id")||"").toLowerCase(),u=(a.getAttribute("placeholder")||"").toLowerCase(),m=(a.getAttribute("aria-label")||"").toLowerCase(),i=`${c} ${y} ${u} ${m}`;(s==="password"||i.includes("password")||i.includes("pwd"))&&(d=!0),(i.includes("otp")||i.includes("one time password")||i.includes("verification code")||i.includes("2fa"))&&(p=!0),(i.includes("cvv")||i.includes("cvc")||i.includes("security code"))&&(b=!0),(i.includes("card")||i.includes("pan number")||i.includes("debit"))&&(f=!0),(i.includes("kyc")||i.includes("aadhaar")||i.includes("pan card"))&&(g=!0),(i.includes("upi pin")||i.includes("mpin"))&&(A=!0)});const E=document.querySelector("link[rel*='icon']"),z=E?E.href:void 0;return{url:window.location.href,title:e,headings:o.slice(0,5),logoAltText:l.slice(0,3),hasPasswordField:d,hasOtpField:p,hasCvvField:b,hasCardField:f,hasKycField:g,hasUpiPinField:A,faviconUrl:z}}try{const e=$();chrome.runtime.sendMessage({type:"PAGE_METADATA_EXTRACTED",payload:e})}catch{}let n=null,x=null,r=null;function k(){return(!n||!document.contains(n))&&(n=document.createElement("div"),n.id="phishlens-inspector-host",n.style.position="fixed",n.style.top="20px",n.style.right="20px",n.style.zIndex="2147483647",n.style.pointerEvents="none",x=n.attachShadow({mode:"open"}),document.body.appendChild(n)),x}function v(){r&&(clearTimeout(r),r=null),n&&(n.remove(),n=null,x=null)}function h(e){var l,d;const o=k();o.innerHTML=`
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
    `,(l=o.querySelector(".close-btn"))==null||l.addEventListener("click",v),(d=o.querySelector("#btn-dismiss"))==null||d.addEventListener("click",v)}function L(e,o){r&&clearTimeout(r),h(`
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
      <div class="url-box">${t(e)}</div>
      <div style="text-align: center; padding: 18px 0;">
        <div class="spinner"></div>
        <div style="font-size: 12px; font-weight: 600; color: #fff; margin-bottom: 4px;">
          ${t(o||"Inspecting Destination...")}
        </div>
        <div style="font-size: 10px; color: #94a3b8;">Analyzing redirect hops, domain age, typosquatting & Gemini AI...</div>
      </div>
    `)}function w(e){const o=e.verdict||"SAFE",l=o==="DANGER"?"badge-danger":o==="CAUTION"?"badge-caution":"badge-safe",d=o==="DANGER"?"#ef4444":o==="CAUTION"?"#f59e0b":"#10b981";let p="";e.intentGuard&&(p=`
        <div class="section-box">
          <div class="section-label">IntentGuard™ Identity</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8;">Claimed Brand:</span>
            <strong style="color: #fff;">${t(e.intentGuard.claimedBrand||"None detected")}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #94a3b8;">Official Domain:</span>
            <strong style="color: ${e.intentGuard.isOfficialDomain?"#34d399":"#f87171"};">
              ${e.intentGuard.isOfficialDomain?"YES (Verified)":"NO (Unverified)"}
            </strong>
          </div>
          ${e.intentGuard.lookalikeMatch?`
            <div style="margin-top: 4px; font-size: 10px; color: #f87171;">
              ⚠️ Mimics legitimate official address: <strong>${t(e.intentGuard.lookalikeMatch)}</strong>
            </div>
          `:""}
        </div>
      `);let b="";e.geminiAdvisor&&(b=`
        <div class="gemini-box">
          <div class="gemini-label">
            <span>✨ GEMINI 3.8 FLASH AI</span>
            <span>${t(e.geminiAdvisor.threatLevel||"ANALYZED")}</span>
          </div>
          <div style="line-height: 1.35; margin-bottom: 4px;">${t(e.geminiAdvisor.summaryExplanation||"")}</div>
          ${e.geminiAdvisor.socialEngineeringTactics&&e.geminiAdvisor.socialEngineeringTactics.length>0?`
            <div style="font-size: 10px; color: #d8b4fe;">
              Tactics: <strong>${t(e.geminiAdvisor.socialEngineeringTactics.join(", "))}</strong>
            </div>
          `:""}
        </div>
      `);let f="";e.why&&e.why.length>0&&(f=`
        <div class="section-box">
          <div class="section-label">Evidence (${e.why.length})</div>
          <ul style="list-style: none; padding: 0;">
            ${e.why.slice(0,3).map(g=>`
              <li style="color: #cbd5e1; font-size: 11px; margin-bottom: 4px; line-height: 1.3;">• ${t(g)}</li>
            `).join("")}
          </ul>
        </div>
      `),h(`
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

      <div class="url-box" title="${t(e.finalUrl||e.url)}">
        ${e.isShortened?'<div style="color: #fbbf24; font-weight: bold; margin-bottom: 2px;">⚡ Shortened URL Unmasked</div>':""}
        ${e.finalUrl&&e.finalUrl!==e.url?`
          <div style="font-size: 9px; color: #94a3b8; margin-bottom: 3px;">Initial link: ${t(e.url)}</div>
          <div style="font-size: 11px; font-weight: bold; color: #38bdf8;">Final Destination: ${t(e.finalUrl)}</div>
        `:`
          <div>${t(e.url)}</div>
        `}
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding: 10px 12px; background: rgba(15, 23, 42, 0.6); border-radius: 12px; border: 1px solid ${d}40;">
        <span class="badge ${l}">${o}</span>
        <div class="score">
          ${e.riskScore} <span class="score-denom">/ 100</span>
        </div>
      </div>

      <div class="explanation">${t(e.explanation)}</div>

      ${p}
      ${b}
      ${f}

      <div class="footer-actions">
        ${e.finalUrl&&e.finalUrl!==window.location.href?`
          <a href="${t(e.finalUrl)}" target="_blank" class="btn btn-primary" style="background: linear-gradient(135deg, #059669, #0284c7); text-decoration: none;">
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
    `),r&&clearTimeout(r),r=setTimeout(v,3e4)}function S(e,o){h(`
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
      <div class="url-box">${t(o)}</div>
      <div style="color: #f87171; font-size: 11px; padding: 10px 0;">${t(e)}</div>
      <div class="footer-actions">
        <button id="btn-dismiss" class="btn btn-secondary">Dismiss</button>
      </div>
    `)}function t(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}try{chrome.runtime.sendMessage({type:"CHECK_AUTO_INSPECT"},e=>{chrome.runtime.lastError||e&&e.shouldInspect&&e.scanResult&&w(e.scanResult)})}catch{}chrome.runtime.onMessage.addListener(e=>{e.type==="PHISHLENS_SHOW_OVERLAY_LOADING"?L(e.url,e.message):e.type==="PHISHLENS_SHOW_OVERLAY_RESULT"?w(e.result):e.type==="PHISHLENS_SHOW_OVERLAY_ERROR"&&S(e.error,e.url)})})();
