/**
 * Image Describer
 * Client-side visual analysis to describe what an image appears to depict.
 * No external API — uses pixel statistics, color profile, edge density, and saturation.
 */

export function describeImage(imageData, width, height, filename = '') {
  const data = imageData.data;
  const pixelCount = width * height;

  // ── Color stats ──────────────────────────────────────────────────────────
  let rSum = 0, gSum = 0, bSum = 0;
  let totalSat = 0, totalBright = 0;
  let highSatCount = 0, darkCount = 0, lightCount = 0;
  const step = Math.max(1, Math.floor(pixelCount / 40000));

  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    rSum += r; gSum += g; bSum += b;
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const bright = max;
    const sat = max > 0 ? (max - min) / max : 0;
    totalSat += sat;
    totalBright += bright;
    if (sat > 0.6) highSatCount++;
    if (bright < 0.25) darkCount++;
    if (bright > 0.85) lightCount++;
  }

  const sampledPixels = Math.ceil(pixelCount / step);
  const avgR = rSum / sampledPixels;
  const avgG = gSum / sampledPixels;
  const avgB = bSum / sampledPixels;
  const avgSat = totalSat / sampledPixels;
  const avgBright = totalBright / sampledPixels;
  const highSatRatio = highSatCount / sampledPixels;
  const darkRatio = darkCount / sampledPixels;
  const lightRatio = lightCount / sampledPixels;

  // ── Dominant hue ─────────────────────────────────────────────────────────
  const dominantColor = getDominantHue(avgR, avgG, avgB, avgSat);

  // ── Edge density (approx) ─────────────────────────────────────────────────
  const gray = new Float32Array(width * height);
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  let edgeCount = 0, edgeSample = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const gx = gray[y * width + x + 1] - gray[y * width + x - 1];
      const gy = gray[(y + 1) * width + x] - gray[(y - 1) * width + x];
      if (Math.sqrt(gx * gx + gy * gy) > 25) edgeCount++;
      edgeSample++;
    }
  }
  const edgeDensity = edgeSample > 0 ? edgeCount / edgeSample : 0;

  // ── Aspect ratio ─────────────────────────────────────────────────────────
  const aspectRatio = width / height;

  // ── Style detection ───────────────────────────────────────────────────────
  const isAnimeStyle = avgSat > 0.45 && highSatRatio > 0.25 && edgeDensity < 0.25;
  const isDigitalArt = avgSat > 0.38 && highSatRatio > 0.18 && edgeDensity < 0.35;
  const isDark = avgBright < 0.35;
  const isBright = avgBright > 0.65;
  const isMonochrome = avgSat < 0.08;
  const isScreenshot = lightRatio > 0.55 && avgSat < 0.25 && edgeDensity > 0.15;
  const isPortrait = aspectRatio > 0.6 && aspectRatio < 1.6 && !isScreenshot;
  const isWide = aspectRatio > 1.7;
  const isTall = aspectRatio < 0.7;

  // ── Subject guess ─────────────────────────────────────────────────────────
  let subjectGuess = '';
  if (isScreenshot) {
    subjectGuess = 'Screenshot / UI / Document';
  } else if (isAnimeStyle || isDigitalArt) {
    if (isTall) subjectGuess = 'Anime/Digital Art — Character Portrait';
    else if (isWide) subjectGuess = 'Anime/Digital Art — Scene / Landscape';
    else subjectGuess = 'Anime/Digital Art — Character or Scene';
  } else if (isDark && edgeDensity > 0.2) {
    subjectGuess = isWide ? 'Nighttime / Dark Scene or Landscape' : 'Dark Portrait or Indoor Scene';
  } else if (isBright && avgSat < 0.2) {
    subjectGuess = 'Document, Text, or Bright Indoor Scene';
  } else if (isMonochrome) {
    subjectGuess = 'Black & White Photograph';
  } else if (avgG > avgR + 10 && avgG > avgB + 10) {
    subjectGuess = isWide ? 'Outdoor Landscape / Nature Scene' : 'Nature / Greenery';
  } else if (avgB > avgR + 15 && avgB > avgG + 10) {
    subjectGuess = isWide ? 'Sky / Water / Outdoor Scene' : 'Indoor or Outdoor with Blue Tones';
  } else if (isPortrait && edgeDensity > 0.15 && edgeDensity < 0.4) {
    subjectGuess = 'Portrait / Person';
  } else {
    subjectGuess = isWide ? 'Landscape / Wide-angle Scene' : 'General Photograph';
  }

  // ── Style label ──────────────────────────────────────────────────────────
  let styleLabel = '';
  if (isAnimeStyle) styleLabel = '🎨 Anime / AI Art Style';
  else if (isDigitalArt) styleLabel = '🖌️ Digital Art / Illustration';
  else if (isScreenshot) styleLabel = '🖥️ Screenshot / Digital Document';
  else if (isMonochrome) styleLabel = '⬛ Monochrome / Black & White';
  else styleLabel = '📷 Photographic';

  // ── Mood ─────────────────────────────────────────────────────────────────
  let mood = '';
  if (isDark) mood = 'Dark & moody';
  else if (isBright && highSatRatio > 0.3) mood = 'Vibrant & colorful';
  else if (isBright) mood = 'Bright & airy';
  else if (highSatRatio > 0.25) mood = 'Colorful & saturated';
  else mood = 'Neutral tones';

  // ── Dominant colors (top 5 sampled palette) ──────────────────────────────
  const palette = samplePalette(data, pixelCount);

  return {
    subject: subjectGuess,
    style: styleLabel,
    mood,
    dominantColor,
    palette,
    isAnimeOrAIArt: isAnimeStyle || isDigitalArt,
    stats: {
      avgSat: avgSat.toFixed(2),
      avgBright: avgBright.toFixed(2),
      edgeDensity: edgeDensity.toFixed(3),
      aspectRatio: aspectRatio.toFixed(2),
    }
  };
}

function getDominantHue(r, g, b, sat) {
  if (sat < 0.08) return 'Neutral / Gray';
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta < 5) return 'Neutral / Gray';
  let hue;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  if (hue < 20 || hue >= 340) return 'Red';
  if (hue < 45) return 'Orange';
  if (hue < 70) return 'Yellow';
  if (hue < 160) return 'Green';
  if (hue < 200) return 'Cyan';
  if (hue < 260) return 'Blue';
  if (hue < 290) return 'Purple';
  return 'Pink / Magenta';
}

function samplePalette(data, pixelCount) {
  // Sample 8 representative colors using a grid
  const palette = [];
  const gridSize = 4;
  // Simple: sample top-left, top-right, center, bottom-left, bottom-right and a few mid points
  const sampleIndices = [
    Math.floor(pixelCount * 0.05),
    Math.floor(pixelCount * 0.20),
    Math.floor(pixelCount * 0.35),
    Math.floor(pixelCount * 0.50),
    Math.floor(pixelCount * 0.65),
    Math.floor(pixelCount * 0.80),
  ];
  for (const idx of sampleIndices) {
    const i = idx * 4;
    palette.push({
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
      hex: `#${data[i].toString(16).padStart(2, '0')}${data[i + 1].toString(16).padStart(2, '0')}${data[i + 2].toString(16).padStart(2, '0')}`
    });
  }
  return palette;
}
