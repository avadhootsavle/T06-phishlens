const API_BASE = 'http://localhost:5001/api/v1';

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
  geminiAdvisor?: {
    apparentBrand?: string | null;
    legitimateOfficialDomain?: string | null;
    impersonationConfidence?: number;
    socialEngineeringTactics?: string[];
    summaryExplanation?: string;
    actionableAdvice?: string;
    threatLevel?: string;
  };
}

// 1. Listen for top-level navigation commitments
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return; // Top-level frame only

  const url = details.url;
  if (!url || !url.startsWith('http')) return;

  try {
    const response = await fetch(`${API_BASE}/scans/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) return;

    const data: TabScanState = await response.json();

    // Store latest scan for this tab
    await chrome.storage.local.set({ [`tab_${details.tabId}`]: data });

    // Update Action Badge
    updateBadge(details.tabId, data.verdict);
  } catch (err) {
    console.error('PhishLens background scan error:', err);
  }
});

// 2. Listen for safe page metadata from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_METADATA_EXTRACTED' && sender.tab?.id) {
    const tabId = sender.tab.id;

    (async () => {
      const stored = await chrome.storage.local.get(`tab_${tabId}`);
      const scanData: TabScanState | undefined = stored[`tab_${tabId}`];

      if (!scanData || !scanData.scanId) return;

      try {
        const enrichResponse = await fetch(
          `${API_BASE}/scans/${scanData.scanId}/page-metadata`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message.payload),
          }
        );

        if (enrichResponse.ok) {
          const updatedData: TabScanState = await enrichResponse.json();
          await chrome.storage.local.set({ [`tab_${tabId}`]: updatedData });
          updateBadge(tabId, updatedData.verdict);
          sendResponse({ success: true, verdict: updatedData.verdict });
        }
      } catch (e) {
        console.error('Metadata enrichment failed:', e);
      }
    })();

    return true; // Keep message port open for async response
  }
});

function updateBadge(tabId: number, verdict: 'SAFE' | 'CAUTION' | 'DANGER') {
  const badgeColors = {
    SAFE: '#10b981',
    CAUTION: '#f59e0b',
    DANGER: '#ef4444',
  };

  const badgeLabels = {
    SAFE: 'SAFE',
    CAUTION: 'CAUT',
    DANGER: 'DANG',
  };

  chrome.action.setBadgeText({ tabId, text: badgeLabels[verdict] || '' });
  chrome.action.setBadgeBackgroundColor({
    tabId,
    color: badgeColors[verdict] || '#64748b',
  });
}
