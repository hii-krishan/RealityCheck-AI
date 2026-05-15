/**
 * EXIF Metadata Parser & Inspector
 * Reads JPEG EXIF data from scratch — checks for camera model, GPS, timestamps, software tags.
 * AI-generated images typically have no or synthetic EXIF data.
 */

export function performEXIFAnalysis(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target.result;
      const exif = parseEXIF(buffer);
      const analysis = analyzeEXIF(exif);
      resolve(analysis);
    };
    reader.onerror = () => {
      resolve({
        score: 50,
        confidence: 0.3,
        details: 'Could not read file for EXIF analysis.',
        stats: {}
      });
    };
    reader.readAsArrayBuffer(file);
  });
}

function parseEXIF(buffer) {
  const view = new DataView(buffer);
  const tags = {};
  if (view.byteLength < 4) {
    return { hasEXIF: false, tags, format: 'unknown' };
  }
  
  // Check for JPEG SOI marker
  if (view.getUint16(0) !== 0xFFD8) {
    return { hasEXIF: false, tags, format: 'not-jpeg' };
  }
  
  // Find APP1 (EXIF) marker
  let offset = 2;
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset);
    
    if (marker === 0xFFE1) { // APP1 - EXIF
      const length = view.getUint16(offset + 2);
      const exifStart = offset + 4;
      
      // Check for "Exif\0\0" header
      const exifHeader = String.fromCharCode(
        view.getUint8(exifStart), view.getUint8(exifStart + 1),
        view.getUint8(exifStart + 2), view.getUint8(exifStart + 3)
      );
      
      if (exifHeader === 'Exif') {
        const tiffStart = exifStart + 6;
        const byteOrder = view.getUint16(tiffStart);
        const littleEndian = byteOrder === 0x4949; // 'II'
        
        // Read IFD0 offset
        const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
        readIFD(view, tiffStart, tiffStart + ifdOffset, littleEndian, tags);
        
        return { hasEXIF: true, tags, format: 'jpeg' };
      }
      
      offset += 2 + length;
    } else if ((marker & 0xFF00) === 0xFF00) {
      if (marker === 0xFFDA) break; // Start of scan, stop
      const segLength = view.getUint16(offset + 2);
      offset += 2 + segLength;
    } else {
      offset++;
    }
  }
  
  return { hasEXIF: false, tags, format: 'jpeg' };
}

function readIFD(view, tiffStart, ifdStart, littleEndian, tags) {
  try {
    const entries = view.getUint16(ifdStart, littleEndian);
    
    const TAG_NAMES = {
      0x010F: 'Make',
      0x0110: 'Model',
      0x0112: 'Orientation',
      0x011A: 'XResolution',
      0x011B: 'YResolution',
      0x0131: 'Software',
      0x0132: 'DateTime',
      0x013B: 'Artist',
      0x8769: 'ExifIFD',
      0x8825: 'GPSIFD',
      0x9003: 'DateTimeOriginal',
      0x9004: 'DateTimeDigitized',
      0x920A: 'FocalLength',
      0xA001: 'ColorSpace',
      0xA002: 'PixelXDimension',
      0xA003: 'PixelYDimension',
      0xA430: 'CameraOwnerName',
      0xA431: 'BodySerialNumber',
      0xA432: 'LensInfo',
      0xA433: 'LensMake',
      0xA434: 'LensModel',
    };
    
    for (let i = 0; i < Math.min(entries, 100); i++) {
      const entryOffset = ifdStart + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;
      
      const tagId = view.getUint16(entryOffset, littleEndian);
      const type = view.getUint16(entryOffset + 2, littleEndian);
      const count = view.getUint32(entryOffset + 4, littleEndian);
      
      const tagName = TAG_NAMES[tagId] || `Tag_0x${tagId.toString(16)}`;
      
      // Read ASCII string values
      if (type === 2 && count < 500) { // ASCII
        let strOffset;
        if (count <= 4) {
          strOffset = entryOffset + 8;
        } else {
          strOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
        }
        if (strOffset + count <= view.byteLength) {
          let str = '';
          for (let j = 0; j < count - 1; j++) {
            str += String.fromCharCode(view.getUint8(strOffset + j));
          }
          tags[tagName] = str.trim();
        }
      }
      // Read SHORT values
      else if (type === 3) {
        tags[tagName] = view.getUint16(entryOffset + 8, littleEndian);
      }
      // Read LONG values
      else if (type === 4) {
        tags[tagName] = view.getUint32(entryOffset + 8, littleEndian);
      }
      
      // Handle sub-IFDs
      if (tagId === 0x8769 || tagId === 0x8825) {
        const subIFDOffset = view.getUint32(entryOffset + 8, littleEndian);
        if (tiffStart + subIFDOffset < view.byteLength) {
          readIFD(view, tiffStart, tiffStart + subIFDOffset, littleEndian, tags);
        }
        if (tagId === 0x8825) tags._hasGPS = true;
      }
    }
  } catch {
    // Silently fail on malformed EXIF
  }
}

function analyzeEXIF(exif) {
  let score = 0;
  const findings = [];
  
  if (!exif.hasEXIF) {
    if (exif.format === 'jpeg') {
      score += 5;
      findings.push('No EXIF metadata found (common for social media photos)');
    } else {
      score += 3;
      findings.push('No EXIF metadata found');
    }
  } else {
    const tags = exif.tags;
    
    // Check for camera info
    if (!tags.Make && !tags.Model) {
      score += 10;
      findings.push('No camera make/model info');
    } else {
      findings.push(`Camera: ${tags.Make || 'Unknown'} ${tags.Model || ''}`);
    }
    
    // Check for timestamps
    if (!tags.DateTime && !tags.DateTimeOriginal) {
      score += 5;
      findings.push('No timestamp data');
    } else {
      findings.push(`Date: ${tags.DateTimeOriginal || tags.DateTime}`);
    }
    
    // Check for software tags (editing software)
    if (tags.Software) {
      const sw = tags.Software.toLowerCase();
      const aiSoftware = ['midjourney', 'dall-e', 'stable diffusion', 'comfyui', 'automatic1111', 'novelai'];
      const editingSoftware = ['photoshop', 'gimp', 'lightroom', 'canva', 'pixlr', 'snapseed', 'afterlight'];
      
      if (aiSoftware.some(s => sw.includes(s))) {
        score += 60;
        findings.push(`AI generation software DETECTED: ${tags.Software}`);
      } else if (editingSoftware.some(s => sw.includes(s))) {
        score += 8;
        findings.push(`Editing software: ${tags.Software}`);
      } else {
        findings.push(`Software: ${tags.Software}`);
      }
    }
    
    // GPS data
    if (tags._hasGPS) {
      score -= 8;
      findings.push('GPS location data present');
    }
    
    // Lens info
    if (tags.LensModel || tags.LensMake) {
      score -= 3;
      findings.push(`Lens: ${tags.LensMake || ''} ${tags.LensModel || ''}`);
    }
  }
  
  score = Math.max(0, Math.min(100, score));
  // Very low confidence since EXIF is unreliable
  const confidence = exif.hasEXIF ? 0.35 : exif.format === 'jpeg' ? 0.15 : 0.10;
  
  let details = findings.join('. ') + '.';
  
  return {
    score,
    confidence,
    details,
    stats: {
      hasEXIF: exif.hasEXIF,
      tagCount: Object.keys(exif.tags).length,
      findings
    }
  };
}
