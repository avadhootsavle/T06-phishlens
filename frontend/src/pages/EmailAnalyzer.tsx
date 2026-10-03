import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Calendar,
  Upload,
  Shield,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Flag,
  Sparkles,
  Link as LinkIcon,
  FileCode,
} from 'lucide-react';
import { scanEmail } from '../services/api';
import { EmailScanReport } from '../types';

export const EmailAnalyzer: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [senderName, setSenderName] = useState<string>('');
  const [senderEmail, setSenderEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [bodySnippet, setBodySnippet] = useState<string>('');
  const [directLink, setDirectLink] = useState<string>('');
  const [icsFileLoaded, setIcsFileLoaded] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EmailScanReport | null>(null);

  const presets = [
    {
      label: 'Malicious Calendar Invite (.ics)',
      desc: 'Spoofed Bank Organizer with KYC credential lure and UNC exploit indicator',
      severity: 'danger',
      data: {
        subject: 'URGENT: NetBanking Account Suspended - Verify KYC Now',
        senderName: 'State Bank of India Security Alerts',
        senderEmail: 'alerts@sbi-bank-verify.net',
        directLink: 'https://sbi-online-banking-portal.net/login',
        bodySnippet: `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PhishLens Security Research//Calendar Phishing Threat Test//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:phishlens-test-20261003@security.test
ORGANIZER;CN="State Bank of India Security Alerts":mailto:alerts@sbi-bank-verify.net
SUMMARY:URGENT: NetBanking Account Suspended - Verify KYC Now
DESCRIPTION:Your State Bank of India account access has been locked. Verify KYC immediately: https://sbi-online-banking-portal.net/login
LOCATION:\\\\malicious-smb-host.attacker.com\\leak
URL:https://sbi-online-banking-portal.net/login
ATTACH:https://malicious-server.example/security-patch.exe
END:VEVENT
END:VCALENDAR`,
        isIcs: true,
      },
    },
    {
      label: 'Fake SBI Account Suspension',
      desc: 'Impersonates State Bank of India from @gmail.com with phishing trap',
      severity: 'danger',
      data: {
        subject: 'URGENT: Your SBI Account is Suspended',
        senderName: 'State Bank of India Alert',
        senderEmail: 'support@gmail.com',
        directLink: 'https://sbi-online-banking-portal.net/login',
        bodySnippet:
          'Dear customer, immediate action required. Your account has been suspended due to pending KYC verification. Click here within 24 hours to restore access.',
        isIcs: false,
      },
    },
    {
      label: 'HDFC Lookalike Domain Phishing',
      desc: 'Lookalike domain hdfc-security-auth.top requesting netbanking credentials',
      severity: 'caution',
      data: {
        subject: 'Urgent: Verify HDFC NetBanking Access',
        senderName: 'HDFC Security',
        senderEmail: 'alerts@hdfc-netverify-online.com',
        directLink: 'https://hdfc-security-auth.top/verify',
        bodySnippet:
          'Security notice: Unauthorized login attempted from unfamiliar IP address. Verify your netbanking credentials immediately.',
        isIcs: false,
      },
    },
    {
      label: 'Official Google Notice',
      desc: 'Legitimate notification from google-noreply@google.com',
      severity: 'safe',
      data: {
        subject: 'Security alert for your linked Google Account',
        senderName: 'Google Security',
        senderEmail: 'no-reply@accounts.google.com',
        directLink: 'https://myaccount.google.com/notifications',
        bodySnippet:
          'A new sign-in from Chrome on macOS was detected. You can review your devices and security activity.',
        isIcs: false,
      },
    },
  ];

  const handleApplyPreset = (presetData: any) => {
    setSubject(presetData.subject);
    setSenderName(presetData.senderName);
    setSenderEmail(presetData.senderEmail);
    setBodySnippet(presetData.bodySnippet);
    setDirectLink(presetData.directLink || '');
    setIcsFileLoaded(Boolean(presetData.isIcs));
    setError(null);
    setResult(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setBodySnippet(text);

      if (text.includes('BEGIN:VCALENDAR')) {
        setIcsFileLoaded(true);

        // Pre-parse basic ICS fields for instant UI feedback
        const summaryMatch = text.match(/^SUMMARY(?:;[^:]*)?:(.*)$/im);
        if (summaryMatch) setSubject(summaryMatch[1].trim());

        const cnMatch = text.match(/CN=([^;:]+)/i);
        if (cnMatch) setSenderName(cnMatch[1].replace(/["']/g, '').trim());

        const mailtoMatch = text.match(/mailto:([^\s:;<>]+)/i);
        if (mailtoMatch) setSenderEmail(mailtoMatch[1].trim());

        const urlMatch = text.match(/(https?:\/\/[^\s"'<>\\]+)/i);
        if (urlMatch && !directLink) setDirectLink(urlMatch[1]);
      } else {
        setIcsFileLoaded(false);
      }
      setError(null);
    } catch {
      setError('Failed to read file. Please paste text directly.');
    }
  };

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setResult(null);

    // Extract links from direct link input + body text
    const extractedLinks: Array<{ url: string; text?: string }> = [];

    if (directLink.trim()) {
      extractedLinks.push({ url: directLink.trim(), text: 'Primary Destination Link' });
    }

    const urlRegex = /(https?:\/\/[^\s"'<>]+)/gi;
    const matches = bodySnippet.match(urlRegex);
    if (matches) {
      matches.forEach((matchedUrl) => {
        if (!extractedLinks.some((l) => l.url === matchedUrl)) {
          extractedLinks.push({ url: matchedUrl, text: 'Embedded Link' });
        }
      });
    }

    if (!senderEmail.trim() && extractedLinks.length === 0 && !subject.trim() && !bodySnippet.trim()) {
      setError('Please provide at least a sender address, calendar file, or destination link.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        subject: subject.trim(),
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        bodySnippet: bodySnippet.trim(),
        links: extractedLinks,
      };

      const scanRes = await scanEmail(payload);
      setResult(scanRes);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to inspect email or calendar invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-mono font-medium mb-3">
          <Mail className="w-3.5 h-3.5" />
          <span>Email & Calendar Sentinel • Web, Mobile & iOS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Email & Calendar Security Inspector
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          Verifies sender identity against protected brands, inspects calendar invites (.ics) for exploit vectors, and analyzes embedded URLs.
        </p>
      </div>

      {/* Preset Quick-Test Scenarios */}
      <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
            Threat Test Vectors & Presets
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p.data)}
              className={`p-3 rounded-lg border text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
                p.severity === 'danger'
                  ? 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
                  : p.severity === 'caution'
                  ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
                  : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <div
                className={`text-xs font-bold mb-1 flex items-center justify-between ${
                  p.severity === 'danger'
                    ? 'text-rose-800'
                    : p.severity === 'caution'
                    ? 'text-amber-800'
                    : 'text-emerald-800'
                }`}
              >
                <span>{p.label}</span>
                {p.data.isIcs && (
                  <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-rose-200/60 text-rose-900">
                    .ICS
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                {p.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Analysis Form Card */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm mb-6">
        <form onSubmit={handleScan} className="space-y-4">
          {/* File Upload Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-dashed border-slate-300">
            <div className="flex items-center space-x-2 text-xs text-slate-600">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Import calendar invite (.ics) or raw message:</span>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics,.eml,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload .ICS / .EML</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Sender / Organizer Name
              </label>
              <input
                type="text"
                placeholder="e.g. State Bank of India, HDFC Bank, Google"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Sender Email / Organizer Address
              </label>
              <input
                type="email"
                placeholder="e.g. alerts@gmail.com, support@onlinesbi.sbi"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Subject Line or Event Summary
            </label>
            <input
              type="text"
              placeholder="e.g. Urgent: Account suspended pending verification"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Destination URL to Inspect
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. https://sbi-online-banking-portal.net/login"
                value={directLink}
                onChange={(e) => setDirectLink(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-xs"
              />
              <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Message Body or Raw .ICS Text</span>
              {icsFileLoaded && (
                <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  iCalendar Format Loaded
                </span>
              )}
            </label>
            <textarea
              rows={4}
              placeholder="Paste email text or raw .ics calendar invite (BEGIN:VCALENDAR...). PhishLens will inspect organizers, UNC paths, and embedded links..."
              value={bodySnippet}
              onChange={(e) => setBodySnippet(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-medium text-sm rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Inspecting Sender Identity, Calendar Lures & Links...</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Run PhishLens Security Scan</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Result Section */}
      {result && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Main Verdict Banner */}
          <div
            className={`p-5 rounded-xl border shadow-sm ${
              result.emailVerdict === 'DANGER'
                ? 'bg-rose-50/70 border-rose-200'
                : result.emailVerdict === 'CAUTION'
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-emerald-50/70 border-emerald-200'
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    result.emailVerdict === 'DANGER'
                      ? 'bg-rose-100 text-rose-700'
                      : result.emailVerdict === 'CAUTION'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {result.emailVerdict === 'DANGER' ? (
                    <AlertOctagon className="w-5 h-5" />
                  ) : result.emailVerdict === 'CAUTION' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <h3
                    className={`text-base font-bold ${
                      result.emailVerdict === 'DANGER'
                        ? 'text-rose-900'
                        : result.emailVerdict === 'CAUTION'
                        ? 'text-amber-900'
                        : 'text-emerald-900'
                    }`}
                  >
                    {result.emailVerdict === 'DANGER'
                      ? 'Dangerous Threat Detected'
                      : result.emailVerdict === 'CAUTION'
                      ? 'Suspicious Message (Caution)'
                      : 'Verified Legitimate'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Deterministic score calculated from sender SPF/identity, redirect unmasking, and domain reputation.
                  </p>
                </div>
              </div>

              <div className="text-right font-mono flex-shrink-0">
                <div className="text-2xl font-black text-slate-900">
                  {result.emailRiskScore}
                  <span className="text-xs text-slate-500 font-normal"> / 100</span>
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Threat Rating
                </div>
              </div>
            </div>

            <div className="text-xs sm:text-sm font-medium text-slate-800 bg-white/70 p-3 rounded-lg border border-slate-200/80 leading-relaxed">
              {result.explanation}
            </div>
          </div>

          {/* Calendar Invite Threat Details (If ICS) */}
          {result.calendarAnalysis?.isCalendarInvite && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-3">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Calendar Invite Security Analysis (.ics)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block mb-0.5 font-medium">Event Title</span>
                  <span className="font-semibold text-slate-800">{result.calendarAnalysis.summary || 'N/A'}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block mb-0.5 font-medium">Organizer</span>
                  <span className="font-semibold text-slate-800">
                    {result.calendarAnalysis.organizerName || 'Unknown'} ({result.calendarAnalysis.organizerEmail || 'No email'})
                  </span>
                </div>
              </div>

              {result.calendarAnalysis.location && (
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs mb-3">
                  <span className="text-slate-500 block mb-0.5 font-medium">Meeting Location / UNC Target</span>
                  <span className="font-mono text-slate-800 break-all">{result.calendarAnalysis.location}</span>
                </div>
              )}

              {result.calendarAnalysis.exploitSignals && result.calendarAnalysis.exploitSignals.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 leading-relaxed">
                  <div className="font-bold flex items-center space-x-1.5 text-rose-800 mb-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    <span>Malicious Calendar Vector Detected</span>
                  </div>
                  <ul className="space-y-1">
                    {result.calendarAnalysis.exploitSignals.map((signal, sIdx) => (
                      <li key={sIdx} className="flex items-start space-x-1.5">
                        <span className="text-rose-600 font-bold">•</span>
                        <span>{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Sender Identity Card */}
          {result.senderAnalysis && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 mb-2">
                Sender / Organizer Identity Verification
              </div>
              <div className="text-sm font-medium text-slate-900 mb-1">
                {result.senderAnalysis.senderName || 'Unknown Display Name'}{' '}
                <span className="font-mono text-xs text-slate-500">
                  &lt;{result.senderAnalysis.senderEmail}&gt;
                </span>
              </div>

              {result.senderAnalysis.isSpoofed ? (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 leading-relaxed">
                  <div className="font-bold flex items-center space-x-1.5 text-rose-800 mb-1">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    <span>Brand Impersonation Detected</span>
                  </div>
                  {result.senderAnalysis.details}
                </div>
              ) : (
                <div className="mt-2 text-xs text-emerald-700 flex items-center space-x-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sender address domain is consistent with official registrations.</span>
                </div>
              )}
            </div>
          )}

          {/* Urgency Signals Card */}
          {result.urgencySignals && result.urgencySignals.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Urgency Manipulation Signals Detected ({result.urgencySignals.length})</span>
              </div>
              <ul className="space-y-1.5 mt-2">
                {result.urgencySignals.map((u, i) => (
                  <li key={i} className="text-xs text-amber-900 flex items-start space-x-2">
                    <span className="font-bold text-amber-700">•</span>
                    <span>{u}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contained Links Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
                Destination Links Analyzed ({result.linksAnalyzed?.length || 0})
              </div>
              {result.summary && (
                <div className="text-xs font-mono space-x-2 font-semibold">
                  <span className="text-rose-700">{result.summary.dangerCount} Danger</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-amber-700">{result.summary.cautionCount} Caution</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-emerald-700">{result.summary.safeCount} Safe</span>
                </div>
              )}
            </div>

            {result.linksAnalyzed && result.linksAnalyzed.length > 0 ? (
              <div className="space-y-3">
                {result.linksAnalyzed.map((link, idx) => {
                  const isDanger = link.verdict === 'DANGER';
                  const isCaution = link.verdict === 'CAUTION';
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg border text-xs ${
                        isDanger
                          ? 'bg-rose-50/60 border-rose-200'
                          : isCaution
                          ? 'bg-amber-50/60 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`font-mono font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                            isDanger
                              ? 'bg-rose-100 text-rose-800'
                              : isCaution
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {link.verdict} ({link.riskScore}/100)
                        </span>
                        {link.text && (
                          <span className="text-slate-500 truncate max-w-xs font-medium">
                            "{link.text}"
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-xs text-slate-800 break-all mb-1 font-semibold">
                        {link.finalUrl || link.url}
                      </div>

                      <div className="text-slate-600 text-xs leading-relaxed">
                        {link.explanation}
                      </div>

                      {link.why && link.why.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1">
                          {link.why.map((reason, rIdx) => (
                            <div key={rIdx} className="text-[11px] text-slate-600 flex items-start space-x-1.5">
                              <span className="text-slate-400">•</span>
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-3 text-center">
                No external links detected in this message.
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                const firstDanger = result.linksAnalyzed?.find((l) => l.verdict === 'DANGER');
                const targetUrl = firstDanger?.url || result.linksAnalyzed?.[0]?.url || '';
                navigate(
                  `/report?url=${encodeURIComponent(targetUrl)}&note=${encodeURIComponent(
                    `Reported from Sentinel: ${result.subject} (Sender: ${result.senderAnalysis?.senderEmail})`
                  )}`
                );
              }}
              className="flex-1 py-2.5 px-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-medium text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <Flag className="w-4 h-4 text-rose-600" />
              <span>Report Phishing to Community Triage</span>
            </button>

            <button
              onClick={() => {
                setResult(null);
                setSubject('');
                setSenderName('');
                setSenderEmail('');
                setDirectLink('');
                setBodySnippet('');
                setIcsFileLoaded(false);
              }}
              className="py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <span>Analyze Another Message</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
