export type Verdict = 'SAFE' | 'CAUTION' | 'DANGER';

export type SignalSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ScanSignal {
  code: string;
  severity: SignalSeverity;
  scoreImpact: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface IntentGuardInfo {
  claimedBrand?: string | null;
  isOfficialDomain: boolean;
  domainAgeDays?: number | null;
  hasCredentialTrap: boolean;
  lookalikeMatch?: string | null;
}

export interface MerchantVerificationSummary {
  status:
    | 'VERIFIED'
    | 'VERIFIED_REGISTRY'
    | 'TAMPERED'
    | 'MISMATCH'
    | 'EXPIRED'
    | 'REVOKED'
    | 'UNVERIFIED'
    | 'NOT_APPLICABLE';
  shopName?: string;
  vpa?: string;
  city?: string | null;
  expectedShopName?: string;
  registeredShopName?: string;
  message?: string;
}

export interface MerchantRecord {
  id: string;
  shopName: string;
  vpa: string;
  city?: string | null;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  revokedAt?: string | null;
  stickerUrl?: string;
}

export interface PaymentTruthInfo {
  isUPI: boolean;
  upiId?: string;
  payeeName?: string;
  amount?: string | null;
  currency?: string;
  actionDescription: string;
  expectedAction?: string;
  intentMismatch: boolean;
  merchantMatchStatus?: 'MATCH' | 'MISMATCH' | 'UNREGISTERED' | 'NOT_APPLICABLE';
  merchantVerification?: MerchantVerificationSummary;
  expectedMerchant?: string;
}

export interface GeminiThreatAdvisor {
  apparentBrand: string | null;
  isLegitimateDomain: boolean;
  legitimateOfficialDomain?: string | null;
  impersonationConfidence: number;
  socialEngineeringTactics: string[];
  summaryExplanation: string;
  actionableAdvice: string;
  threatLevel: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS';
  additionalRiskPoints: number;
}

export interface RedirectHop {
  url: string;
  statusCode: number;
  hostname: string;
}

export interface ScanResult {
  scanId: string;
  inputType: 'URL' | 'QR_URL' | 'QR_UPI' | 'UNKNOWN';
  verdict: Verdict;
  riskScore: number;
  explanation: string;
  why: string[];
  hostname?: string;
  finalHostname?: string;
  url?: string;
  finalUrl?: string;
  isShortened?: boolean;
  redirects?: RedirectHop[];
  signals: ScanSignal[];
  intentGuard?: IntentGuardInfo;
  paymentTruth?: PaymentTruthInfo;
  geminiAdvisor?: GeminiThreatAdvisor;
  previewJobId?: string;
  previewUrl?: string;
  createdAt: string;
}

export interface PreviewJobData {
  jobId: string;
  scanId?: string;
  status: 'pending' | 'ready' | 'failed';
  error?: string;
  imageUrl?: string;
  brandRefImageUrl?: string;
  visualImpersonation?: {
    brand: string;
    similarity: number;
    brandKey?: string;
  };
  brand?: string;
  similarity?: number;
  officialDomain?: string;
  riskBoost?: number;
  explanation?: string;
}

export type PaymentIntent = 'PAY_MERCHANT' | 'RECEIVE_MONEY' | 'NOT_SURE';

export interface ReportItem {
  id: string;
  scanId?: string;
  category: string;
  note?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'REJECTED';
  createdAt: string;
  scan?: {
    id: string;
    inputType: string;
    verdict: Verdict;
    riskScore: number;
    explanation: string;
    hostname?: string;
    createdAt: string;
  };
}
