/**
 * Main Analyzer — Orchestrates all 8 forensic techniques
 */

import { performELA } from './techniques/errorLevelAnalysis';
import { performNoiseAnalysis } from './techniques/noiseAnalysis';
import { performDCTAnalysis } from './techniques/dctAnalysis';
import { performEXIFAnalysis } from './techniques/exifParser';
import { performColorHistogramAnalysis } from './techniques/colorHistogram';
import { performEdgeCoherenceAnalysis } from './techniques/edgeCoherence';
import { performTextureAnalysis } from './techniques/textureAnalysis';
import { performCloneDetection } from './techniques/cloneDetection';
import { calculateFinalScore } from './scoring';
import { describeImage } from './imageDescriber';

const TECHNIQUES = [
  { key: 'exif',    name: 'EXIF Metadata',       icon: '📋' },
  { key: 'ela',     name: 'Error Level Analysis', icon: '🔥' },
  { key: 'noise',   name: 'Noise Pattern',        icon: '📡' },
  { key: 'dct',     name: 'DCT Frequency',        icon: '📊' },
  { key: 'color',   name: 'Color Histogram',       icon: '🎨' },
  { key: 'edge',    name: 'Edge Coherence',        icon: '🔲' },
  { key: 'texture', name: 'Texture Consistency',   icon: '🧩' },
  { key: 'clone',   name: 'Clone Detection',       icon: '🔍' },
];

export { TECHNIQUES };

export async function analyzeImage(file, onProgress) {
  const results = {};
  
  // Load image to canvas
  const img = await loadImage(file);
  const { ctx, width, height } = createCanvas(img);
  const imageData = ctx.getImageData(0, 0, width, height);
  
  // Run each technique sequentially with progress updates
  for (let i = 0; i < TECHNIQUES.length; i++) {
    const tech = TECHNIQUES[i];
    onProgress?.(i, TECHNIQUES.length, tech.name);
    
    try {
      switch (tech.key) {
        case 'exif':
          results.exif = await performEXIFAnalysis(file);
          break;
        case 'ela':
          results.ela = await performELA(imageData, width, height);
          break;
        case 'noise':
          results.noise = performNoiseAnalysis(imageData, width, height);
          break;
        case 'dct':
          results.dct = performDCTAnalysis(imageData, width, height);
          break;
        case 'color':
          results.color = performColorHistogramAnalysis(imageData, width, height);
          break;
        case 'edge':
          results.edge = performEdgeCoherenceAnalysis(imageData, width, height);
          break;
        case 'texture':
          results.texture = performTextureAnalysis(imageData, width, height);
          break;
        case 'clone':
          results.clone = performCloneDetection(imageData, width, height);
          break;
      }
    } catch (err) {
      console.error(`Error in ${tech.name}:`, err);
      results[tech.key] = { score: 0, confidence: 0, details: `Analysis failed: ${err.message}` };
    }
    
    // Small delay to let UI update
    await new Promise(r => setTimeout(r, 50));
  }
  
  onProgress?.(TECHNIQUES.length, TECHNIQUES.length, 'Complete');
  
  const imageDescription = describeImage(imageData, width, height, file.name);
  // Detect composite/fantasy images before calibration
  imageDescription.isComposite = detectCompositeScene(imageData, width, height, imageDescription);
  const calibratedResults = applyTechniqueCalibration(results, imageDescription);
  const baseFinal = calculateFinalScore(calibratedResults);
  const styleAdjusted = applyStyleAwareVerdict(baseFinal, imageDescription);
  const final = applyPhotographicRescue(styleAdjusted, calibratedResults, imageDescription);
  return { results: calibratedResults, ...final, imageWidth: width, imageHeight: height, imageDescription };
}

function applyTechniqueCalibration(results, imageDescription) {
  // Disable calibration - use raw scores from techniques
  return results;
}

function applyStyleAwareVerdict(final, imageDescription) {
  // Re-enable composite detection: obvious composites should be flagged
  // Even if individual techniques score low, mixed warm+cool colors or spliced elements = morphed
  if (imageDescription.isComposite) {
    // Composite detected → escalate to suspicious regardless of score
    return {
      ...final,
      finalScore: Math.max(final.finalScore, 75), // At least suspicious
      verdict: 'SUSPICIOUS — COMPOSITE IMAGE DETECTED',
      verdictClass: 'suspicious'
    };
  }
  return final;
}

function applyPhotographicRescue(final, results, imageDescription) {
  // Disable rescue function - use raw verdict from scoring
  return final;
}

/**
 * Composite scene detector.
 * Key insight: real photos have a cohesive color temperature (all warm, all cool, or neutral).
 * Composites splice elements from different scenes → both warm AND cool dominant colors coexist.
 *
 * E.g. shark-bottle: warm sunset orange + cool underwater blue = composite ✓
 *      Virat Kohli: warm red jersey + skin + dark background = all warm family ✗
 *
 * Notes:
 * - Purple twilight (hue ~270–300°) used to fall in neither bucket while still counting toward
 *   totalSatPx, which suppressed warm/cool ratios — fixed by classifying violet–magenta sky.
 * - Small embedded cool regions (turquoise water in a bottle) can be a tiny fraction of all
 *   saturated pixels; a coarse grid finds localized “cool islands” on a warm/dark frame.
 */
function detectCompositeScene(imageData, width, height, imageDesc) {
  const data = imageData.data;
  const pixelCount = width * height;

  let warmSatPx = 0;
  let coolSatPx = 0;
  let totalSatPx = 0;
  const step = Math.max(1, Math.floor(pixelCount / 20000));
  const gridN = 4;
  const cellSat = new Array(gridN * gridN).fill(0);
  const cellCool = new Array(gridN * gridN).fill(0);

  for (let p = 0; p < pixelCount; p += step) {
    const i = p * 4;
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const sat = mx > 0 ? (mx - mn) / mx : 0;
    if (sat < 0.28 || mx < 0.18) continue;

    const delta = mx - mn;
    if (delta === 0) continue;

    let hue;
    if (mx === r) hue = (((g - b) / delta) % 6) * 60;
    else if (mx === g) hue = ((b - r) / delta + 2) * 60;
    else hue = ((r - g) / delta + 4) * 60;
    if (hue < 0) hue += 360;

    // Warm: red / orange / yellow, plus magenta–violet sky (HSV “purple” sits between blue and magenta).
    // Cool: green / cyan / blue (water, foliage, screen UI blues).
    let family = 'neutral';
    if (hue <= 88 || hue >= 292) family = 'warm';
    else if (hue >= 145 && hue <= 275) family = 'cool';
    else if (hue > 275 && hue < 292) {
      // Blue-violet vs red-violet: if red channel dominates the non-max spread, treat as warm sunset purple.
      const isRedHeavyViolet = r >= b * 0.92 && r > g;
      family = isRedHeavyViolet ? 'warm' : 'cool';
    }

    const x = p % width;
    const y = Math.floor(p / width);
    const cw = width / gridN;
    const ch = height / gridN;
    const cx = Math.min(gridN - 1, Math.floor(x / cw));
    const cy = Math.min(gridN - 1, Math.floor(y / ch));
    const ci = cy * gridN + cx;

    totalSatPx++;
    if (family === 'warm') {
      warmSatPx++;
      cellSat[ci]++;
    } else if (family === 'cool') {
      coolSatPx++;
      cellSat[ci]++;
      cellCool[ci]++;
    } else {
      cellSat[ci]++;
    }
  }

  if (totalSatPx < 200) return false;

  const warmRatio = warmSatPx / totalSatPx;
  const coolRatio = coolSatPx / totalSatPx;

  let maxCellCoolRatio = 0;
  for (let c = 0; c < gridN * gridN; c++) {
    if (cellSat[c] < 12) continue;
    const r = cellCool[c] / cellSat[c];
    if (r > maxCellCoolRatio) maxCellCoolRatio = r;
  }

  // Global: strong warm + strong cool in the same frame (evenly mixed composites).
  const globalMultiHue =
    warmRatio >= 0.17 && coolRatio >= 0.17 && coolRatio >= 0.2;

  // Localized cool “island” on an otherwise warm-heavy image (bottle of water, pasted UI, etc.).
  const localizedCoolPatch =
    warmRatio >= 0.24 &&
    coolRatio >= 0.055 &&
    maxCellCoolRatio >= 0.46 &&
    coolSatPx >= 180;

  return globalMultiHue || localizedCoolPatch;
}


function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

function createCanvas(img) {
  const maxDim = 1200;
  let width = img.width;
  let height = img.height;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create image canvas');
  ctx.drawImage(img, 0, 0, width, height);
  return { ctx, width, height };
}
