import 'dotenv/config';
import { HttpClient } from '../src/client/HttpClient.js';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function diagnose() {
  const http = new HttpClient();
  const login = process.env.JULEK_LIBRUS_LOGIN || '12312151';
  const password = process.env.JULEK_LIBRUS_PASS || 'Julek123#';

  console.log('=== KROK 1: Inicjalizacja sesji OAuth ===');
  const r1 = await http.get('https://api.librus.pl/OAuth/Authorization?client_id=46&response_type=code', { followRedirects: true });
  console.log('R1 status:', r1.status);

  console.log('\n=== KROK 2: Wysłanie loginu i hasła ===');
  const r2 = await http.post('https://api.librus.pl/OAuth/Authorization?client_id=46', {
    action: 'login',
    login: login,
    pass: password
  }, {
    headers: {
      'Referer': 'https://api.librus.pl/OAuth/Authorization?client_id=46',
      'Origin': 'https://api.librus.pl'
    }
  });

  const json2 = await r2.json();
  console.log('R2 JSON:', json2);

  console.log('\n=== KROK 3: Podążanie za przekierowaniami OAuth ===');
  let currentUrl = new URL(json2.goTo, 'https://api.librus.pl').toString();
  while (currentUrl) {
    const res = await http.get(currentUrl, { followRedirects: false });
    const loc = res.headers.get('location');
    console.log(`GET ${currentUrl} -> Status ${res.status}, Location: ${loc}`);
    if (loc) {
      currentUrl = new URL(loc, currentUrl).toString();
    } else {
      break;
    }
  }

  console.log('\n=== KROK 4: Sprawdzenie ciasteczek w CookieJar ===');
  for (const [k, v] of http.cookieJar.cookies.entries()) {
    console.log(`[Cookie] Domain: ${v.domain} | Name: ${v.name} = ${v.value}`);
  }

  console.log('\n=== KROK 5: Test wejścia na różne strony Synergii ===');
  const testUrls = [
    'https://synergia.librus.pl/rodzic/index',
    'https://synergia.librus.pl/moje_zadania',
    'https://synergia.librus.pl/wiadomosci',
    'https://synergia.librus.pl/gateway/ms/studentdatapanel/ui/'
  ];

  for (const url of testUrls) {
    console.log(`\n--- GET ${url} ---`);
    const res = await http.get(url, { followRedirects: false });
    console.log(`Status: ${res.status}, Location: ${res.headers.get('location')}`);
    const text = await res.text();
    const $ = cheerio.load(text);
    console.log('Title:', $('title').text());
    console.log('Body snippet:', text.substring(0, 400).replace(/\s+/g, ' '));
    
    // Zapisz do pliku dla pełnej analizy
    const fileName = url.split('/').filter(Boolean).pop() || 'index';
    fs.writeFileSync(`test/fixtures/debug-${fileName}.html`, text, 'utf8');
  }
}

diagnose().catch(console.error);
