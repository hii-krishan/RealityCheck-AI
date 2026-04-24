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
  const { canvas, ctx, width, height } = createCanvas(img);
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
  
  const final = calculateFinalScore(results);
  return { results, ...final, imageWidth: width, imageHeight: height };
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
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, ctx, width, height };
}
