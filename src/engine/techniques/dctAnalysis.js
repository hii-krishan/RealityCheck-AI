/**
 * DCT (Discrete Cosine Transform) Frequency Analysis
 * Analyzes 8x8 blocks for abnormal frequency distributions.
 * Detects double JPEG compression and AI-generated frequency artifacts.
 */

export function performDCTAnalysis(imageData, width, height) {
  const data = imageData.data;
  
  // Convert to grayscale
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  
  const blockSize = 8;
  const blocksX = Math.floor(width / blockSize);
  const blocksY = Math.floor(height / blockSize);
  if (blocksX === 0 || blocksY === 0) {
    return {
      score: 0,
      confidence: 0,
      details: 'Image is too small for reliable DCT frequency analysis.',
      stats: { meanHFR: '0.0%', cvAC: '0.000', periodicGaps: 0, blocksAnalyzed: 0 }
    };
  }
  
  // Precompute DCT cosine table
  const cosTable = new Float32Array(blockSize * blockSize);
  for (let i = 0; i < blockSize; i++) {
    for (let j = 0; j < blockSize; j++) {
      cosTable[i * blockSize + j] = Math.cos(((2 * j + 1) * i * Math.PI) / (2 * blockSize));
    }
  }
  
  // Analyze each 8x8 block
  const acEnergies = [];
  const dcValues = [];
  const highFreqRatios = [];
  const lowFreqRatios = [];
  
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      // Extract block
      const block = new Float32Array(blockSize * blockSize);
      for (let y = 0; y < blockSize; y++) {
        for (let x = 0; x < blockSize; x++) {
          block[y * blockSize + x] = gray[(by * blockSize + y) * width + (bx * blockSize + x)] - 128;
        }
      }
      
      // Perform 2D DCT
      const dctBlock = new Float32Array(blockSize * blockSize);
      for (let u = 0; u < blockSize; u++) {
        for (let v = 0; v < blockSize; v++) {
          let sum = 0;
          const cu = u === 0 ? 1 / Math.SQRT2 : 1;
          const cv = v === 0 ? 1 / Math.SQRT2 : 1;
          
          for (let y = 0; y < blockSize; y++) {
            for (let x = 0; x < blockSize; x++) {
              sum += block[y * blockSize + x] * cosTable[u * blockSize + y] * cosTable[v * blockSize + x];
            }
          }
          dctBlock[u * blockSize + v] = (1/4) * cu * cv * sum;
        }
      }
      
      // Analyze DCT coefficients
      dcValues.push(dctBlock[0]);
      
      let acEnergy = 0;
      let highFreqEnergy = 0;
      let lowFreqEnergy = 0;
      
      for (let u = 0; u < blockSize; u++) {
        for (let v = 0; v < blockSize; v++) {
          if (u === 0 && v === 0) continue;
          const coeff = Math.abs(dctBlock[u * blockSize + v]);
          acEnergy += coeff * coeff;
          
          if (u + v >= 8) highFreqEnergy += coeff * coeff;
          else lowFreqEnergy += coeff * coeff;
        }
      }
      
      acEnergies.push(acEnergy);
      highFreqRatios.push(acEnergy > 0 ? highFreqEnergy / acEnergy : 0);
      lowFreqRatios.push(acEnergy > 0 ? lowFreqEnergy / acEnergy : 0);
    }
  }
  
  // Statistical analysis
  const meanAC = acEnergies.reduce((a, b) => a + b, 0) / acEnergies.length;
  const varAC = acEnergies.reduce((a, b) => a + (b - meanAC) ** 2, 0) / acEnergies.length;
  const stdAC = Math.sqrt(varAC);
  const cvAC = meanAC > 0 ? stdAC / meanAC : 0;
  
  const meanHFR = highFreqRatios.reduce((a, b) => a + b, 0) / highFreqRatios.length;
  const meanLFR = lowFreqRatios.reduce((a, b) => a + b, 0) / lowFreqRatios.length;
  
  // Check for double compression artifacts (periodic patterns in DCT histograms)
  // Use coarse quantization to avoid counting normal JPEG variability as periodic gaps.
  const quantizedDC = dcValues.map(v => Math.round(v / 4));
  const dcHistogram = {};
  quantizedDC.forEach(v => { dcHistogram[v] = (dcHistogram[v] || 0) + 1; });
  
  // Check for periodic gaps (sign of double compression)
  const dcHist = Object.entries(dcHistogram).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  let periodicGaps = 0;
  for (let i = 1; i < dcHist.length - 1; i++) {
    const prev = parseInt(dcHist[i - 1][0]);
    const curr = parseInt(dcHist[i][0]);
    const next = parseInt(dcHist[i + 1][0]);
    if (curr - prev > 1 && next - curr > 1) periodicGaps++;
  }
  const periodicGapRatio = dcHist.length > 0 ? periodicGaps / dcHist.length : 0;
  
  // Scoring
  let score = 0;
  
  // Very low high-frequency content can happen in compressed/blurred photos; keep this conservative.
  if (meanHFR < 0.035) score += 20;
  else if (meanHFR < 0.06) score += 10;
  else if (meanHFR < 0.09) score += 5;
  if (meanLFR > 0.95 && meanHFR < 0.06) score += 6;
  
  // Unusual AC energy variance suggests manipulation
  if (cvAC > 3.5) score += 20;
  else if (cvAC > 2.4) score += 12;
  else if (cvAC > 1.5) score += 8;
  
  // Double compression indicators (require enough blocks and pronounced periodicity)
  if (acEnergies.length > 800) {
    if (periodicGaps > 16 && periodicGapRatio > 0.20) score += 25;
    else if (periodicGaps > 10 && periodicGapRatio > 0.14) score += 15;
    else if (periodicGaps > 6 && periodicGapRatio > 0.10) score += 8;
  }
  
  // Very uniform AC energy (AI tendency)
  if (cvAC < 0.22 && meanHFR < 0.10) score += 10;
  
  score = Math.min(100, score);
  const confidence = Math.min(1, 0.4 + Math.abs(cvAC - 1) / 5);
  
  let details;
  if (score >= 60) {
    details = `DCT analysis reveals significant frequency anomalies. High-freq ratio: ${(meanHFR * 100).toFixed(1)}%, AC variance CV: ${cvAC.toFixed(2)}. ${periodicGaps > 2 ? 'Double-compression artifacts detected.' : 'Abnormal frequency distribution suggests AI generation.'}`;
  } else if (score >= 30) {
    details = `Some DCT irregularities detected. High-freq ratio: ${(meanHFR * 100).toFixed(1)}%, AC variance CV: ${cvAC.toFixed(2)}. Minor compression inconsistencies found.`;
  } else {
    details = `DCT frequency distribution appears normal. High-freq ratio: ${(meanHFR * 100).toFixed(1)}%, AC variance CV: ${cvAC.toFixed(2)}. Consistent with a natural photograph.`;
  }
  
  return {
    score,
    confidence,
    details,
    stats: { meanHFR: (meanHFR * 100).toFixed(1) + '%', meanLFR: (meanLFR * 100).toFixed(1) + '%', cvAC: cvAC.toFixed(3), periodicGaps, blocksAnalyzed: acEnergies.length }
  };
}
