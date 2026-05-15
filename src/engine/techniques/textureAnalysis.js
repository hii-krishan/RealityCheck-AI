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
  if (blocksX === 0 || blocksY === 0) {
    return {
      score: 0,
      confidence: 0,
      details: 'Image is too small for reliable texture-consistency analysis.',
      stats: { homoMean: '0.000', texMean: '0.0', texCV: '0.00', flatRatio: '0%' }
    };
  }
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
  const flatRatio = blockTextures.filter(v => v < 55).length / blockTextures.length;
  // AI art / Ghibli style: very smooth gradient regions with low overall texture variance
  const isAIArtStyle = homoMean > 0.9 && texCV < 0.45 && flatRatio > 0.45;

  let score = 0;
  if (homoMean > 0.95) score += 24; else if (homoMean > 0.91) score += 14; else if (homoMean > 0.87) score += 8;
  if (texMean < 120 && texCV < 0.5) score += 20; else if (texMean < 200 && texCV < 0.75) score += 10;
  if (flatRatio > 0.6) score += 18; else if (flatRatio > 0.45) score += 10; else if (flatRatio > 0.3) score += 5;
  if (texCV > 3.2) score += 12; else if (texCV > 2.4) score += 8;
  if (contrastMean < 0.35) score += 6;
  if (isAIArtStyle) score += 14;
  score = Math.min(100, score);
  const confidence = Math.min(1, 0.35 + Math.abs(homoMean - 0.7) / 0.5);
  
  let details;
  if (score >= 60) details = `Strong AI/artwork texture fingerprint. Homogeneity: ${homoMean.toFixed(3)}, flat regions: ${(flatRatio*100).toFixed(0)}%, texCV: ${texCV.toFixed(2)}. Characteristic of AI-generated or digital art (e.g. Ghibli-style).`;
  else if (score >= 30) details = `Minor texture irregularities. Homogeneity: ${homoMean.toFixed(3)}, flat: ${(flatRatio*100).toFixed(0)}%. Possible digital art or light editing.`;
  else details = `Texture appears natural. Homogeneity: ${homoMean.toFixed(3)}, variance CV: ${texCV.toFixed(2)}.`;
  
  return { score, confidence, details, stats: { homoMean: homoMean.toFixed(3), texMean: texMean.toFixed(1), texCV: texCV.toFixed(2), flatRatio: (flatRatio*100).toFixed(0)+'%' } };
}
