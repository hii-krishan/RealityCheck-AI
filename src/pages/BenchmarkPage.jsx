import { useMemo, useState } from 'react';
import { analyzeImage } from '../engine/analyzer';
import { checkLink } from '../tools/linkChecker';
import { analyzeMessage } from '../tools/scamDetector';
import { computeBinaryMetrics, formatPct, normalizeBinaryLabel } from '../tools/benchmarkMetrics';

function parseLabeledLines(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const tabParts = line.split('\t');
      const parts = tabParts.length >= 2 ? tabParts : line.split(',');
      if (parts.length < 2) {
        return { index: idx + 1, error: 'Missing label/value separator' };
      }

      const rawLabel = parts[0].trim();
      const value = parts.slice(1).join(tabParts.length >= 2 ? '\t' : ',').trim();
      const expected = normalizeBinaryLabel(rawLabel);
      if (expected === null) {
        return { index: idx + 1, error: `Unknown label: ${rawLabel}` };
      }
      if (!value) {
        return { index: idx + 1, error: 'Empty value' };
      }
      return { index: idx + 1, expected, value };
    });
}

function inferImageLabelFromFileName(name) {
  const lower = name.toLowerCase();
  if (/(fake|ai|deepfake|manip|edited|composite|morph)/.test(lower)) return true;
  if (/(real|authentic|original|camera)/.test(lower)) return false;
  return null;
}

function extractQRPrediction(decodedData) {
  if (!decodedData) return true;
  if (!/^https?:\/\//i.test(decodedData)) return false;
  const linkResult = checkLink(decodedData);
  return linkResult?.riskClass !== 'safe';
}

function MetricsCard({ title, report }) {
  if (!report) return null;

  return (
    <div className="card mt-2">
      <h3 style={{ marginBottom: '0.8rem' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '10px' }}>
        <div className="card"><strong>Accuracy</strong><div>{formatPct(report.accuracy)}</div></div>
        <div className="card"><strong>Precision</strong><div>{formatPct(report.precision)}</div></div>
        <div className="card"><strong>Recall</strong><div>{formatPct(report.recall)}</div></div>
        <div className="card"><strong>F1 Score</strong><div>{formatPct(report.f1)}</div></div>
      </div>
      <div className="mt-2" style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
        Samples: {report.total} | TP: {report.tp} | TN: {report.tn} | FP: {report.fp} | FN: {report.fn}
      </div>
    </div>
  );
}

export default function BenchmarkPage() {
  const [imageFiles, setImageFiles] = useState([]);
  const [imageRunning, setImageRunning] = useState(false);
  const [imageProgress, setImageProgress] = useState('');
  const [imageMetrics, setImageMetrics] = useState(null);

  const [qrFiles, setQrFiles] = useState([]);
  const [qrRunning, setQrRunning] = useState(false);
  const [qrProgress, setQrProgress] = useState('');
  const [qrMetrics, setQrMetrics] = useState(null);

  const [linkText, setLinkText] = useState('safe\thttps://google.com\nunsafe\thttp://amaz0n.xyz/login');
  const [linkMetrics, setLinkMetrics] = useState(null);
  const [linkErrors, setLinkErrors] = useState([]);

  const [scamText, setScamText] = useState('safe\tHi, your order has shipped from amazon.in\nscam\tURGENT! Verify KYC now at http://paytim.click/kyc');
  const [scamMetrics, setScamMetrics] = useState(null);
  const [scamErrors, setScamErrors] = useState([]);

  const combinedMetrics = useMemo(() => {
    const rows = [];
    const pushRows = (metrics) => {
      if (!metrics) return;
      for (let i = 0; i < metrics.tp; i++) rows.push({ expected: true, predicted: true });
      for (let i = 0; i < metrics.tn; i++) rows.push({ expected: false, predicted: false });
      for (let i = 0; i < metrics.fp; i++) rows.push({ expected: false, predicted: true });
      for (let i = 0; i < metrics.fn; i++) rows.push({ expected: true, predicted: false });
    };
    pushRows(imageMetrics);
    pushRows(qrMetrics);
    pushRows(linkMetrics);
    pushRows(scamMetrics);
    return rows.length ? computeBinaryMetrics(rows) : null;
  }, [imageMetrics, qrMetrics, linkMetrics, scamMetrics]);

  const runLinkBenchmark = () => {
    const parsed = parseLabeledLines(linkText);
    const errors = parsed.filter(p => p.error);
    setLinkErrors(errors);
    const rows = parsed
      .filter(p => !p.error)
      .map(p => {
        const out = checkLink(p.value);
        return { expected: p.expected, predicted: out?.riskClass !== 'safe' };
      });

    setLinkMetrics(computeBinaryMetrics(rows));
  };

  const runScamBenchmark = () => {
    const parsed = parseLabeledLines(scamText);
    const errors = parsed.filter(p => p.error);
    setScamErrors(errors);
    const rows = parsed
      .filter(p => !p.error)
      .map(p => {
        const out = analyzeMessage(p.value);
        return { expected: p.expected, predicted: out?.riskClass !== 'safe' };
      });

    setScamMetrics(computeBinaryMetrics(rows));
  };

  const loadImageFile = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });

  const runImageBenchmark = async () => {
    const labeled = imageFiles
      .map(file => ({ file, expected: inferImageLabelFromFileName(file.name) }))
      .filter(row => row.expected !== null);

    if (!labeled.length) {
      setImageProgress('No labeled images found. Use filenames containing real/authentic or fake/ai/manipulated.');
      setImageMetrics(null);
      return;
    }

    setImageRunning(true);
    setImageProgress(`Running ${labeled.length} images...`);
    const rows = [];

    for (let i = 0; i < labeled.length; i++) {
      const { file, expected } = labeled[i];
      setImageProgress(`Analyzing image ${i + 1}/${labeled.length}: ${file.name}`);
      try {
        const out = await analyzeImage(file);
        rows.push({ expected, predicted: out.verdictClass !== 'authentic' });
      } catch {
        rows.push({ expected, predicted: true });
      }
    }

    setImageMetrics(computeBinaryMetrics(rows));
    setImageProgress(`Completed ${labeled.length} image samples.`);
    setImageRunning(false);
  };

  const runQRBenchmark = async () => {
    const jsQR = (await import('jsqr')).default;
    const labeled = qrFiles
      .map(file => ({ file, expected: inferImageLabelFromFileName(file.name) }))
      .filter(row => row.expected !== null);

    if (!labeled.length) {
      setQrProgress('No labeled QR images found. Use filenames containing safe/real or unsafe/fake/scam.');
      setQrMetrics(null);
      return;
    }

    setQrRunning(true);
    setQrProgress(`Running ${labeled.length} QR samples...`);
    const rows = [];

    for (let i = 0; i < labeled.length; i++) {
      const { file, expected } = labeled[i];
      setQrProgress(`Analyzing QR ${i + 1}/${labeled.length}: ${file.name}`);

      try {
        const img = await loadImageFile(file);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        const predicted = extractQRPrediction(code?.data || '');
        rows.push({ expected, predicted });
      } catch {
        rows.push({ expected, predicted: true });
      }
    }

    setQrMetrics(computeBinaryMetrics(rows));
    setQrProgress(`Completed ${labeled.length} QR samples.`);
    setQrRunning(false);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">📈 Evaluation</div>
        <h1>Benchmark All Analyzers</h1>
        <p>Measure accuracy, precision, recall, and F1 for Image, Link, QR, and Scam analyzers.</p>
      </div>

      <div className="card">
        <h3>Dataset Label Rules</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Positive class is unsafe/manipulated/scam. Negative class is safe/real.
          For image and QR files, label by filename: include terms like fake/ai/manipulated/scam or real/authentic/safe.
        </p>
      </div>

      <div className="card mt-2">
        <h3>Image Analyzer Benchmark</h3>
        <input type="file" accept="image/*" multiple onChange={(e) => setImageFiles(Array.from(e.target.files || []))} />
        <div className="mt-1" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Loaded images: {imageFiles.length}
        </div>
        <button className="btn btn-primary mt-1" onClick={runImageBenchmark} disabled={imageRunning || !imageFiles.length}>
          {imageRunning ? 'Running...' : 'Run Image Benchmark'}
        </button>
        {imageProgress && <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{imageProgress}</p>}
        <MetricsCard title="Image Metrics" report={imageMetrics} />
      </div>

      <div className="card mt-2">
        <h3>QR Analyzer Benchmark</h3>
        <input type="file" accept="image/*" multiple onChange={(e) => setQrFiles(Array.from(e.target.files || []))} />
        <div className="mt-1" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Loaded QR samples: {qrFiles.length}
        </div>
        <button className="btn btn-primary mt-1" onClick={runQRBenchmark} disabled={qrRunning || !qrFiles.length}>
          {qrRunning ? 'Running...' : 'Run QR Benchmark'}
        </button>
        {qrProgress && <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{qrProgress}</p>}
        <MetricsCard title="QR Metrics" report={qrMetrics} />
      </div>

      <div className="card mt-2">
        <h3>Link Analyzer Benchmark</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          One sample per line: label then tab then URL. Example: safe[TAB]https://google.com
        </p>
        <textarea className="text-input-area" rows={6} value={linkText} onChange={(e) => setLinkText(e.target.value)} />
        <button className="btn btn-primary mt-1" onClick={runLinkBenchmark}>Run Link Benchmark</button>
        {linkErrors.length > 0 && (
          <div className="mt-1" style={{ color: 'var(--warning)', fontSize: '0.82rem' }}>
            Ignored rows: {linkErrors.map(e => e.index).join(', ')}
          </div>
        )}
        <MetricsCard title="Link Metrics" report={linkMetrics} />
      </div>

      <div className="card mt-2">
        <h3>Scam Analyzer Benchmark</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          One sample per line: label then tab then message text. Example: scam[TAB]URGENT verify KYC now...
        </p>
        <textarea className="text-input-area" rows={6} value={scamText} onChange={(e) => setScamText(e.target.value)} />
        <button className="btn btn-primary mt-1" onClick={runScamBenchmark}>Run Scam Benchmark</button>
        {scamErrors.length > 0 && (
          <div className="mt-1" style={{ color: 'var(--warning)', fontSize: '0.82rem' }}>
            Ignored rows: {scamErrors.map(e => e.index).join(', ')}
          </div>
        )}
        <MetricsCard title="Scam Metrics" report={scamMetrics} />
      </div>

      <MetricsCard title="Overall Combined Metrics" report={combinedMetrics} />
    </div>
  );
}
