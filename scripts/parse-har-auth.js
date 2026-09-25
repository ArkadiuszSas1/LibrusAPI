import fs from 'fs';

const harPath = 'examples/synergia.librus.pl.har';
console.log('Reading HAR file...');
const raw = fs.readFileSync(harPath, 'utf8');
const har = JSON.parse(raw);
const entries = har.log.entries;

console.log(`Total entries in HAR: ${entries.length}`);

const staticExts = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.ico', '.map'];

const relevantEntries = [];

for (let i = 0; i < entries.length; i++) {
  const e = entries[i];
  const req = e.request;
  const res = e.response;
  const urlObj = new URL(req.url);

  // Skip static assets
  const pathname = urlObj.pathname.toLowerCase();
  const isStatic = staticExts.some(ext => pathname.endsWith(ext));
  if (isStatic && !pathname.includes('login') && !pathname.includes('auth')) {
    continue;
  }

  // Extract key info
  const reqCookies = (req.cookies || []).map(c => `${c.name}=${c.value.slice(0, 30)}...`);
  const setCookies = (res.headers || [])
    .filter(h => h.name.toLowerCase() === 'set-cookie')
    .map(h => h.value);

  const postData = req.postData ? {
    mimeType: req.postData.mimeType,
    text: req.postData.text ? (req.postData.text.length > 500 ? req.postData.text.slice(0, 500) + '...' : req.postData.text) : undefined,
    params: req.postData.params
  } : undefined;

  const locationHeader = (res.headers || []).find(h => h.name.toLowerCase() === 'location');

  relevantEntries.push({
    index: i + 1,
    startedDateTime: e.startedDateTime,
    method: req.method,
    url: req.url,
    status: res.status,
    statusText: res.statusText,
    location: locationHeader ? locationHeader.value : undefined,
    postData,
    reqCookiesCount: (req.cookies || []).length,
    setCookiesCount: setCookies.length,
    setCookies: setCookies.length > 0 ? setCookies.map(sc => sc.split(';')[0]) : undefined,
    responseSize: res.content ? res.content.size : 0,
    responseMimeType: res.content ? res.content.mimeType : undefined,
    responseBodySnippet: res.content && res.content.text ? res.content.text.slice(0, 300).replace(/\s+/g, ' ') : undefined
  });
}

console.log(`Filtered relevant entries: ${relevantEntries.length}`);

// Write summary JSON and Markdown report
fs.writeFileSync('examples/auth_flow_summary.json', JSON.stringify(relevantEntries, null, 2));

let md = '# Wyodrębniona sekwencja żądań (Logowanie i Nawigacja)\n\n';
relevantEntries.forEach((r, idx) => {
  md += `### ${idx + 1}. [${r.method}] ${r.status} ${r.url}\n`;
  if (r.location) md += `- **Redirect to (Location):** \`${r.location}\`\n`;
  if (r.postData) {
    md += `- **POST Payload:**\n\`\`\`\n${r.postData.text || JSON.stringify(r.postData.params)}\n\`\`\`\n`;
  }
  if (r.setCookies && r.setCookies.length > 0) {
    md += `- **Set-Cookie:**\n${r.setCookies.map(c => `  - \`${c}\``).join('\n')}\n`;
  }
  if (r.responseBodySnippet) {
    md += `- **Response Snippet:** ${r.responseBodySnippet.slice(0, 200)}...\n`;
  }
  md += '\n---\n';
});

fs.writeFileSync('examples/auth_flow_summary.md', md);
console.log('Saved to examples/auth_flow_summary.json and examples/auth_flow_summary.md');
