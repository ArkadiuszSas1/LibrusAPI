import { LibrusClient } from '../src/index.js';
import * as cheerio from 'cheerio';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function inspectAnnouncements() {
  const client = new LibrusClient();
  await client.login(process.env.OLEK_LIBRUS_LOGIN, process.env.OLEK_LIBRUS_PASS);

  console.log('--- FETCHING https://synergia.librus.pl/ogloszenia ---');
  const res = await client.http.get('https://synergia.librus.pl/ogloszenia');
  console.log('Status:', res.status);
  const html = await res.text();
  console.log('HTML len:', html.length);

  // Save fixture for tests
  fs.writeFileSync('test/fixtures/announcements.html', html);
  console.log('Saved test/fixtures/announcements.html');

  const $ = cheerio.load(html);
  console.log('Title:', $('title').text());
  console.log('H1 / H2:', $('h1, h2').text());

  console.log('\n--- TABLES ---');
  $('table').each((i, el) => {
    console.log(`Table ${i} class="${$(el).attr('class')}":`);
    $(el).find('tr').each((rIdx, tr) => {
      console.log(`  Row ${rIdx}: "${$(tr).text().trim().replace(/\s+/g, ' ').slice(0, 150)}"`);
    });
  });

  console.log('\n--- CONTAINERS / DIVS ---');
  $('.container, .container-background, #body').find('div, p, article').each((i, el) => {
    const cl = $(el).attr('class') || '';
    if (cl && (cl.includes('ogloszen') || cl.includes('announc') || cl.includes('box') || cl.includes('post'))) {
      console.log(`Div class="${cl}":`, $(el).text().trim().replace(/\s+/g, ' ').slice(0, 150));
    }
  });
}

inspectAnnouncements().catch(console.error);
