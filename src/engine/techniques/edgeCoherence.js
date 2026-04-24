/**
 * Edge Coherence Analysis
 * Applies Sobel edge detection and checks for inconsistent edge sharpness
 * across regions — a sign of compositing or splicing.
 */

export function performEdgeCoherenceAnalysis(imageData, width, height) {
  const data = imageData.data;
  
  // Convert to grayscale
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  // Sobel operators
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  
  const edges = new Float32Array(width * height);
  const directions = new Float32Array(width * height);
  
  let totalEdge = 0;
  let edgePixelCount = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const val = gray[(y + ky) * width + (x + kx)];
          gx += val * sobelX[ky + 1][kx + 1];
          gy += val * sobelY[ky + 1][kx + 1];
        }
      }
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = magnitude;
      directions[y * width + x] = Math.atan2(gy, gx);
      totalEdge += magnitude;
      if (magnitude > 30) edgePixelCount++;
    }
  }
  
  const avgEdge = totalEdge / ((width - 2) * (height - 2));
  
  // Analyze edge consistency across blocks
  const blockSize = 32;
  const blockEdgeStrengths = [];
  const blockEdgeDensities = [];
  
  for (let by = 1; by < height - 1; by += blockSize) {
    for (let bx = 1; bx < width - 1; bx += blockSize) {
      let blockTotal = 0;
      let blockEdgeCount = 0;
      let blockCount = 0;
      
      for (let y = by; y < Math.min(by + blockSize, height - 1); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, width - 1); x++) {
          const e = edges[y * width + x];
          blockTotal += e;
          if (e > 30) blockEdgeCount++;
          blockCount++;
        }
      }
      
      if (blockCount > 0) {
        blockEdgeStrengths.push(blockTotal / blockCount);
        blockEdgeDensities.push(blockEdgeCount / blockCount);
      }
    }
  }
  
  // Calculate variance of edge strengths across blocks
  const strengthMean = blockEdgeStrengths.reduce((a, b) => a + b, 0) / blockEdgeStrengths.length;
  const strengthVar = blockEdgeStrengths.reduce((a, b) => a + (b - strengthMean) ** 2, 0) / blockEdgeStrengths.length;
  const strengthCV = strengthMean > 0 ? Math.sqrt(strengthVar) / strengthMean : 0;
  
  // Edge density analysis
  const densityMean = blockEdgeDensities.reduce((a, b) => a + b, 0) / blockEdgeDensities.length;
  
  // Check for unnaturally uniform edges (AI artifact)
  const densityCV = (() => {
    const dMean = blockEdgeDensities.reduce((a, b) => a + b, 0) / blockEdgeDensities.length;
    const dVar = blockEdgeDensities.reduce((a, b) => a + (b - dMean) ** 2, 0) / blockEdgeDensities.length;
    return dMean > 0 ? Math.sqrt(dVar) / dMean : 0;
  })();
  
  // Direction coherence analysis (gradual vs sudden edge direction changes)
  let directionChanges = 0;
  const edgeThreshold = 30;
  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 2) {
      if (edges[y * width + x] > edgeThreshold) {
        const dir = directions[y * width + x];
        const neighbors = [
          directions[(y-1) * width + x],
          directions[(y+1) * width + x],
          directions[y * width + (x-1)],
          directions[y * width + (x+1)]
        ].filter((_, i) => {
          const ny = y + [-1, 1, 0, 0][i];
          const nx = x + [0, 0, -1, 1][i];
          return edges[ny * width + nx] > edgeThreshold;
        });
        
        if (neighbors.length > 0) {
          const avgDir = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
          if (Math.abs(dir - avgDir) > Math.PI / 3) directionChanges++;
        }
      }
    }
  }
  
  const dirChangeRatio = edgePixelCount > 0 ? directionChanges / edgePixelCount : 0;
  
  // Scoring
  let score = 0;
  
  // Edge strength variance (splicing creates inconsistent edges)
  if (strengthCV > 2) score += 25;
  else if (strengthCV > 1.3) score += 15;
  else if (strengthCV > 0.8) score += 8;
  
  // Unnaturally uniform edges (AI-generated)
  if (densityCV < 0.2 && avgEdge < 15) score += 25;
  else if (densityCV < 0.3 && avgEdge < 20) score += 15;
  
  // Abrupt direction changes (compositing boundaries)
  if (dirChangeRatio > 0.3) score += 25;
  else if (dirChangeRatio > 0.15) score += 15;
  else if (dirChangeRatio > 0.08) score += 8;
  
  // Very low edge density (over-smoothed AI image)
  if (densityMean < 0.03) score += 15;
  else if (densityMean < 0.06) score += 8;
  
  score = Math.min(100, score);
  const confidence = Math.min(1, 0.35 + strengthCV / 4);
  
  let details = '';
  if (score >= 60) {
    details = `Edge analysis reveals significant inconsistencies. Strength CV: ${strengthCV.toFixed(2)}, density variation: ${densityCV.toFixed(2)}. Possible splicing or AI generation artifacts.`;
  } else if (score >= 30) {
    details = `Minor edge irregularities detected. Strength CV: ${strengthCV.toFixed(2)}, density: ${(densityMean * 100).toFixed(1)}%. Some regions show inconsistent sharpness.`;
  } else {
    details = `Edge distribution is coherent across the image. Strength CV: ${strengthCV.toFixed(2)}, density: ${(densityMean * 100).toFixed(1)}%. Consistent with natural photography.`;
  }
  
  return {
    score,
    confidence,
    details,
    stats: { strengthCV: strengthCV.toFixed(3), densityCV: densityCV.toFixed(3), densityMean: densityMean.toFixed(3), avgEdge: avgEdge.toFixed(1) }
  };
}
