/**
 * Link Safety Checker
 * Analyzes URLs for suspicious patterns, typo-squatting, and known unsafe TLDs.
 */

const SAFE_DOMAINS = [
  'google.com','youtube.com','facebook.com','instagram.com','twitter.com','x.com',
  'amazon.in','amazon.com','flipkart.com','myntra.com','meesho.com',
  'sbi.co.in','hdfcbank.com','icicibank.com','axisbank.com','kotakbank.com',
  'paytm.com','phonepe.com','npci.org.in',
  'gov.in','nic.in','india.gov.in','cybercrime.gov.in','incometax.gov.in',
  'wikipedia.org','github.com','stackoverflow.com',
  'microsoft.com','apple.com','whatsapp.com',
  'uidai.gov.in','digilocker.gov.in','irctc.co.in',
];

const SUSPICIOUS_TLDS = ['.xyz','.tk','.ml','.ga','.cf','.top','.click','.link','.buzz','.work','.info','.club','.icu','.monster','.rest'];

const TYPOSQUAT_TARGETS = {
  'google': ['g00gle','gooogle','googel','gogle','goggle'],
  'amazon': ['amaz0n','amazom','amazn','amezon','amaazon'],
  'flipkart': ['flipkrat','fl1pkart','flipkar','flpkart','flipcart'],
  'facebook': ['faceb00k','facebok','facbook','faecbook'],
  'instagram': ['instagran','1nstagram','instgram','instagarm'],
  'paytm': ['paytim','paytm1','paytem','patym'],
  'phonepe': ['ph0nepe','phonpe','phonepay','fonepe'],
  'whatsapp': ['whatsap','watsapp','whatapp','whatsaap'],
  'sbi': ['sb1','ssbi'],
};

export function checkLink(url) {
  if (!url || url.trim().length === 0) return null;
  
  // Normalize URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.match(/^https?:\/\//i)) normalizedUrl = 'http://' + normalizedUrl;
  
  const flags = [];
  let totalWeight = 0;
  
  try {
    const parsed = new URL(normalizedUrl);
    const hostname = parsed.hostname.toLowerCase();
    const fullUrl = normalizedUrl.toLowerCase();
    
    // 1. HTTPS check
    if (parsed.protocol === 'http:') {
      flags.push({ flag: 'Not using HTTPS — connection is not encrypted', weight: 2, type: 'warning' });
      totalWeight += 2;
    }
    
    // 2. IP address check
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      flags.push({ flag: 'Uses raw IP address instead of domain name — highly suspicious', weight: 5, type: 'danger' });
      totalWeight += 5;
    }
    
    // 3. Suspicious TLD
    const tld = '.' + hostname.split('.').pop();
    if (SUSPICIOUS_TLDS.includes(tld)) {
      flags.push({ flag: `Suspicious domain extension (${tld}) — commonly used in scam sites`, weight: 3, type: 'danger' });
      totalWeight += 3;
    }
    
    // 4. Typo-squatting detection
    for (const [brand, typos] of Object.entries(TYPOSQUAT_TARGETS)) {
      for (const typo of typos) {
        if (hostname.includes(typo)) {
          flags.push({ flag: `Possible typo-squatting of "${brand}" — URL contains "${typo}"`, weight: 5, type: 'danger' });
          totalWeight += 5;
        }
      }
    }
    
    // 5. Known safe domain check
    const isSafe = SAFE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
    if (isSafe) {
      flags.push({ flag: `Recognized domain: ${hostname}`, weight: -3, type: 'safe' });
      totalWeight -= 3;
    }
    
    // 6. URL shortener detection
    const shorteners = ['bit.ly','tinyurl.com','t.co','goo.gl','is.gd','cutt.ly','shorturl.at','rb.gy'];
    if (shorteners.includes(hostname)) {
      flags.push({ flag: 'URL shortener detected — cannot verify final destination', weight: 3, type: 'warning' });
      totalWeight += 3;
    }
    
    // 7. Deceptive @ in URL
    if (fullUrl.includes('@')) {
      flags.push({ flag: 'URL contains @ symbol — can redirect to a different site', weight: 5, type: 'danger' });
      totalWeight += 5;
    }
    
    // 8. Excessive subdomains
    const parts = hostname.split('.');
    if (parts.length > 4) {
      flags.push({ flag: `Excessive subdomains (${parts.length} levels) — may hide real domain`, weight: 3, type: 'warning' });
      totalWeight += 3;
    }
    
    // 9. Suspicious path keywords
    const suspiciousPaths = ['/login','/verify','/secure','/update','/confirm','/bank','/account','/signin'];
    if (suspiciousPaths.some(p => parsed.pathname.includes(p)) && !isSafe) {
      flags.push({ flag: 'URL path contains sensitive action keywords on unrecognized domain', weight: 3, type: 'danger' });
      totalWeight += 3;
    }
    
    // 10. Very long URL
    if (normalizedUrl.length > 200) {
      flags.push({ flag: 'Unusually long URL — may contain hidden parameters', weight: 2, type: 'warning' });
      totalWeight += 2;
    }
    
    let risk, riskClass;
    if (totalWeight >= 8) { risk = 'DANGEROUS — DO NOT CLICK'; riskClass = 'dangerous'; }
    else if (totalWeight >= 4) { risk = 'SUSPICIOUS'; riskClass = 'suspicious'; }
    else if (totalWeight >= 1) { risk = 'USE CAUTION'; riskClass = 'suspicious'; }
    else { risk = 'APPEARS SAFE'; riskClass = 'safe'; }
    
    return {
      risk, riskClass, flags: flags.filter(f => f.weight > 0 || f.type === 'safe'),
      parsedUrl: { protocol: parsed.protocol, hostname, pathname: parsed.pathname, fullUrl: normalizedUrl },
      score: Math.min(100, Math.max(0, totalWeight * 12))
    };
  } catch (e) {
    return { risk: 'INVALID URL', riskClass: 'dangerous', flags: [{ flag: 'Could not parse URL — invalid format', weight: 5, type: 'danger' }], score: 50 };
  }
}
