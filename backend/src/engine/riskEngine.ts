import { Verdict } from '@prisma/client';
import { EngineResult, SignalInput } from './types.js';
import { generateExplanation } from './explanationEngine.js';

export function calculateRisk(signals: SignalInput[]): EngineResult {
  // Sum up all score impacts
  let totalScore = 0;
  for (const signal of signals) {
    totalScore += signal.scoreImpact;
  }

  // Clamp score strictly between 0 and 100
  const riskScore = Math.min(100, Math.max(0, totalScore));

  // Determine verdict based on specified boundaries:
  // 0–24: SAFE
  // 25–59: CAUTION
  // 60–100: DANGER
  let verdict: Verdict;
  if (riskScore >= 60) {
    verdict = Verdict.DANGER;
  } else if (riskScore >= 25) {
    verdict = Verdict.CAUTION;
  } else {
    verdict = Verdict.SAFE;
  }

  const { explanation, why } = generateExplanation(verdict, signals);

  return {
    riskScore,
    verdict,
    explanation,
    why,
    signals,
  };
}
