export function normalizeBinaryLabel(raw) {
  if (!raw) return null;
  const label = String(raw).trim().toLowerCase();

  const positive = new Set([
    '1', 'true', 'yes', 'y',
    'fake', 'manipulated', 'edited', 'ai', 'deepfake',
    'scam', 'phishing', 'unsafe', 'malicious', 'dangerous', 'suspicious'
  ]);

  const negative = new Set([
    '0', 'false', 'no', 'n',
    'real', 'authentic', 'safe', 'legit', 'legitimate', 'genuine', 'benign'
  ]);

  if (positive.has(label)) return true;
  if (negative.has(label)) return false;
  return null;
}

export function computeBinaryMetrics(samples) {
  const valid = samples.filter(s => typeof s.expected === 'boolean' && typeof s.predicted === 'boolean');

  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const s of valid) {
    if (s.expected && s.predicted) tp++;
    else if (!s.expected && !s.predicted) tn++;
    else if (!s.expected && s.predicted) fp++;
    else fn++;
  }

  const total = valid.length;
  const accuracy = total > 0 ? (tp + tn) / total : 0;
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    total,
    tp,
    tn,
    fp,
    fn,
    accuracy,
    precision,
    recall,
    f1,
  };
}

export function formatPct(value) {
  return `${(value * 100).toFixed(2)}%`;
}
