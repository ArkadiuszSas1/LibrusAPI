import { LibrusClient } from '../src/index.js';
import * as cheerio from 'cheerio';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function inspectTimetable() {
  const client = new LibrusClient();
  const login = process.env.OLEK_LIBRUS_LOGIN || process.env.JULEK_LIBRUS_LOGIN;
  const password = process.env.OLEK_LIBRUS_PASS || process.env.JULEK_LIBRUS_PASS;

  console.log('--- LOGOWANIE DO LIBRUSA ---');
  const session = await client.login(login, password);
  console.log(`Zalogowano jako: ${session.user.name} (${session.user.role})`);

  console.log('\n--- POBIERANIE https://synergia.librus.pl/terminarz ---');
  const res = await client.http.get('https://synergia.librus.pl/terminarz');
  console.log('Status:', res.status);
  const html = await res.text();
  console.log('Długość HTML:', html.length);

  fs.writeFileSync('test/fixtures/timetable_month.html', html);
  console.log('Zapisano test/fixtures/timetable_month.html');

  const $ = cheerio.load(html);
  console.log('Tytuł:', $('title').text());
  console.log('H1 / H2:', $('h1, h2').map((_, el) => $(el).text().trim()).get());

  // Sprawdź nawigację / formularze / linki poprzedni/następny miesiąc
  console.log('\n--- LINKI NAWIGACJI / FORMULARZE ---');
  $('a, select, form').each((_, el) => {
    const href = $(el).attr('href');
    const name = $(el).attr('name');
    const action = $(el).attr('action');
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (href && (href.includes('terminarz') || href.includes('kalendarz') || href.includes('miesiac') || href.includes('data'))) {
      console.log(`Link: href="${href}" text="${text}"`);
    }
    if (action) {
      console.log(`Form: action="${action}" name="${name}"`);
    }
  });

  // Sprawdź strukturę kalendarza / tabel
  console.log('\n--- TABELE / DNI ---');
  $('table.kalendarz, table.terminarz, table.decorated, table').each((i, el) => {
    const cl = $(el).attr('class') || '';
    const id = $(el).attr('id') || '';
    console.log(`Tabela #${i} id="${id}" class="${cl}"`);
    
    // Pokaż przykładowe komórki
    $(el).find('td').slice(0, 15).each((tdIdx, td) => {
      const tdText = $(td).text().trim().replace(/\s+/g, ' ');
      const tdCl = $(td).attr('class') || '';
      const tdOnclick = $(td).attr('onclick') || '';
      const tdData = $(td).attr('data-date') || $(td).attr('id') || '';
      if (tdText) {
        console.log(`  TD ${tdIdx} [class="${tdCl}"] [data="${tdData}"] [onclick="${tdOnclick.slice(0, 40)}"]: "${tdText.slice(0, 80)}"`);
      }
    });
  });

  // Sprawdź elementy z wydarzeniami (np. div.event, a.tooltip, span, itp.)
  console.log('\n--- ELEMENTY ZDARZEŃ ---');
  $('.event, .wpis, [class*="kalendarz"], [class*="terminarz"], td a, td div').each((i, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    const cl = $(el).attr('class') || '';
    const href = $(el).attr('href') || '';
    const title = $(el).attr('title') || '';
    const onclick = $(el).attr('onclick') || '';
    if (text && text.length > 5 && !text.includes('Wyloguj') && !text.includes('Menu') && i < 20) {
      console.log(`Element #${i} tag=${el.tagName} class="${cl}" href="${href}" title="${title.slice(0, 50)}" onclick="${onclick.slice(0, 40)}": "${text.slice(0, 80)}"`);
    }
  });
}

inspectTimetable().catch(console.error);
