/**
 * Threat & Opportunity scoring.
 *
 * Threat (0–100) is a weighted blend of factors; every ScoreSnapshot
 * persists the full breakdown so trends are explainable, never a black box.
 * Weights are the product's editorial voice — tune deliberately.
 */

export interface ThreatFactors {
  growth: number; // 0–100
  funding: number;
  hiring: number;
  technology: number;
  featureVelocity: number;
  traffic: number;
  marketing: number;
  customerSatisfaction: number;
}

export const THREAT_WEIGHTS: Record<keyof ThreatFactors, number> = {
  growth: 0.2,
  funding: 0.15,
  hiring: 0.1,
  technology: 0.1,
  featureVelocity: 0.2,
  traffic: 0.1,
  marketing: 0.05,
  customerSatisfaction: 0.1,
};

export function computeThreatScore(factors: ThreatFactors): {
  score: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};
  let score = 0;
  for (const [key, weight] of Object.entries(THREAT_WEIGHTS) as [keyof ThreatFactors, number][]) {
    const contribution = factors[key] * weight;
    breakdown[key] = Math.round(contribution * 10) / 10;
    score += contribution;
  }
  return { score: Math.round(score), breakdown };
}
