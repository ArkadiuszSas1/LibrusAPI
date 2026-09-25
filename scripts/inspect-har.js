import fs from 'fs';

const har = JSON.parse(fs.readFileSync('examples/synergia.librus.pl.har', 'utf8'));
const entries = har.log.entries;

console.log('Total entries:', entries.length);

const urls = new Set();
entries.forEach(e => {
  const u = new URL(e.request.url);
  urls.add(`${e.request.method} ${u.origin}${u.pathname}`);
});

console.log('Unique endpoints in HAR:');
for (const u of urls) {
  console.log('  ', u);
}

// Check first entry request headers & cookies
console.log('\n--- FIRST REQUEST COOKIES ---');
const firstReq = entries[0].request;
console.log('URL:', firstReq.url);
console.log('Cookies:', firstReq.cookies);

// Check if any request sets cookies
console.log('\n--- SET COOKIE RESPONSES ---');
entries.forEach(e => {
  const setCookies = e.response.headers.filter(h => h.name.toLowerCase() === 'set-cookie');
  if (setCookies.length > 0) {
    console.log(e.request.url, setCookies.map(c => c.value));
  }
});
