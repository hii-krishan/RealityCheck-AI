/**
 * Texture Consistency Analysis
 * Measures local texture variance using GLCM-inspired metrics.
 * AI images often have suspiciously uniform texture regions.
 */

export function performTextureAnalysis(imageData, width, height) {
  const data = imageData.data;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  const blockSize = 16;
  const blocksX = Math.floor(width / blockSize);
  const blocksY = Math.floor(height / blockSize);
  const blockTextures = [];
  const blockContrasts = [];
  const blockHomogeneities = [];
  
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let sum = 0, sqSum = 0, count = 0;
      for (let y = by * blockSize; y < (by + 1) * blockSize; y++) {
        for (let x = bx * blockSize; x < (bx + 1) * blockSize; x++) {
          const val = gray[y * width + x];
          sum += val; sqSum += val * val; count++;
        }
      }
      const mean = sum / count;
      blockTextures.push((sqSum / count) - (mean * mean));
      
      let contrast = 0, homogeneity = 0, pairs = 0;
      for (let y = by * blockSize; y < (by + 1) * blockSize; y++) {
        for (let x = bx * blockSize; x < (bx + 1) * blockSize - 1; x++) {
          const v1 = Math.floor(gray[y * width + x] / 16);
          const v2 = Math.floor(gray[y * width + x + 1] / 16);
          const diff = Math.abs(v1 - v2);
          contrast += diff * diff; homogeneity += 1 / (1 + diff); pairs++;
        }
      }
      if (pairs > 0) { blockContrasts.push(contrast / pairs); blockHomogeneities.push(homogeneity / pairs); }
    }
  }
  
  const texMean = blockTextures.reduce((a, b) => a + b, 0) / blockTextures.length;
  const texVar = blockTextures.reduce((a, b) => a + (b - texMean) ** 2, 0) / blockTextures.length;
  const texCV = texMean > 0 ? Math.sqrt(texVar) / texMean : 0;
  const homoMean = blockHomogeneities.reduce((a, b) => a + b, 0) / blockHomogeneities.length;
  const contrastMean = blockContrasts.reduce((a, b) => a + b, 0) / blockContrasts.length;
  const flatRatio = blockTextures.filter(v => v < 50).length / blockTextures.length;
  
  let score = 0;
  if (homoMean > 0.95) score += 30; else if (homoMean > 0.9) score += 20; else if (homoMean > 0.85) score += 10;
  if (texMean < 100 && texCV < 0.5) score += 25; else if (texMean < 200 && texCV < 0.8) score += 12;
  if (flatRatio > 0.6) score += 20; else if (flatRatio > 0.4) score += 12; else if (flatRatio > 0.25) score += 5;
  if (texCV > 3) score += 15; else if (texCV > 2) score += 10;
  if (contrastMean < 0.5) score += 10;
  score = Math.min(100, score);
  const confidence = Math.min(1, 0.35 + Math.abs(homoMean - 0.7) / 0.5);
  
  let details;
  if (score >= 60) details = `Texture anomalies detected. Homogeneity: ${homoMean.toFixed(3)}, flat regions: ${(flatRatio*100).toFixed(0)}%. Strong AI generation indicators.`;
  else if (score >= 30) details = `Minor texture irregularities. Homogeneity: ${homoMean.toFixed(3)}, flat: ${(flatRatio*100).toFixed(0)}%.`;
  else details = `Texture appears natural. Homogeneity: ${homoMean.toFixed(3)}, variance CV: ${texCV.toFixed(2)}.`;
  
  return { score, confidence, details, stats: { homoMean: homoMean.toFixed(3), texMean: texMean.toFixed(1), texCV: texCV.toFixed(2), flatRatio: (flatRatio*100).toFixed(0)+'%' } };
}
