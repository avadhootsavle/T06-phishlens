// PhishLens Content Script — Safe DOM Metadata & Credential Trap Extractor
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

  // Run extraction after DOM is loaded
  const metadata = extractSafeMetadata();

  // Send safely to background service worker
  try {
    chrome.runtime.sendMessage({
      type: 'PAGE_METADATA_EXTRACTED',
      payload: metadata,
    });
  } catch {
    // Context may be invalidated if extension reloaded
  }
})();
