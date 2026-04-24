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
  const minDist = 24; // min distance between matching blocks
  const blockHashes = [];
  
  // Hash each block using average + variance fingerprint
  for (let y = 0; y < height - blockSize; y += step) {
    for (let x = 0; x < width - blockSize; x += step) {
      let sum = 0, sqSum = 0;
      const features = [];
      for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
          const val = gray[(y + by) * width + (x + bx)];
          sum += val; sqSum += val * val;
        }
      }
      const n = blockSize * blockSize;
      const mean = sum / n;
      const variance = (sqSum / n) - (mean * mean);
      
      // Create a simple feature hash
      const hash = `${Math.round(mean / 4)}_${Math.round(variance / 10)}`;
      blockHashes.push({ x, y, hash, mean, variance });
    }
  }
  
  // Group blocks by hash and find matches at different positions
  const hashGroups = {};
  blockHashes.forEach(b => {
    if (!hashGroups[b.hash]) hashGroups[b.hash] = [];
    hashGroups[b.hash].push(b);
  });
  
  let clonePairs = 0;
  let totalCloneArea = 0;
  const cloneRegions = [];
  
  for (const hash in hashGroups) {
    const group = hashGroups[hash];
    if (group.length < 2 || group.length > 100) continue;
    
    for (let i = 0; i < Math.min(group.length, 20); i++) {
      for (let j = i + 1; j < Math.min(group.length, 20); j++) {
        const dist = Math.sqrt((group[i].x - group[j].x)**2 + (group[i].y - group[j].y)**2);
        if (dist > minDist) {
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
          
          if (avgDiff < 5) {
            clonePairs++;
            cloneRegions.push({ x1: group[i].x, y1: group[i].y, x2: group[j].x, y2: group[j].y });
          }
        }
      }
    }
  }
  
  totalCloneArea = clonePairs * blockSize * blockSize;
  const cloneRatio = totalCloneArea / (width * height);
  
  let score = 0;
  if (cloneRatio > 0.05) score += 60;
  else if (cloneRatio > 0.02) score += 40;
  else if (cloneRatio > 0.005) score += 25;
  else if (clonePairs > 10) score += 15;
  else if (clonePairs > 3) score += 8;
  
  score = Math.min(100, score);
  const confidence = Math.min(1, 0.3 + clonePairs / 50);
  
  let details;
  if (score >= 60) details = `Significant copy-move forgery detected! ${clonePairs} cloned regions found covering ${(cloneRatio*100).toFixed(1)}% of the image.`;
  else if (score >= 30) details = `Some potential cloned regions detected (${clonePairs} pairs). Could indicate copy-move manipulation.`;
  else details = `No significant copy-move forgery detected. ${clonePairs} minor matching blocks found (likely natural repetition).`;
  
  return { score, confidence, details, cloneRegions: cloneRegions.slice(0, 50),
    stats: { clonePairs, cloneRatio: (cloneRatio*100).toFixed(2)+'%', blocksAnalyzed: blockHashes.length } };
}
