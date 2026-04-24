/**
 * Noise Pattern Analysis
 * Extracts noise residual by subtracting a blurred version from the original.
 * Real photos have consistent, natural sensor noise; AI images have unnaturally uniform or patterned noise.
 */

export function performNoiseAnalysis(imageData, width, height) {
  const data = imageData.data;
  
  // Convert to grayscale
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  // Apply Gaussian blur (5x5 kernel)
  const kernel = [
    [1, 4, 7, 4, 1],
    [4, 16, 26, 16, 4],
    [7, 26, 41, 26, 7],
    [4, 16, 26, 16, 4],
    [1, 4, 7, 4, 1]
  ];
  const kernelSum = 273;
  const blurred = new Float32Array(width * height);
  
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      let sum = 0;
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          sum += gray[(y + ky) * width + (x + kx)] * kernel[ky + 2][kx + 2];
        }
      }
      blurred[y * width + x] = sum / kernelSum;
    }
  }
  
  // Extract noise residual
  const noise = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    noise[i] = gray[i] - blurred[i];
  }
  
  // Analyze noise statistics
  let noiseSum = 0;
  let noiseSqSum = 0;
  let validPixels = 0;
  
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const val = noise[y * width + x];
      noiseSum += val;
      noiseSqSum += val * val;
      validPixels++;
    }
  }
  
  const noiseMean = noiseSum / validPixels;
  const noiseVariance = (noiseSqSum / validPixels) - (noiseMean * noiseMean);
  const noiseStdDev = Math.sqrt(Math.abs(noiseVariance));
  
  // Analyze noise uniformity across blocks
  const blockSize = 32;
  const blockNoiseVars = [];
  
  for (let by = 2; by < height - 2; by += blockSize) {
    for (let bx = 2; bx < width - 2; bx += blockSize) {
      let bSum = 0, bSqSum = 0, bCount = 0;
      for (let y = by; y < Math.min(by + blockSize, height - 2); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, width - 2); x++) {
          const val = noise[y * width + x];
          bSum += val;
          bSqSum += val * val;
          bCount++;
        }
      }
      if (bCount > 0) {
        const bMean = bSum / bCount;
        const bVar = (bSqSum / bCount) - (bMean * bMean);
        blockNoiseVars.push(bVar);
      }
    }
  }
  
  // Calculate coefficient of variation of block noise variances
  const varMean = blockNoiseVars.reduce((a, b) => a + b, 0) / blockNoiseVars.length;
  const varVar = blockNoiseVars.reduce((a, b) => a + (b - varMean) ** 2, 0) / blockNoiseVars.length;
  const varCV = varMean > 0 ? Math.sqrt(varVar) / varMean : 0; // Coefficient of variation
  
  // Create noise visualization
  const noiseVis = new Uint8ClampedArray(width * height * 4);
  const noiseMax = Math.max(...noise.map(Math.abs));
  for (let i = 0; i < width * height; i++) {
    const normalized = ((noise[i] / (noiseMax || 1)) + 1) * 127.5;
    const val = Math.min(255, Math.max(0, normalized));
    noiseVis[i * 4] = val;
    noiseVis[i * 4 + 1] = val;
    noiseVis[i * 4 + 2] = val;
    noiseVis[i * 4 + 3] = 255;
  }
  
  // Scoring
  let score = 0;
  
  // Very low noise std dev suggests AI-generated (over-smoothed)
  if (noiseStdDev < 2) score += 40;
  else if (noiseStdDev < 4) score += 25;
  else if (noiseStdDev < 6) score += 10;
  
  // Non-uniform noise across blocks suggests manipulation
  if (varCV > 2) score += 30;
  else if (varCV > 1.2) score += 20;
  else if (varCV > 0.7) score += 10;
  
  // Very uniform noise (low CV) can suggest AI generation
  if (varCV < 0.15 && noiseStdDev < 5) score += 20;
  else if (varCV < 0.25 && noiseStdDev < 4) score += 10;
  
  score = Math.min(100, score);
  const confidence = Math.min(1, 0.4 + Math.abs(noiseStdDev - 8) / 15);
  
  let details = '';
  if (score >= 60) {
    details = `Noise pattern is highly irregular (σ=${noiseStdDev.toFixed(2)}, CV=${varCV.toFixed(2)}). The noise distribution suggests AI generation or heavy manipulation.`;
  } else if (score >= 30) {
    details = `Noise pattern shows some irregularities (σ=${noiseStdDev.toFixed(2)}, CV=${varCV.toFixed(2)}). Possible light editing or AI touch-up.`;
  } else {
    details = `Noise pattern appears natural and consistent (σ=${noiseStdDev.toFixed(2)}, CV=${varCV.toFixed(2)}). Consistent with genuine camera sensor noise.`;
  }
  
  return {
    score,
    confidence,
    details,
    noiseMapData: new ImageData(noiseVis, width, height),
    stats: { noiseStdDev: noiseStdDev.toFixed(3), noiseCV: varCV.toFixed(3), blockCount: blockNoiseVars.length }
  };
}
