import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('test/fixtures/announcements.html', 'utf8');
const $ = cheerio.load(html);

$('table.decorated.big.center.printable').slice(0, 2).each((tIdx, tbl) => {
  console.log(`\n=== ANNOUNCEMENT TABLE ${tIdx + 1} ===`);
  $(tbl).find('tr').each((rIdx, tr) => {
    console.log(`Row ${rIdx}:`);
    $(tr).find('td, th').each((cIdx, td) => {
      console.log(`  Cell ${cIdx} [${td.tagName}]: "${$(td).text().trim().replace(/\s+/g, ' ')}"`);
      console.log(`     HTML: ${$(td).html()?.trim()}`);
    });
  });
});
