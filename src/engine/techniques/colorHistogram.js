/**
 * Color Histogram Analysis
 * Analyzes RGB channel histograms for gaps, spikes, or unusual smoothness
 * that indicate synthetic generation or heavy editing.
 */

export function performColorHistogramAnalysis(imageData, width, height) {
  const data = imageData.data;
  const pixelCount = width * height;
  
  // Build histograms for R, G, B channels
  const histR = new Uint32Array(256);
  const histG = new Uint32Array(256);
  const histB = new Uint32Array(256);
  
  for (let i = 0; i < data.length; i += 4) {
    histR[data[i]]++;
    histG[data[i + 1]]++;
    histB[data[i + 2]]++;
  }
  
  // Analyze each channel
  const rAnalysis = analyzeChannel(histR, pixelCount);
  const gAnalysis = analyzeChannel(histG, pixelCount);
  const bAnalysis = analyzeChannel(histB, pixelCount);
  
  // Analyze color diversity
  const uniqueColors = new Set();
  const sampleSize = Math.min(pixelCount, 50000);
  const step = Math.max(1, Math.floor(pixelCount / sampleSize));
  
  let colorSampleCount = 0;
  for (let i = 0; i < data.length; i += 4 * step) {
    const color = `${data[i]},${data[i+1]},${data[i+2]}`;
    uniqueColors.add(color);
    colorSampleCount++;
  }
  
  const colorDiversity = uniqueColors.size / colorSampleCount;
  
  // Analyze saturation distribution
  let totalSat = 0;
  let highSatCount = 0;
  let veryLowSatCount = 0;
  let sampledPixels = 0;
  
  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max > 0 ? (max - min) / max : 0;
    totalSat += sat;
    if (sat > 0.8) highSatCount++;
    if (sat < 0.05) veryLowSatCount++;
    sampledPixels++;
  }
  
  const avgSat = totalSat / sampledPixels;
  const highSatRatio = highSatCount / sampledPixels;
  const lowSatRatio = veryLowSatCount / sampledPixels;
  
  // Scoring
  let score = 0;

  // Histogram gap analysis (AI images often have smoother histograms)
  const avgGaps = (rAnalysis.gaps + gAnalysis.gaps + bAnalysis.gaps) / 3;
  if (avgGaps < 3) score += 20;       // Very few gaps = suspiciously smooth
  else if (avgGaps < 8) score += 10;

  // Histogram smoothness (primary AI indicator — real cameras produce irregular histograms)
  const avgSmoothness = (rAnalysis.smoothness + gAnalysis.smoothness + bAnalysis.smoothness) / 3;
  if (avgSmoothness > 0.95) score += 28;
  else if (avgSmoothness > 0.9) score += 18;
  else if (avgSmoothness > 0.85) score += 8;

  // Spike analysis (heavy editing creates spikes)
  const totalSpikes = rAnalysis.spikes + gAnalysis.spikes + bAnalysis.spikes;
  if (totalSpikes > 15) score += 20;
  else if (totalSpikes > 8) score += 12;
  else if (totalSpikes > 4) score += 5;

  // Color diversity (AI images sometimes have limited palette)
  if (colorDiversity < 0.3) score += 15;
  else if (colorDiversity < 0.5) score += 8;

  // High saturation is only suspicious when ALSO paired with smooth histograms.
  // Real sports/nature photos are saturated but have irregular histograms (camera sensor noise).
  // AI-generated images are saturated AND have smooth histograms.
  const histogramSuspicious = avgSmoothness > 0.88 || avgGaps < 6;
  if (histogramSuspicious) {
    if (highSatRatio > 0.3) score += 15;
    else if (highSatRatio > 0.15) score += 8;
    if (avgSat > 0.5) score += 10;
    else if (avgSat > 0.4) score += 5;
  }
  if (lowSatRatio > 0.8 && colorDiversity < 0.2) score += 8;

  // AI-art palette: vivid + limited palette + SMOOTH histograms (all three required)
  // Real jerseys/nature are vivid but do NOT have smooth histograms.
  const isAIArtPalette = avgSat > 0.45 && highSatRatio > 0.25 &&
                         colorDiversity < 0.65 && avgSmoothness > 0.9;
  if (isAIArtPalette) score += 18;

  score = Math.min(100, score);
  const confidence = Math.min(1, 0.4 + Math.abs(avgSmoothness - 0.7) / 0.5);
  
  let details;
  if (score >= 60) {
    details = `Color distribution is highly unusual. Histogram smoothness: ${(avgSmoothness * 100).toFixed(0)}%, gaps: ${avgGaps.toFixed(0)}, spikes: ${totalSpikes}. Suggests synthetic generation or heavy editing.`;
  } else if (score >= 30) {
    details = `Some color anomalies detected. Histogram smoothness: ${(avgSmoothness * 100).toFixed(0)}%, color diversity: ${(colorDiversity * 100).toFixed(0)}%. Minor editing may be present.`;
  } else {
    details = `Color distribution appears natural. Histogram smoothness: ${(avgSmoothness * 100).toFixed(0)}%, color diversity: ${(colorDiversity * 100).toFixed(0)}%. Consistent with camera-captured images.`;
  }
  
  return {
    score,
    confidence,
    details,
    histograms: { r: Array.from(histR), g: Array.from(histG), b: Array.from(histB) },
    stats: { avgSmoothness: avgSmoothness.toFixed(3), avgGaps, totalSpikes, colorDiversity: colorDiversity.toFixed(3), lowSatRatio: lowSatRatio.toFixed(3) }
  };
}

function analyzeChannel(hist, pixelCount) {
  // Count gaps (zero bins)
  let gaps = 0;
  for (let i = 10; i < 245; i++) {
    if (hist[i] === 0) gaps++;
  }
  
  // Count spikes (bins with significantly more than neighbors)
  let spikes = 0;
  for (let i = 2; i < 253; i++) {
    const neighbors = (hist[i-2] + hist[i-1] + hist[i+1] + hist[i+2]) / 4;
    if (hist[i] > neighbors * 5 && hist[i] > pixelCount * 0.005) spikes++;
  }
  
  // Measure smoothness (how gradual the transitions are)
  let totalDiff = 0;
  for (let i = 1; i < 255; i++) {
    totalDiff += Math.abs(hist[i] - hist[i-1]);
  }
  const maxDiff = pixelCount;
  const smoothness = 1 - Math.min(1, totalDiff / (maxDiff * 0.1));
  
  return { gaps, spikes, smoothness };
}
