import { SignalSeverity, Verdict } from '@prisma/client';

export interface SignalInput {
  code: string;
  severity: SignalSeverity;
  scoreImpact: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface EngineResult {
  riskScore: number;
  verdict: Verdict;
  explanation: string;
  why: string[];
  signals: SignalInput[];
}
