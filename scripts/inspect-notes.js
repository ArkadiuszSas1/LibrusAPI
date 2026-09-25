import { LibrusClient } from '../src/index.js';
import * as cheerio from 'cheerio';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function inspectNotes() {
  const client = new LibrusClient();
  const login = process.env.JULEK_LIBRUS_LOGIN;
  const password = process.env.JULEK_LIBRUS_PASS;

  if (!login || !password) {
    console.error('Brak danych logowania dla Julka w zmiennych środowiskowych!');
    process.exit(1);
  }

  console.log('--- LOGOWANIE NA KONTO JULKA ---');
  const session = await client.login(login, password);
  console.log(`Zalogowano jako: ${session.user.name} (${session.user.role})`);

  console.log('\n--- POBIERANIE https://synergia.librus.pl/uwagi ---');
  const res = await client.http.get('https://synergia.librus.pl/uwagi');
  console.log('Status:', res.status);
  const html = await res.text();
  console.log('Długość HTML:', html.length);

  // Zapis fixture
  fs.writeFileSync('test/fixtures/notes.html', html);
  console.log('Zapisano test/fixtures/notes.html');

  const $ = cheerio.load(html);
  console.log('Tytuł strony:', $('title').text());
  console.log('Nagłówki H1/H2:', $('h1, h2').map((i, el) => $(el).text().trim()).get());

  console.log('\n--- TABELE NA STRONIE ---');
  $('table').each((i, el) => {
    const tableClass = $(el).attr('class') || 'brak-klasy';
    console.log(`\nTabela #${i} (class="${tableClass}"):`);
    
    // Nagłówki th
    const headers = $(el).find('tr th').map((_, th) => $(th).text().trim().replace(/\s+/g, ' ')).get();
    if (headers.length > 0) {
      console.log(`  Nagłówki (TH):`, headers);
    }

    // Wiersze
    $(el).find('tbody tr, tr').each((rIdx, tr) => {
      const cells = $(tr).find('td').map((_, td) => $(td).text().trim().replace(/\s+/g, ' ')).get();
      if (cells.length > 0) {
        console.log(`  Wiersz ${rIdx}:`, cells);
      }
    });
  });
}

inspectNotes().catch(err => {
  console.error('Błąd:', err);
  process.exit(1);
});
