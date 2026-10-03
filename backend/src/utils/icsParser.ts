/**
 * RFC 5545 iCalendar (.ics) Parser and Threat Vector Extractor for PhishLens.
 * Extracts event metadata, organizer identity, embedded links, and inspects
 * for calendar attack vectors (malicious attachments, UNC credential leak paths,
 * and social engineering lures).
 */

export interface ParsedIcsResult {
  isIcs: boolean;
  summary?: string;
  organizerName?: string;
  organizerEmail?: string;
  description?: string;
  location?: string;
  directUrl?: string;
  attachments: string[];
  exploitIndicators: string[];
  extractedUrls: Array<{ url: string; text: string }>;
}

/**
 * Checks whether the given text is an iCalendar payload.
 */
export function isIcsContent(content: string): boolean {
  if (!content) return false;
  return /BEGIN:VCALENDAR/i.test(content);
}

/**
 * Unfolds RFC 5545 lines (lines beginning with a single space or tab continue the previous line).
 */
function unfoldIcsLines(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const unfolded: string[] = [];

  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else if (line.trim().length > 0) {
      unfolded.push(line);
    }
  }

  return unfolded;
}

/**
 * Parses an RFC 5545 iCalendar string and extracts threat signals.
 */
export function parseIcs(content: string): ParsedIcsResult {
  const result: ParsedIcsResult = {
    isIcs: false,
    attachments: [],
    exploitIndicators: [],
    extractedUrls: [],
  };

  if (!isIcsContent(content)) {
    return result;
  }

  result.isIcs = true;
  const lines = unfoldIcsLines(content);
  const dangerousExtRegex = /\.(exe|scr|bat|cmd|ps1|apk|vbs|iso|hta|msi|dll|cpl)($|\?)/i;

  for (const line of lines) {
    // Check for UNC path injection (e.g. CVE-2023-23397 or Outlook NTLM coercion vectors)
    if (line.includes('\\\\') || /smb:\/\//i.test(line)) {
      result.exploitIndicators.push('UNC network path detected in calendar metadata (NTLM credential coercion vector).');
    }

    // Check for dangerous protocol handlers
    if (/(ms-appinstaller:|javascript:|vbscript:|data:text\/html)/i.test(line)) {
      result.exploitIndicators.push('Dangerous URI execution scheme detected in calendar property.');
    }

    // SUMMARY (Event title)
    if (/^SUMMARY(?:;[^:]*)?:(.*)$/i.test(line)) {
      const match = line.match(/^SUMMARY(?:;[^:]*)?:(.*)$/i);
      if (match && match[1]) {
        result.summary = cleanIcsValue(match[1]);
      }
    }

    // ORGANIZER (e.g. ORGANIZER;CN=State Bank of India:mailto:alerts@sbi-kyc.net)
    if (/^ORGANIZER(?:;[^:]*)?:(.*)$/i.test(line)) {
      const cnMatch = line.match(/CN=([^;:]+)/i);
      if (cnMatch) {
        result.organizerName = cnMatch[1].replace(/^["']|["']$/g, '').trim();
      }

      const mailtoMatch = line.match(/mailto:([^\s:;<>]+)/i);
      if (mailtoMatch) {
        result.organizerEmail = mailtoMatch[1].trim();
      }
    }

    // DESCRIPTION
    if (/^DESCRIPTION(?:;[^:]*)?:(.*)$/i.test(line)) {
      const match = line.match(/^DESCRIPTION(?:;[^:]*)?:(.*)$/i);
      if (match && match[1]) {
        result.description = cleanIcsValue(match[1]);
      }
    }

    // LOCATION
    if (/^LOCATION(?:;[^:]*)?:(.*)$/i.test(line)) {
      const match = line.match(/^LOCATION(?:;[^:]*)?:(.*)$/i);
      if (match && match[1]) {
        result.location = cleanIcsValue(match[1]);
      }
    }

    // URL property
    if (/^URL(?:;[^:]*)?:(.*)$/i.test(line)) {
      const match = line.match(/^URL(?:;[^:]*)?:(.*)$/i);
      if (match && match[1]) {
        const u = cleanIcsValue(match[1]);
        result.directUrl = u;
        if (/^https?:\/\//i.test(u)) {
          result.extractedUrls.push({ url: u, text: 'Calendar URL Property' });
        }
      }
    }

    // ATTACH property
    if (/^ATTACH(?:;[^:]*)?:(.*)$/i.test(line)) {
      const match = line.match(/^ATTACH(?:;[^:]*)?:(.*)$/i);
      if (match && match[1]) {
        const attachVal = cleanIcsValue(match[1]);
        result.attachments.push(attachVal);

        if (dangerousExtRegex.test(attachVal)) {
          result.exploitIndicators.push(`Dangerous executable attachment linked in calendar invite: ${attachVal}`);
        }

        if (/^https?:\/\//i.test(attachVal)) {
          result.extractedUrls.push({ url: attachVal, text: 'Calendar Attachment Link' });
        }
      }
    }
  }

  // Extract URLs from DESCRIPTION and LOCATION
  const textToScan = `${result.description || ''} ${result.location || ''}`;
  const urlRegex = /(https?:\/\/[^\s"'<>\\]+)/gi;
  const matches = textToScan.match(urlRegex);
  if (matches) {
    for (const m of matches) {
      if (!result.extractedUrls.some((u) => u.url === m)) {
        result.extractedUrls.push({ url: m, text: 'Embedded Calendar Link' });
      }
    }
  }

  return result;
}

/**
 * Decodes standard iCalendar escaped characters (\n, \;, \,, \\)
 */
function cleanIcsValue(val: string): string {
  return val
    .replace(/\\n/gi, '\n')
    .replace(/\\N/g, '\n')
    .replace(/\\;/g, ';')
    .replace(/\\,/g, ',')
    .replace(/\\\\/g, '\\')
    .trim();
}
