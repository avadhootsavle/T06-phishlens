export type Verdict = 'SAFE' | 'CAUTION' | 'DANGER';

export type SignalSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ScanSignalDTO {
  code: string;
  severity: SignalSeverity;
  scoreImpact: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface ScanResultDTO {
  scanId: string;
  inputType: 'URL' | 'QR_URL' | 'QR_UPI';
  verdict: Verdict;
  riskScore: number;
  explanation: string;
  why: string[];
  hostname?: string;
  finalHostname?: string;
  url?: string;
  signals: ScanSignalDTO[];
  createdAt: string;
  // Specific IntentGuard details
  intentGuard?: {
    claimedBrand?: string;
    isOfficialDomain: boolean;
    domainAgeDays?: number | null;
    hasCredentialTrap: boolean;
    lookalikeMatch?: string;
  };
  // Gemini AI Threat Advisor details
  geminiAdvisor?: {
    apparentBrand: string | null;
    isLegitimateDomain: boolean;
    legitimateOfficialDomain?: string | null;
    impersonationConfidence: number;
    socialEngineeringTactics: string[];
    summaryExplanation: string;
    actionableAdvice: string;
    threatLevel: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS';
    additionalRiskPoints: number;
  };
  // Specific PaymentTruth details
  paymentTruth?: {
    isUPI: boolean;
    upiId?: string;
    payeeName?: string;
    amount?: string | null;
    currency?: string;
    actionDescription: string;
    expectedAction?: string;
    intentMismatch: boolean;
    merchantMatchStatus?: 'MATCH' | 'MISMATCH' | 'UNREGISTERED' | 'NOT_APPLICABLE';
    expectedMerchant?: string;
  };
}

export interface PageMetadataPayload {
  url: string;
  title?: string;
  headings?: string[];
  brandKeywords?: string[];
  logoAltText?: string[];
  hasPasswordField: boolean;
  hasOtpField: boolean;
  hasCvvField: boolean;
  hasCardField: boolean;
  hasKycField: boolean;
  hasUpiPinField: boolean;
  inputFieldNames?: string[];
  faviconUrl?: string;
  domStructureHash?: string;
}

export type PaymentIntentOption = 'PAY_MERCHANT' | 'RECEIVE_MONEY' | 'NOT_SURE';

export interface QRScanRequest {
  qrContent: string;
  expectedIntent?: PaymentIntentOption;
  expectedMerchantName?: string;
}

export interface URLScanRequest {
  url: string;
  clientContext?: {
    userAgent?: string;
    source?: 'EXTENSION' | 'PWA' | 'API';
  };
}

export type ReportCategory =
  | 'PHISHING_WEBSITE'
  | 'SUSPICIOUS_PAYMENT'
  | 'INCORRECT_RECIPIENT'
  | 'BRAND_IMPERSONATION'
  | 'FALSE_POSITIVE'
  | 'OTHER';

export type ReportStatus = 'PENDING' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'REJECTED';

export interface ReportSubmitRequest {
  scanId?: string;
  category: ReportCategory;
  note?: string;
  urlOrTarget?: string;
}
