/**
 * Error Level Analysis (ELA)
 * Re-compresses image at a known JPEG quality and compares pixel differences.
 * Uses canvas.toBlob() which is more reliable than toDataURL in Vite/browser contexts.
 */

export async function performELA(imageData, width, height) {
  try {
    // Draw original image data to a temp canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) throw new Error('Could not create temp canvas context');
    tempCtx.putImageData(imageData, 0, 0);

    // Re-compress as JPEG using toBlob (more reliable than toDataURL in all browsers)
    const jpegBlob = await new Promise((res, rej) => {
      tempCanvas.toBlob(
        blob => blob ? res(blob) : rej(new Error('toBlob returned null')),
        'image/jpeg',
        0.75
      );
    });

    // Load re-compressed image back
    const blobUrl = URL.createObjectURL(jpegBlob);
    const recompImg = await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Failed to load recompressed image'));
      img.src = blobUrl;
    });

    // Draw re-compressed image to a comparison canvas
    const cmpCanvas = document.createElement('canvas');
    cmpCanvas.width = width;
    cmpCanvas.height = height;
    const cmpCtx = cmpCanvas.getContext('2d', { willReadFrequently: true });
    if (!cmpCtx) throw new Error('Could not create comparison canvas');
    cmpCtx.drawImage(recompImg, 0, 0, width, height);
    URL.revokeObjectURL(blobUrl);

    const recompressed = cmpCtx.getImageData(0, 0, width, height);
    const original = imageData.data;
    const recompData = recompressed.data;

    const elaData = new Uint8ClampedArray(original.length);
    let totalDiff = 0;
    let maxDiff = 0;
    let highDiffPixels = 0;
    const blockSize = 8;
    const blockDiffs = [];

    // Per-pixel error
    for (let i = 0; i < original.length; i += 4) {
      const diffR = Math.abs(original[i]     - recompData[i]);
      const diffG = Math.abs(original[i + 1] - recompData[i + 1]);
      const diffB = Math.abs(original[i + 2] - recompData[i + 2]);
      const scale = 12;
      elaData[i]     = Math.min(255, diffR * scale);
      elaData[i + 1] = Math.min(255, diffG * scale);
      elaData[i + 2] = Math.min(255, diffB * scale);
      elaData[i + 3] = 255;
      const avgDiff = (diffR + diffG + diffB) / 3;
      totalDiff += avgDiff;
      maxDiff = Math.max(maxDiff, avgDiff);
      if (avgDiff > 15) highDiffPixels++;
    }

    const pixelCount = width * height;
    const avgDiff = totalDiff / pixelCount;

    // Block-level variance
    for (let by = 0; by < height; by += blockSize) {
      for (let bx = 0; bx < width; bx += blockSize) {
        let blockTotal = 0, blockCount = 0;
        for (let y = by; y < Math.min(by + blockSize, height); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
            const idx = (y * width + x) * 4;
            blockTotal += (Math.abs(original[idx]   - recompData[idx]) +
                           Math.abs(original[idx+1] - recompData[idx+1]) +
                           Math.abs(original[idx+2] - recompData[idx+2])) / 3;
            blockCount++;
          }
        }
        blockDiffs.push(blockTotal / blockCount);
      }
    }

    const blockMean = blockDiffs.reduce((a, b) => a + b, 0) / blockDiffs.length;
    const blockVariance = blockDiffs.reduce((a, b) => a + (b - blockMean) ** 2, 0) / blockDiffs.length;
    const blockStdDev = Math.sqrt(blockVariance);
    const highDiffRatio = highDiffPixels / pixelCount;

    let score = 0;
    if (blockStdDev > 12) score += 40; else if (blockStdDev > 7) score += 28; else if (blockStdDev > 4) score += 18; else if (blockStdDev > 2) score += 8;
    if (highDiffRatio > 0.25) score += 30; else if (highDiffRatio > 0.12) score += 20; else if (highDiffRatio > 0.04) score += 10;
    if (avgDiff > 15) score += 20; else if (avgDiff > 8) score += 14; else if (avgDiff > 4) score += 8;
    if (maxDiff > 80) score += 10;
    score = Math.min(100, score);

    const confidence = Math.min(1, 0.5 + blockStdDev / 25);

    let details;
    if (score >= 60) {
      details = `High ELA variance (σ=${blockStdDev.toFixed(1)}, avg diff=${avgDiff.toFixed(1)}). ${(highDiffRatio * 100).toFixed(1)}% of pixels show significant re-compression differences — strong manipulation indicator.`;
    } else if (score >= 30) {
      details = `Moderate ELA inconsistencies (σ=${blockStdDev.toFixed(1)}, avg diff=${avgDiff.toFixed(1)}). Some regions show uneven compression levels — possible editing.`;
    } else {
      details = `ELA is consistent across the image (σ=${blockStdDev.toFixed(1)}, avg diff=${avgDiff.toFixed(1)}). Compression artifacts are uniform — no manipulation detected.`;
    }

    return {
      score, confidence, details,
      heatmapData: new ImageData(elaData, width, height),
      stats: { avgDiff: avgDiff.toFixed(2), maxDiff: maxDiff.toFixed(1), blockStdDev: blockStdDev.toFixed(2), highDiffRatio: (highDiffRatio * 100).toFixed(1) + '%' }
    };

  } catch (err) {
    console.error('ELA failed:', err);
    return {
      score: 0, confidence: 0,
      details: `ELA could not be completed: ${err.message}`,
      stats: {}
    };
  }
}
