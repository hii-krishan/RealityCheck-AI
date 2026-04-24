/**
 * Error Level Analysis (ELA)
 * Re-compresses image at a known quality and compares pixel differences.
 * Manipulated regions show higher error levels than uniform original regions.
 */

export function performELA(imageData, width, height) {
  const quality = 0.75;
  
  // Create canvas and draw original
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imageData, 0, 0);
  
  // Re-compress as JPEG
  const jpegDataUrl = tempCanvas.toDataURL('image/jpeg', quality);
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const recompressed = ctx.getImageData(0, 0, width, height);
      const original = imageData.data;
      const recompData = recompressed.data;
      
      const elaData = new Uint8ClampedArray(original.length);
      let totalDiff = 0;
      let maxDiff = 0;
      let highDiffPixels = 0;
      const blockSize = 8;
      const blockDiffs = [];
      
      // Calculate per-pixel error
      for (let i = 0; i < original.length; i += 4) {
        const diffR = Math.abs(original[i] - recompData[i]);
        const diffG = Math.abs(original[i + 1] - recompData[i + 1]);
        const diffB = Math.abs(original[i + 2] - recompData[i + 2]);
        
        const scale = 15; // Amplification
        elaData[i] = Math.min(255, diffR * scale);
        elaData[i + 1] = Math.min(255, diffG * scale);
        elaData[i + 2] = Math.min(255, diffB * scale);
        elaData[i + 3] = 255;
        
        const avgDiff = (diffR + diffG + diffB) / 3;
        totalDiff += avgDiff;
        maxDiff = Math.max(maxDiff, avgDiff);
        if (avgDiff > 20) highDiffPixels++;
      }
      
      const pixelCount = width * height;
      const avgDiff = totalDiff / pixelCount;
      
      // Analyze block-level variance (inconsistent ELA across blocks = manipulation)
      for (let by = 0; by < height; by += blockSize) {
        for (let bx = 0; bx < width; bx += blockSize) {
          let blockTotal = 0;
          let blockCount = 0;
          for (let y = by; y < Math.min(by + blockSize, height); y++) {
            for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
              const idx = (y * width + x) * 4;
              blockTotal += (Math.abs(original[idx] - recompData[idx]) +
                            Math.abs(original[idx+1] - recompData[idx+1]) +
                            Math.abs(original[idx+2] - recompData[idx+2])) / 3;
              blockCount++;
            }
          }
          blockDiffs.push(blockTotal / blockCount);
        }
      }
      
      // Calculate variance of block differences
      const blockMean = blockDiffs.reduce((a, b) => a + b, 0) / blockDiffs.length;
      const blockVariance = blockDiffs.reduce((a, b) => a + (b - blockMean) ** 2, 0) / blockDiffs.length;
      const blockStdDev = Math.sqrt(blockVariance);
      
      // Scoring: Higher variance in block diffs = more likely manipulated
      const highDiffRatio = highDiffPixels / pixelCount;
      let score = 0;
      
      // Block variance scoring (most reliable)
      if (blockStdDev > 15) score += 40;
      else if (blockStdDev > 10) score += 30;
      else if (blockStdDev > 6) score += 20;
      else if (blockStdDev > 3) score += 10;
      
      // High-diff pixel ratio
      if (highDiffRatio > 0.3) score += 30;
      else if (highDiffRatio > 0.15) score += 20;
      else if (highDiffRatio > 0.05) score += 10;
      
      // Average difference
      if (avgDiff > 20) score += 20;
      else if (avgDiff > 10) score += 15;
      else if (avgDiff > 5) score += 10;
      
      // Max diff extremes
      if (maxDiff > 100) score += 10;
      
      score = Math.min(100, score);
      
      const confidence = Math.min(1, 0.5 + blockStdDev / 30);
      
      let details = '';
      if (score >= 60) {
        details = `High ELA variance detected (σ=${blockStdDev.toFixed(1)}). ${(highDiffRatio * 100).toFixed(1)}% of pixels show significant compression differences, suggesting manipulation or compositing.`;
      } else if (score >= 30) {
        details = `Moderate ELA inconsistencies found (σ=${blockStdDev.toFixed(1)}). Some regions show different compression levels, which may indicate editing.`;
      } else {
        details = `ELA appears consistent across the image (σ=${blockStdDev.toFixed(1)}). Compression artifacts are uniform, suggesting an unmodified image.`;
      }
      
      resolve({
        score,
        confidence,
        details,
        heatmapData: new ImageData(elaData, width, height),
        stats: { avgDiff: avgDiff.toFixed(2), maxDiff, blockStdDev: blockStdDev.toFixed(2), highDiffRatio: (highDiffRatio * 100).toFixed(1) + '%' }
      });
    };
    img.src = jpegDataUrl;
  });
}
