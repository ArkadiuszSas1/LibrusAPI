import * as cheerio from 'cheerio';

/**
 * @typedef {object} AnnouncementItem
 * @property {string} id - Identyfikator lub unikalny klucz ogłoszenia
 * @property {string} title - Tytuł ogłoszenia
 * @property {string} author - Autor ogłoszenia (np. 'Dorota Matuszczak', 'Wolontariat SP133')
 * @property {string} date - Data publikacji (format: YYYY-MM-DD)
 * @property {string} content - Treść tekstowa ogłoszenia
 * @property {string} contentHtml - Treść ogłoszenia w formacie HTML
 */

/**
 * Parsuje widok ogłoszeń szkolnych (/ogloszenia)
 * @param {string} html 
 * @returns {AnnouncementItem[]}
 */
export function parseAnnouncements(html) {
  if (!html || typeof html !== 'string') return [];

  const $ = cheerio.load(html);
  const announcements = [];

  // Każde ogłoszenie jest osobną tabelą decorated
  $('table.decorated').each((idx, table) => {
    const $table = $(table);
    
    // Szukamy wierszy z polami "Dodał", "Data publikacji", "Treść"
    let title = '';
    let author = '';
    let date = '';
    let content = '';
    let contentHtml = '';

    // Tytuł znajduje się w pierwszym wierszu (lub thead)
    const firstRowTd = $table.find('tr:first-child td, thead tr td, thead tr th').first();
    title = firstRowTd.text().trim().replace(/\s+/g, ' ');

    $table.find('tr').each((_, tr) => {
      const thText = $(tr).find('th').text().trim().toLowerCase();
      const td = $(tr).find('td');

      if (thText.includes('dodał') || thText.includes('autor')) {
        author = td.text().trim().replace(/\s+/g, ' ');
      } else if (thText.includes('data publikacji') || thText.includes('data')) {
        date = td.text().trim().replace(/\s+/g, ' ');
      } else if (thText.includes('treść') || thText.includes('tresc')) {
        contentHtml = td.html()?.trim() || '';
        const clone = td.clone();
        clone.find('br').replaceWith('\n');
        content = clone.text().trim();
      }
    });

    // Sprawdzamy czy to rzeczywiście tabela ogłoszenia
    if (title && (author || date || content)) {
      // Unikalne ID generowane z daty i tytułu jeśli brak natywnego ID
      const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
      const id = `${date || 'no-date'}-${cleanTitle}-${idx + 1}`;

      announcements.push({
        id,
        title,
        author: author || 'Nieznany',
        date: date || '',
        content: content || '',
        contentHtml: contentHtml || ''
      });
    }
  });

  return announcements;
}
