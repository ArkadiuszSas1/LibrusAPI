import 'dotenv/config';
import { HttpClient } from '../src/client/HttpClient.js';
import { AuthManager } from '../src/client/AuthManager.js';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function debugMessages() {
  const http = new HttpClient();
  const auth = new AuthManager(http);

  const login = process.env.OLEK_LIBRUS_LOGIN;
  const password = process.env.OLEK_LIBRUS_PASS;

  console.log('Logging in as Olek...');
  await auth.login(login, password);
  console.log('Logged in!');

  console.log('\nFetching https://synergia.librus.pl/wiadomosci ...');
  const res = await http.get('https://synergia.librus.pl/wiadomosci');
  const html = await res.text();

  // Save html for offline analysis
  fs.writeFileSync('test/fixtures/live-messages.html', html, 'utf8');
  console.log('Saved live HTML to test/fixtures/live-messages.html (length:', html.length, ')');

  const $ = cheerio.load(html);
  console.log('Page Title:', $('title').text());

  // Find all tables on the page
  console.log('\nTables found:');
  $('table').each((i, el) => {
    const cl = $(el).attr('class') || 'no-class';
    const id = $(el).attr('id') || 'no-id';
    const rowCount = $(el).find('tr').length;
    console.log(`- Table ${i}: id="${id}", class="${cl}", rows: ${rowCount}`);
  });

  // Print first 5 rows of any table with class decorated or other
  $('table.decorated tr, table tr').slice(0, 10).each((i, el) => {
    console.log(`\nRow ${i}:`, $(el).text().trim().replace(/\s+/g, ' ').substring(0, 200));
    console.log('  Cells:', $(el).find('td, th').length);
    $(el).find('td').each((j, td) => {
      console.log(`    col ${j}: "${$(td).text().trim().replace(/\s+/g, ' ')}" | html: ${$(td).html()?.substring(0, 100)}`);
    });
  });
}

debugMessages().catch(console.error);
