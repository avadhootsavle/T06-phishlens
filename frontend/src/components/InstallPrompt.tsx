import React, { useState, useEffect } from 'react';
import { Download, Share, X, ShieldCheck, AlertCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInsecureOrigin, setIsInsecureOrigin] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / standalone
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    // 2. Check if iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(isAppleDevice);

    // 3. Check secure context
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setIsInsecureOrigin(true);
    }

    // 4. Listen for Chrome/Edge/Android beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 5. Listen for appinstalled
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
    } catch {
      // User dismissed or browser blocked
    }
  };

  // If already installed or dismissed, do not render
  if (isStandalone || dismissed) {
    return null;
  }

  // Case 1: Insecure Origin Warning (opening http://192.168.x.x without HTTPS)
  if (isInsecureOrigin) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>HTTP Notice:</strong> Mobile browsers only permit PWA installation over secure <strong>HTTPS</strong>.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-700 hover:text-amber-900 p-1"
          aria-label="Close notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Case 2: Native prompt available (Android Chrome, Chromium browsers, Desktop)
  if (deferredPrompt) {
    return (
      <aside
        aria-label="PWA installation prompt"
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900 leading-tight">Install PhishLens</div>
            <div className="text-[11px] text-slate-500 leading-tight">Add to home screen for instant camera & link verification</div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Dismiss install banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // Case 3: iOS Safari (Share -> Add to Home Screen)
  if (isIos) {
    return (
      <aside aria-label="iOS PWA installation guide">
        {!showIosGuide ? (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs text-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Install PhishLens on iPhone</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowIosGuide(true)}
                className="text-xs font-medium text-slate-900 underline underline-offset-2"
              >
                Instructions
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Close guide"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border-b border-slate-200 px-4 py-3 text-xs text-slate-800 flex items-start justify-between">
            <div className="space-y-1">
              <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                <Share className="w-3.5 h-3.5 text-blue-600" />
                <span>How to Install on iPhone:</span>
              </div>
              <ol className="list-decimal list-inside text-slate-600 space-y-0.5 pl-1">
                <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong> in the top-right corner.</li>
              </ol>
            </div>
            <button
              onClick={() => {
                setShowIosGuide(false);
                setDismissed(true);
              }}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Dismiss guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>
    );
  }

  return null;
};
