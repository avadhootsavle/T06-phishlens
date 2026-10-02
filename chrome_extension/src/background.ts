const API_BASE = 'http://localhost:5001/api/v1';

interface TabScanState {
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
    impersonationConfidence?: number;
    socialEngineeringTactics?: string[];
    summaryExplanation?: string;
    actionableAdvice?: string;
    threatLevel?: string;
  };
}

// 1. Setup Right-Click Context Menu for Links and Text Selections
function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'phishlens_go_to_final_url',
      title: '🚀 Go to Final URL & Scan with PhishLens',
      contexts: ['link', 'selection'],
    });
    chrome.contextMenus.create({
      id: 'phishlens_preview_link',
      title: '🛡️ Preview Link Safety in HUD',
      contexts: ['link', 'selection'],
    });
  });
}

chrome.runtime.onInstalled.addListener(setupContextMenu);
chrome.runtime.onStartup.addListener(setupContextMenu);

// 2. Handle Right-Click Context Menu Click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const isGoToFinal = info.menuItemId === 'phishlens_go_to_final_url' || info.menuItemId === 'phishlens_scan_link';
  const isPreview = info.menuItemId === 'phishlens_preview_link';

  if ((isGoToFinal || isPreview) && tab?.id) {
    const targetUrl = info.linkUrl || info.selectionText;
    if (!targetUrl) return;

    // Send instant loading HUD state to content script overlay
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'PHISHLENS_SHOW_OVERLAY_LOADING',
        url: targetUrl,
        message: isGoToFinal ? 'Unmasking redirects & opening final destination...' : 'Inspecting destination...',
      });
    } catch {
      // Content script may not be injected yet in pre-existing tabs
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
        await chrome.tabs.sendMessage(tab.id, {
          type: 'PHISHLENS_SHOW_OVERLAY_LOADING',
          url: targetUrl,
          message: isGoToFinal ? 'Unmasking redirects & opening final destination...' : 'Inspecting destination...',
        });
      } catch (err) {
        console.error('Failed to communicate with content script:', err);
      }
    }

    try {
      // Query backend: follows redirects up to 5 hops, SSRF protection, unmasks shorteners
      const response = await fetch(`${API_BASE}/scans/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from backend scanner`);
      }

      const scanResult: TabScanState = await response.json();
      const destinationUrl = scanResult.finalUrl || scanResult.url || targetUrl;

      if (isGoToFinal) {
        // Open the final unmasked URL in a new tab
        const newTab = await chrome.tabs.create({
          url: destinationUrl,
          active: true,
        });

        if (newTab.id) {
          // Pre-store scan result and set auto_inspect flag so HUD/Blocker opens on the final destination page
          await chrome.storage.local.set({
            [`tab_${newTab.id}`]: scanResult,
            [`auto_inspect_${newTab.id}`]: scanResult,
          });
          updateBadge(newTab.id, scanResult.verdict);
        }
      } else {
        // Stay on page and display floating HUD preview
        await chrome.tabs.sendMessage(tab.id, {
          type: 'PHISHLENS_SHOW_OVERLAY_RESULT',
          result: scanResult,
        });
      }
    } catch (err) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'PHISHLENS_SHOW_OVERLAY_ERROR',
        error: (err as Error).message || 'Failed to scan target link',
        url: targetUrl,
      });
    }
  }
});

// 3. Listen for top-level navigation commitments
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

    // Check if site should be blocked (Risk Score > 70)
    const stored = await chrome.storage.local.get(['autoBlockDangerous', `bypass_block_${details.tabId}`]);
    const isAutoBlockEnabled = stored.autoBlockDangerous !== false;
    const isBypassed = !!stored[`bypass_block_${details.tabId}`];

    if (isAutoBlockEnabled && !isBypassed && data.riskScore > 70) {
      try {
        await chrome.tabs.sendMessage(details.tabId, {
          type: 'PHISHLENS_BLOCK_PAGE',
          result: data,
        });
      } catch {
        // Tab content script will check CHECK_SHOULD_BLOCK when loaded
      }
    }
  } catch (err) {
    console.error('PhishLens background scan error:', err);
  }
});

// 4. Listen for runtime messages (Metadata enrichment, Block checks & Bypasses)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_SHOULD_BLOCK' && sender.tab?.id) {
    const tabId = sender.tab.id;
    chrome.storage.local.get([`tab_${tabId}`, 'autoBlockDangerous', `bypass_block_${tabId}`]).then((stored) => {
      const scanData: TabScanState | undefined = stored[`tab_${tabId}`];
      const isAutoBlockEnabled = stored.autoBlockDangerous !== false;
      const isBypassed = !!stored[`bypass_block_${tabId}`];

      if (isAutoBlockEnabled && !isBypassed && scanData && scanData.riskScore > 70) {
        sendResponse({ shouldBlock: true, scanResult: scanData });
      } else {
        sendResponse({ shouldBlock: false });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'BYPASS_BLOCK_FOR_TAB' && sender.tab?.id) {
    const tabId = sender.tab.id;
    chrome.storage.local.set({ [`bypass_block_${tabId}`]: true }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'CHECK_AUTO_INSPECT' && sender.tab?.id) {
    const tabId = sender.tab.id;
    chrome.storage.local.get([`auto_inspect_${tabId}`, `tab_${tabId}`]).then((stored) => {
      const pendingInspect = stored[`auto_inspect_${tabId}`] || stored[`tab_${tabId}`];
      if (pendingInspect) {
        // Clean up one-time auto_inspect trigger
        chrome.storage.local.remove(`auto_inspect_${tabId}`);
        sendResponse({ shouldInspect: true, scanResult: pendingInspect });
      } else {
        sendResponse({ shouldInspect: false });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'PAGE_METADATA_EXTRACTED' && sender.tab?.id) {
    const tabId = sender.tab.id;

    (async () => {
      const stored = await chrome.storage.local.get([`tab_${tabId}`, 'autoBlockDangerous', `bypass_block_${tabId}`]);
      const scanData: TabScanState | undefined = stored[`tab_${tabId}`];
      const isAutoBlockEnabled = stored.autoBlockDangerous !== false;
      const isBypassed = !!stored[`bypass_block_${tabId}`];

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

          // If risk score exceeds 70 after detecting credential forms, trigger blocker overlay
          if (isAutoBlockEnabled && !isBypassed && updatedData.riskScore > 70) {
            try {
              await chrome.tabs.sendMessage(tabId, {
                type: 'PHISHLENS_BLOCK_PAGE',
                result: updatedData,
              });
            } catch {
              // ignore
            }
          } else {
            // Update HUD overlay with live DOM analysis
            try {
              await chrome.tabs.sendMessage(tabId, {
                type: 'PHISHLENS_SHOW_OVERLAY_RESULT',
                result: updatedData,
              });
            } catch {
              // Tab may not have listener attached yet
            }
          }

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
