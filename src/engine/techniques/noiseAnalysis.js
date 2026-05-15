/**
 * Noise Pattern Analysis
 * Extracts noise residual by subtracting a blurred version from the original.
 * Real photos have consistent, natural sensor noise; AI images have unnaturally uniform or patterned noise.
 */

export function performNoiseAnalysis(imageData, width, height) {
  const data = imageData.data;
  if (width < 5 || height < 5) {
    return createInsufficientNoiseResult(width, height);
  }
  
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
  
  // Create noise visualization with amplified contrast
  // Instead of normalizing by noiseMax (which can be tiny and wash out),
  // use a fixed amplification factor so differences are clearly visible.
  const noiseVis = new Uint8ClampedArray(width * height * 4);
  const AMPLIFY = 8; // multiply residual so ±3 noise maps to full 0–255 range
  for (let i = 0; i < width * height; i++) {
    // Map noise from [-AMPLIFY*noiseStdDev .. +AMPLIFY*noiseStdDev] → 0..255
    // Centre (zero noise) → 128 (mid-grey)
    const amplified = noise[i] * AMPLIFY;
    const val = Math.min(255, Math.max(0, 128 + amplified));
    // Tint: high noise (bright) = warm red-orange, low noise = cool blue
    const warm = val > 128 ? val : 128;
    const cool = val < 128 ? 255 - val : 128;
    noiseVis[i * 4]     = Math.min(255, warm);          // R
    noiseVis[i * 4 + 1] = Math.min(255, Math.round(val * 0.85)); // G
    noiseVis[i * 4 + 2] = Math.min(255, cool);          // B
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

  // Extra boost for highly non-uniform noise — strong sign of compositing / splicing
  if (varCV > 1.5 && noiseStdDev > 3) score = Math.min(100, score + 15);

  const confidence = Math.min(1, 0.45 + Math.abs(noiseStdDev - 8) / 14);
  
  let details;
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

function createInsufficientNoiseResult(width, height) {
  return {
    score: 0,
    confidence: 0,
    details: 'Image is too small for reliable noise-pattern analysis.',
    noiseMapData: new ImageData(createBlankRgba(width, height), width, height),
    stats: { noiseStdDev: '0.000', noiseCV: '0.000', blockCount: 0 }
  };
}

function createBlankRgba(width, height) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 3; i < rgba.length; i += 4) {
    rgba[i] = 255;
  }
  return rgba;
}
