import { LibrusClient } from '../src/index.js';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
dotenv.config();

async function testMonthSwitch() {
  const client = new LibrusClient();
  const login = process.env.OLEK_LIBRUS_LOGIN;
  const password = process.env.OLEK_LIBRUS_PASS;

  await client.login(login, password);

  console.log('--- 1. TEST POST DO /terminarz (miesiac=10, rok=2026) ---');
  // Najpierw pobieramy wrzesień aby mieć requestkey
  const res1 = await client.http.get('https://synergia.librus.pl/terminarz');
  const html1 = await res1.text();
  const $1 = cheerio.load(html1);
  const requestKey = $1('input[name="requestkey"]').val();
  console.log('Request key:', requestKey);

  // POST październik
  const formData = new URLSearchParams();
  if (requestKey) formData.append('requestkey', requestKey);
  formData.append('miesiac', '10');
  formData.append('rok', '2026');

  const res2 = await client.http.post('https://synergia.librus.pl/terminarz', formData.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'https://synergia.librus.pl/terminarz'
    }
  });

  const html2 = await res2.text();
  const $2 = cheerio.load(html2);
  console.log('Wybrany miesiąc:', $2('select[name="miesiac"] option[selected]').text().trim());
  console.log('Wybrany rok:', $2('select[name="rok"] option[selected]').text().trim());

  console.log('\nZdarzenia w październiku:');
  $2('table.kalendarz div.kalendarz-dzien').each((_, dayEl) => {
    const dayNum = $2(dayEl).find('.kalendarz-numer-dnia').text().trim();
    $2(dayEl).find('td').each((_, eventTd) => {
      const title = $2(eventTd).attr('title') || '';
      const text = $2(eventTd).text().trim().replace(/\s+/g, ' ');
      const onclick = $2(eventTd).attr('onclick') || '';
      if (text) {
        console.log(`  Dzień ${dayNum} | ${text} | Title: ${title.slice(0, 80)} | Onclick: ${onclick}`);
      }
    });
  });
}

testMonthSwitch().catch(console.error);
