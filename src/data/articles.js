// Helper to generate Google News search URL from a title
const googleNews = (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws`

export const articles = [
  {
    id: 1, title: "How Deepfakes Are Threatening India's Elections",
    category: "Impact", source: "Google News",
    date: "2026-03-15", url: googleNews("deepfakes threatening India elections"),
    summary: "Deepfake videos of politicians have gone viral ahead of state elections, raising concerns about AI-driven misinformation campaigns.",
    image: "https://images.unsplash.com/photo-1504711434969-e33886168d6c?auto=format&fit=crop&w=400&h=250"
  },
  {
    id: 2, title: "AI-Generated Images Flood Social Media: How to Spot Them",
    category: "How-To", source: "Google News",
    date: "2026-03-10", url: googleNews("AI generated images how to spot fake social media"),
    summary: "A practical guide to identifying AI-generated images using visual clues like distorted hands, inconsistent lighting, and unnatural skin textures.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=400&h=250"
  },
  {
    id: 3, title: "Viral Morphed Image of Celebrity Leads to FIR",
    category: "Viral", source: "Google News",
    date: "2026-02-28", url: googleNews("morphed image celebrity FIR India"),
    summary: "A morphed image of a Bollywood actress went viral on WhatsApp. Cyber crime cell traced the origin and filed an FIR against the creator.",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=400&h=250"
  },
  {
    id: 4, title: "Understanding GANs: The Technology Behind Deepfakes",
    category: "Deepfakes", source: "Google News",
    date: "2026-02-20", url: googleNews("GAN generative adversarial network deepfake technology"),
    summary: "Generative Adversarial Networks (GANs) are the backbone of deepfake technology. Learn how they work and why detection is becoming harder.",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=400&h=250"
  },
  {
    id: 5, title: "Fact-Checking in the Age of AI: New Tools and Techniques",
    category: "How-To", source: "Google News",
    date: "2026-02-15", url: googleNews("fact checking AI tools deepfake detection"),
    summary: "Modern fact-checkers are adopting AI tools themselves to combat the flood of synthetic media. Here's what's working.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&h=250"
  },
  {
    id: 6, title: "Deepfake Voice Scam Costs Mumbai Businessman ₹80 Lakh",
    category: "News", source: "Google News",
    date: "2026-03-22", url: googleNews("deepfake voice scam Mumbai businessman"),
    summary: "A businessman was tricked into transferring money after receiving a call that perfectly mimicked his business partner's voice using AI.",
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=400&h=250"
  },
  {
    id: 7, title: "How to Report Deepfake Content in India",
    category: "How-To", source: "Google News",
    date: "2026-01-30", url: googleNews("how to report deepfake content India cybercrime"),
    summary: "Step-by-step guide on reporting deepfake and morphed content through India's cyber crime portal and social media platforms.",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=400&h=250"
  },
  {
    id: 8, title: "The Psychology of Why People Fall for Deepfakes",
    category: "Impact", source: "Google News",
    date: "2026-01-25", url: googleNews("psychology why people fall for deepfakes misinformation"),
    summary: "Cognitive biases like confirmation bias and the illusory truth effect make people vulnerable to deepfake misinformation.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=250"
  },
  {
    id: 9, title: "WhatsApp Viral: AI-generated Disaster Images Cause Panic",
    category: "Viral", source: "Google News",
    date: "2026-03-05", url: googleNews("AI generated disaster images WhatsApp viral India"),
    summary: "AI-generated images of a fake earthquake circulated on WhatsApp groups, causing unnecessary panic in several cities.",
    image: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=400&h=250"
  },
  {
    id: 10, title: "New IT Rules 2026: Deepfakes Now Punishable by Law",
    category: "News", source: "Google News",
    date: "2026-03-01", url: googleNews("India IT rules 2026 deepfake punishable law"),
    summary: "The government has introduced stricter IT rules specifically targeting deepfake creation and distribution with penalties up to 3 years imprisonment.",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&h=250"
  },
  {
    id: 11, title: "Reverse Image Search: Your First Line of Defense",
    category: "How-To", source: "Google News",
    date: "2026-02-10", url: googleNews("reverse image search detect fake images"),
    summary: "Learn how to use reverse image search to verify if a photo is real, stolen, or manipulated before sharing it.",
    image: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=400&h=250"
  },
  {
    id: 12, title: "AI Video Scam: Fake CEO Video Calls on the Rise",
    category: "Deepfakes", source: "Google News",
    date: "2026-03-18", url: googleNews("deepfake CEO video call scam Zoom"),
    summary: "Cybercriminals are using real-time deepfake video to impersonate CEOs on Zoom calls, tricking employees into transferring funds.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&h=250"
  },
];

export const newsTickerItems = [
  { text: "Deepfake voice scam in Mumbai — ₹80 lakh stolen", badge: "ALERT" },
  { text: "New IT rules classify deepfake distribution as criminal offense", badge: "NEW" },
  { text: "AI-generated earthquake images cause panic on WhatsApp", badge: "VIRAL" },
  { text: "Cyber crime helpline 1930 receives 10,000+ calls daily", badge: "STATS" },
  { text: "Election Commission issues advisory on deepfake political ads", badge: "ALERT" },
  { text: "Instagram testing AI-generated content labels in India", badge: "UPDATE" },
];

export const CATEGORIES = ['All', 'Deepfakes', 'Viral', 'How-To', 'Impact', 'News'];
