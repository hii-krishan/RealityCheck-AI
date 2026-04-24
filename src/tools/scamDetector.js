/**
 * Scam Message Detector
 * Pattern-matching engine to detect phishing SMS, WhatsApp, and emails.
 */

const URGENCY_PATTERNS = [
  { pattern: /\b(urgent|immediately|act now|right away|hurry|asap|don'?t delay)\b/i, weight: 3, flag: 'Uses urgency language to pressure you' },
  { pattern: /\b(last chance|final notice|expir(e|ing|ed)|deadline|limited time|today only)\b/i, weight: 3, flag: 'Creates artificial time pressure' },
  { pattern: /\b(account.*(block|suspend|terminat|restrict|deactivat|clos))\b/i, weight: 4, flag: 'Threatens account suspension' },
  { pattern: /\b(your.*(compromis|hack|breach|unauthori))\b/i, weight: 4, flag: 'Claims your account is compromised' },
];

const PHISHING_PATTERNS = [
  { pattern: /\b(verify|confirm|update|validate)\s+(your|ur)\s+(account|identity|details|information|password|card)\b/i, weight: 5, flag: 'Asks to verify personal information' },
  { pattern: /\b(click|tap)\s+(here|below|this|the)\s+(link|button|url)\b/i, weight: 3, flag: 'Directs you to click a link' },
  { pattern: /\b(enter|provide|share|send)\s+(your|ur)?\s*(otp|pin|password|cvv|card\s*number|aadhaar|pan)\b/i, weight: 5, flag: 'Requests sensitive credentials (banks/services never ask this)' },
  { pattern: /\b(kyc|know your customer)\s*(update|verify|pending|expired)\b/i, weight: 4, flag: 'Fake KYC update request' },
  { pattern: /\bdebit(ed)?\s*(rs\.?|₹|inr)?\s*\d+/i, weight: 3, flag: 'Claims money was debited from your account' },
];

const FINANCIAL_BAIT = [
  { pattern: /\b(won|win|winner|congratulat)\b.*\b(prize|reward|lottery|cash|gift|crore|lakh|lakhs)\b/i, weight: 5, flag: 'Lottery/prize scam — you cannot win what you didn\'t enter' },
  { pattern: /\b(earn|make)\s*(rs\.?|₹|inr|\$)?\s*\d+.*\b(daily|weekly|monthly|per\s*day)\b/i, weight: 4, flag: 'Unrealistic income promise' },
  { pattern: /\b(free|gift|bonus|cashback|refund)\b.*\b(rs\.?|₹|inr|\$)\s*\d+/i, weight: 3, flag: 'Bait with free money offer' },
  { pattern: /\b(invest|investment|trading)\b.*\b(guaranteed|assured|100%|risk\s*free)\b/i, weight: 5, flag: 'Investment scam — no investment is risk-free' },
  { pattern: /\b(work from home|part.?time job|easy money|online earning)\b/i, weight: 3, flag: 'Potential job scam' },
];

const IMPERSONATION = [
  { pattern: /\b(reserve bank|rbi|income tax|it department|irs|customs|police|court|government)\b/i, weight: 3, flag: 'Impersonates government authority' },
  { pattern: /\b(sbi|hdfc|icici|axis|paytm|phonepe|google pay|gpay|amazon|flipkart)\b.*\b(alert|notice|verification|update)\b/i, weight: 3, flag: 'Impersonates a well-known brand' },
  { pattern: /\bdear\s*(customer|user|sir|madam|valued)\b/i, weight: 2, flag: 'Generic greeting (legitimate services use your name)' },
];

const LINK_PATTERNS = [
  { pattern: /https?:\/\/[^\s]+\.(xyz|tk|ml|ga|cf|top|click|link|info|buzz)\b/i, weight: 4, flag: 'Suspicious domain extension' },
  { pattern: /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i, weight: 5, flag: 'Link uses raw IP address instead of domain name' },
  { pattern: /(bit\.ly|tinyurl|t\.co|goo\.gl|is\.gd|shorturl|cutt\.ly)/i, weight: 2, flag: 'Uses URL shortener to hide real destination' },
  { pattern: /https?:\/\/[^\s]*(@|%40)/i, weight: 5, flag: 'URL contains deceptive @ symbol' },
];

export function analyzeMessage(text) {
  if (!text || text.trim().length === 0) return null;
  
  const flags = [];
  let totalWeight = 0;
  const allPatterns = [...URGENCY_PATTERNS, ...PHISHING_PATTERNS, ...FINANCIAL_BAIT, ...IMPERSONATION, ...LINK_PATTERNS];
  
  for (const { pattern, weight, flag } of allPatterns) {
    const match = text.match(pattern);
    if (match) {
      flags.push({ flag, matchedText: match[0], weight });
      totalWeight += weight;
    }
  }
  
  // Extract and list any URLs
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const urls = text.match(urlRegex) || [];
  
  // Calculate risk
  let risk, riskClass;
  if (totalWeight >= 10) { risk = 'LIKELY SCAM'; riskClass = 'dangerous'; }
  else if (totalWeight >= 5) { risk = 'SUSPICIOUS'; riskClass = 'suspicious'; }
  else if (totalWeight >= 2) { risk = 'SLIGHTLY SUSPICIOUS'; riskClass = 'suspicious'; }
  else { risk = 'APPEARS SAFE'; riskClass = 'safe'; }
  
  const advice = getAdvice(riskClass, flags);
  
  return { risk, riskClass, flags, totalWeight, urls, advice, score: Math.min(100, totalWeight * 10) };
}

function getAdvice(riskClass, flags) {
  if (riskClass === 'dangerous') {
    return 'DO NOT click any links, share any information, or respond to this message. Block the sender and report to cybercrime.gov.in or call 1930.';
  } else if (riskClass === 'suspicious') {
    return 'Be cautious. Verify directly with the organization through their official app/website. Never share OTP, password, or financial details via message.';
  }
  return 'This message appears to be safe, but always exercise caution with unexpected messages from unknown senders.';
}
