import * as cheerio from 'cheerio';

/**
 * @typedef {Object} NoteItem
 * @property {string} text Treść uwagi
 * @property {string} date Data wystawienia uwagi (YYYY-MM-DD)
 * @property {string} teacher Imię i nazwisko nauczyciela wystawiającego uwagę
 * @property {string} type Rodzaj uwagi (np. 'negatywna', 'pozytywna', 'neutralna')
 * @property {string} category Kategoria uwagi (np. 'Zachowanie')
 * @property {number|null} points Wartość punktowa (jeśli stosowana w szkole)
 */

/**
 * Parsuje kod HTML strony https://synergia.librus.pl/uwagi i zwraca listę uwag
 * @param {string} html Kod HTML strony z uwagami
 * @returns {NoteItem[]}
 */
export function parseNotes(html) {
  if (!html || typeof html !== 'string') {
    return [];
  }

  const $ = cheerio.load(html);
  const notes = [];

  // Znajdź główną tabelę uwag (zazwyczaj class="decorated" w kontenerze Uwagi)
  const table = $('table.decorated').first();
  if (!table.length) {
    return [];
  }

  // Odczytaj nagłówki kolumn
  const headerCells = table.find('thead tr td, thead tr th');
  const columnMap = {};

  if (headerCells.length > 0) {
    headerCells.each((idx, cell) => {
      const headerText = $(cell).text().trim().toLowerCase();
      if (headerText.includes('rodzaj') || headerText.includes('typ')) {
        columnMap.type = idx;
      } else if (headerText.includes('uwag') || headerText.includes('treść') || headerText.includes('tresc') || headerText.includes('opis')) {
        columnMap.text = idx;
      } else if (headerText.includes('data')) {
        columnMap.date = idx;
      } else if (headerText.includes('dodał') || headerText.includes('dodal') || headerText.includes('kto') || headerText.includes('nauczyciel')) {
        columnMap.teacher = idx;
      } else if (headerText.includes('kategori')) {
        columnMap.category = idx;
      } else if (headerText.includes('punkt')) {
        columnMap.points = idx;
      }
    });
  }

  // Domyślna mapa jeśli nagłówki nie zostały sparsowane
  const textIdx = columnMap.text ?? 0;
  const dateIdx = columnMap.date ?? 1;
  const teacherIdx = columnMap.teacher ?? 2;
  const typeIdx = columnMap.type ?? 3;
  const categoryIdx = columnMap.category ?? 4;
  const pointsIdx = columnMap.points ?? null;

  // Przeszukaj wiersze tbody (lub tr z pominięciem nagłówka)
  const rows = table.find('tbody tr').length > 0 
    ? table.find('tbody tr') 
    : table.find('tr').slice(1);

  rows.each((_, tr) => {
    const rowEl = $(tr);
    const cells = rowEl.find('td');

    if (cells.length < 2) {
      return; // Puste lub wiersz stopki
    }

    const text = $(cells[textIdx]).text().trim().replace(/\s+/g, ' ');
    if (!text || text === 'Brak uwag' || text === 'Brak danych') {
      return;
    }

    const date = dateIdx !== null && cells[dateIdx] ? $(cells[dateIdx]).text().trim() : '';
    const teacher = teacherIdx !== null && cells[teacherIdx] ? $(cells[teacherIdx]).text().trim().replace(/\s+/g, ' ') : '';
    const type = typeIdx !== null && cells[typeIdx] ? $(cells[typeIdx]).text().trim().toLowerCase() : '';
    const category = categoryIdx !== null && cells[categoryIdx] ? $(cells[categoryIdx]).text().trim() : '';
    
    let points = null;
    if (pointsIdx !== null && cells[pointsIdx]) {
      const parsedPoints = parseInt($(cells[pointsIdx]).text().trim(), 10);
      if (!isNaN(parsedPoints)) {
        points = parsedPoints;
      }
    }

    notes.push({
      text,
      date,
      teacher,
      type,
      category,
      points
    });
  });

  return notes;
}
