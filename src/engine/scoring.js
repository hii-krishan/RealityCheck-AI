/**
 * Scoring Engine
 * Combines results from all 8 techniques with weighted scoring to produce a final verdict.
 */

const WEIGHTS = {
  ela: 0.20,
  noise: 0.18,
  dct: 0.15,
  exif: 0.12,
  color: 0.12,
  edge: 0.10,
  texture: 0.08,
  clone: 0.05,
};

export function calculateFinalScore(results) {
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const [technique, weight] of Object.entries(WEIGHTS)) {
    if (results[technique]) {
      const { score, confidence } = results[technique];
      weightedSum += score * weight * confidence;
      totalWeight += weight * confidence;
    }
  }
  
  const finalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  
  let verdict, verdictClass;
  if (finalScore <= 30) {
    verdict = 'LIKELY AUTHENTIC';
    verdictClass = 'authentic';
  } else if (finalScore <= 60) {
    verdict = 'SUSPICIOUS — POSSIBLY MANIPULATED';
    verdictClass = 'suspicious';
  } else {
    verdict = 'LIKELY AI-GENERATED / MORPHED';
    verdictClass = 'fake';
  }
  
  const confidence = totalWeight > 0 
    ? Math.round((Object.values(results).reduce((sum, r) => sum + (r?.confidence || 0), 0) / Object.keys(results).length) * 100)
    : 0;
  
  return { finalScore, verdict, verdictClass, confidence, weights: WEIGHTS };
}
