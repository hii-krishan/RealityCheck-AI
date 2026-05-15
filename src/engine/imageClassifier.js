/**
 * imageClassifier.js
 * Uses @xenova/transformers (BLIP) for real image captioning in the browser.
 * Generates natural sentences like "a pineapple with a face drawn on it".
 * Model downloads ~90MB on first use, then is cached by the browser.
 */

let pipelinePromise = null;

async function getPipeline() {
  if (!pipelinePromise) {
    const { pipeline, env } = await import('@xenova/transformers');
    // Use local model cache; allow remote downloads
    env.allowLocalModels = false;
    pipelinePromise = pipeline('image-to-text', 'Xenova/blip-image-captioning-base');
  }
  return pipelinePromise;
}

/**
 * Generate a natural-language caption for an image element.
 * @param {HTMLImageElement} imgElement
 * @returns {Promise<string>} caption text e.g. "a pineapple with a face drawn on it"
 */
export async function captionImage(imgElement) {
  try {
    // Draw the image onto a canvas and get its data URL
    const canvas = document.createElement('canvas');
    const maxDim = 448;
    let w = imgElement.naturalWidth || imgElement.width;
    let h = imgElement.naturalHeight || imgElement.height;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(imgElement, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    const captioner = await getPipeline();
    const output = await captioner(dataUrl, { max_new_tokens: 60 });
    const raw = output?.[0]?.generated_text || '';
    return raw.trim();
  } catch (err) {
    console.error('BLIP captioning failed:', err);
    return '';
  }
}

/**
 * Build a well-formed description sentence from the BLIP caption + style context.
 * @param {string} caption  - raw BLIP output e.g. "a pineapple with a face drawn on it"
 * @param {Object} styleInfo - from imageDescriber { style, subject, mood, isAnimeOrAIArt }
 * @returns {{ headline: string, details: string }}
 */
export function buildDescription(caption, styleInfo) {
  let headline = '';
  let details = '';

  if (caption) {
    // Capitalize and end with period
    const clean = caption.charAt(0).toUpperCase() + caption.slice(1);
    headline = clean.endsWith('.') ? clean : `${clean}.`;
  }

  // Prepend AI/style context if detected
  if (styleInfo?.isAnimeOrAIArt) {
    headline = headline
      ? `AI-generated / digital art — ${headline.charAt(0).toLowerCase() + headline.slice(1)}`
      : 'AI-generated or digital art image.';
  } else if (!headline) {
    headline = styleInfo?.subject || 'Image content could not be determined.';
  }

  // Detail line
  const parts = [];
  if (styleInfo?.style) parts.push(styleInfo.style);
  if (styleInfo?.mood) parts.push(styleInfo.mood);
  if (parts.length) details = parts.join(' · ') + '.';

  return { headline, details };
}
