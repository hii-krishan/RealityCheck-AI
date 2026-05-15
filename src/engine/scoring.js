/**
 * Scoring Engine
 * Combines results from all 8 techniques with weighted scoring to produce a final verdict.
 */

const WEIGHTS = {
  ela: 0.25,
  noise: 0.22,
  dct: 0.18,
  exif: 0.02,
  color: 0.13,
  edge: 0.12,
  texture: 0.06,
  clone: 0.02,
};

export function calculateFinalScore(results) {
  let weightedSum = 0;
  let totalWeight = 0;
  let possibleWeight = 0;
  const scoredResults = [];
  
  for (const [technique, weight] of Object.entries(WEIGHTS)) {
    possibleWeight += weight;
    if (results[technique]) {
      const { score, confidence } = results[technique];
      if (!Number.isFinite(score) || !Number.isFinite(confidence) || confidence <= 0) continue;

      const boundedScore = clamp(score, 0, 100);
      // Don't multiply by confidence - use raw score weighted
      weightedSum += boundedScore * weight;
      totalWeight += weight;
      scoredResults.push({ score: boundedScore, confidence: clamp(confidence, 0, 1) });
    }
  }
  
  if (totalWeight === 0 || scoredResults.length === 0) {
    return {
      finalScore: 0,
      verdict: 'INSUFFICIENT EVIDENCE',
      verdictClass: 'suspicious',
      confidence: 0,
      weights: WEIGHTS,
    };
  }

  const finalScore = Math.round(weightedSum / totalWeight);
  
  let verdict, verdictClass;
  if (finalScore < 40) {
    verdict = 'LIKELY AUTHENTIC';
    verdictClass = 'authentic';
  } else if (finalScore <= 75) {
    verdict = 'SUSPICIOUS — POSSIBLY MANIPULATED';
    verdictClass = 'suspicious';
  } else {
    verdict = 'LIKELY AI-GENERATED / MORPHED';
    verdictClass = 'fake';
  }

  let adjustedScore = finalScore;
  ({ finalScore: adjustedScore, verdict, verdictClass } = applyVerdictGuardrails({
    finalScore,
    verdict,
    verdictClass,
    results,
  }));
  
  const meanConfidence = scoredResults.reduce((sum, result) => sum + result.confidence, 0) / scoredResults.length;
  const scoreMean = scoredResults.reduce((sum, result) => sum + result.score, 0) / scoredResults.length;
  const scoreVariance = scoredResults.reduce((sum, result) => sum + (result.score - scoreMean) ** 2, 0) / scoredResults.length;
  const scoreAgreement = 1 - Math.min(1, Math.sqrt(scoreVariance) / 50);
  const coverage = Math.min(1, totalWeight / possibleWeight);
  const confidence = Math.round((meanConfidence * 0.65 + scoreAgreement * 0.35) * coverage * 100);
  
  return { finalScore: adjustedScore, verdict, verdictClass, confidence, weights: WEIGHTS };
}

function applyVerdictGuardrails({ finalScore, verdict, verdictClass, results }) {
  // Detect strong manipulation signals: both noise AND DCT showing clear artifacts
  const noiseScore = results.noise?.score || 0;
  const dctScore = results.dct?.score || 0;
  
  // If both major forensic indicators are moderately high, escalate to suspicious
  // even if final score is artificially lowered by other techniques
  if (noiseScore > 50 && dctScore > 35) {
    const manipScore = Math.max(finalScore, 40); // At least suspicious
    return {
      finalScore: manipScore,
      verdict: 'SUSPICIOUS — POSSIBLY MANIPULATED',
      verdictClass: 'suspicious'
    };
  }
  
  // If one is very high (>75), also escalate
  if ((noiseScore >= 75 || dctScore >= 75) && finalScore < 40) {
    return {
      finalScore: Math.max(finalScore, 40),
      verdict: 'SUSPICIOUS — POSSIBLY MANIPULATED',
      verdictClass: 'suspicious'
    };
  }
  
  return { finalScore, verdict, verdictClass };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
