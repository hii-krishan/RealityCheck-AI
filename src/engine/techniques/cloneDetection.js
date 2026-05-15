/**
 * Clone Detection (Copy-Move Forgery)
 * Divides image into overlapping blocks, hashes them, and finds matching blocks
 * at different positions — detecting copy-move forgery.
 */

export function performCloneDetection(imageData, width, height) {
  const data = imageData.data;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  const blockSize = 8;
  const step = 4; // overlap
  const minDist = 36; // min distance between matching blocks
  const minTextureVariance = 24;
  const blockHashes = [];
  if (width <= blockSize || height <= blockSize) {
    return {
      score: 0,
      confidence: 0,
      details: 'Image is too small for reliable copy-move clone detection.',
      cloneRegions: [],
      stats: { clonePairs: 0, cloneRatio: '0.00%', blocksAnalyzed: 0 }
    };
  }
  
  // Hash each textured block using average, variance, and quadrant structure.
  for (let y = 0; y <= height - blockSize; y += step) {
    for (let x = 0; x <= width - blockSize; x += step) {
      let sum = 0, sqSum = 0;
      for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
          const val = gray[(y + by) * width + (x + bx)];
          sum += val; sqSum += val * val;
        }
      }
      const n = blockSize * blockSize;
      const mean = sum / n;
      const variance = (sqSum / n) - (mean * mean);
      if (variance < minTextureVariance) continue;
      
      const features = getQuadrantFeatures(gray, width, x, y, blockSize)
        .map(value => Math.round((value - mean) / 8));
      const hash = `${Math.round(mean / 6)}_${Math.round(variance / 12)}_${features.join('_')}`;
      blockHashes.push({ x, y, hash, variance });
    }
  }
  
  // Group blocks by hash and find matches at different positions
  const hashGroups = {};
  blockHashes.forEach(b => {
    if (!hashGroups[b.hash]) hashGroups[b.hash] = [];
    hashGroups[b.hash].push(b);
  });
  
  const matchedPairs = [];
  const displacementCounts = new Map();
  
  for (const hash in hashGroups) {
    const group = hashGroups[hash];
    if (group.length < 2 || group.length > 50) continue;
    
    for (let i = 0; i < Math.min(group.length, 20); i++) {
      for (let j = i + 1; j < Math.min(group.length, 20); j++) {
        const dist = Math.sqrt((group[i].x - group[j].x)**2 + (group[i].y - group[j].y)**2);
        if (dist > minDist) {
          const varianceDelta = Math.abs(group[i].variance - group[j].variance) / Math.max(group[i].variance, group[j].variance, 1);
          if (varianceDelta > 0.25) continue;

          // Verify match more strictly
          let totalDiff = 0;
          for (let by = 0; by < blockSize; by++) {
            for (let bx = 0; bx < blockSize; bx++) {
              const v1 = gray[(group[i].y + by) * width + (group[i].x + bx)];
              const v2 = gray[(group[j].y + by) * width + (group[j].x + bx)];
              totalDiff += Math.abs(v1 - v2);
            }
          }
          const avgDiff = totalDiff / (blockSize * blockSize);
          
          if (avgDiff < 3.2) {
            const dx = Math.round((group[i].x - group[j].x) / step) * step;
            const dy = Math.round((group[i].y - group[j].y) / step) * step;
            const key = `${dx},${dy}`;
            displacementCounts.set(key, (displacementCounts.get(key) || 0) + 1);
            matchedPairs.push({ key, x1: group[i].x, y1: group[i].y, x2: group[j].x, y2: group[j].y });
          }
        }
      }
    }
  }
  
  const coherentDisplacements = new Set(
    [...displacementCounts.entries()]
      .filter(([, count]) => count >= 6)
      .map(([key]) => key)
  );
  const cloneRegions = matchedPairs.filter(pair => coherentDisplacements.has(pair.key));
  const clonePairs = cloneRegions.length;
  const totalCloneArea = clonePairs * blockSize * blockSize;
  const cloneRatio = totalCloneArea / (width * height);
  
  let score = 0;
  if (cloneRatio > 0.07) score += 60;
  else if (cloneRatio > 0.03) score += 40;
  else if (cloneRatio > 0.01) score += 22;
  else if (clonePairs > 18) score += 12;
  else if (clonePairs > 8) score += 6;
  
  score = Math.min(100, score);
  const confidence = Math.min(1, 0.3 + clonePairs / 50);
  
  let details;
  if (score >= 60) details = `Significant copy-move forgery detected! ${clonePairs} cloned regions found covering ${(cloneRatio*100).toFixed(1)}% of the image.`;
  else if (score >= 30) details = `Some potential cloned regions detected (${clonePairs} pairs). Could indicate copy-move manipulation.`;
  else details = `No significant copy-move forgery detected. ${clonePairs} minor matching blocks found (likely natural repetition).`;
  
  return { score, confidence, details, cloneRegions: cloneRegions.slice(0, 50),
    stats: { clonePairs, cloneRatio: (cloneRatio*100).toFixed(2)+'%', blocksAnalyzed: blockHashes.length } };
}

function getQuadrantFeatures(gray, width, x, y, blockSize) {
  const half = blockSize / 2;
  const features = [];

  for (let qy = 0; qy < 2; qy++) {
    for (let qx = 0; qx < 2; qx++) {
      let sum = 0;
      for (let by = 0; by < half; by++) {
        for (let bx = 0; bx < half; bx++) {
          sum += gray[(y + qy * half + by) * width + (x + qx * half + bx)];
        }
      }
      features.push(sum / (half * half));
    }
  }

  return features;
}
