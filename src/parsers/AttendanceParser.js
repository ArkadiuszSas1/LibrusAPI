import * as cheerio from 'cheerio';

/**
 * @typedef {Object} AttendanceEntry
 * @property {string} date Data zdarzenia (YYYY-MM-DD)
 * @property {number} period Semestr/Okres (1 lub 2)
 * @property {string} symbol Skrót symbolu (np. 'sp', 'nb', 'u', 'zw')
 * @property {string} type Pełny opis rodzaju (np. 'spóźnienie', 'nieobecność usprawiedliwiona')
 * @property {string} subject Nazwa przedmiotu / lekcji
 * @property {string} teacher Imię i nazwisko nauczyciela
 * @property {string} addedBy Osoba wprowadzająca wpis
 * @property {number|null} lessonNumber Numer godziny lekcyjnej (np. 1, 2, 3)
 * @property {boolean} isTrip Czy nieobecność wynika z wycieczki
 */

/**
 * @typedef {Object} AttendanceDaySummary
 * @property {string} date Data (YYYY-MM-DD)
 * @property {number} period Semestr/Okres (1 lub 2)
 * @property {number} unexcused Liczba nieobecności nieusprawiedliwionych (NU)
 * @property {number} excused Liczba nieobecności usprawiedliwionych (U)
 * @property {number} totalAbsences Suma nieobecności (U + NU)
 * @property {number} lateness Liczba spóźnień (SP)
 * @property {number} exempt Liczba zwolnień (ZW)
 */

/**
 * @typedef {Object} AttendancePeriodTotal
 * @property {number} period Numer okresu / semestru
 * @property {number} unexcused
 * @property {number} excused
 * @property {number} totalAbsences
 * @property {number} lateness
 * @property {number} exempt
 */

/**
 * @typedef {Object} AttendanceData
 * @property {AttendanceEntry[]} entries Lista pojedynczych zdarzeń frekwencji (spóźnienia, nieobecności itp.)
 * @property {AttendanceDaySummary[]} days Podsumowania dzienne frekwencji
 * @property {AttendancePeriodTotal[]} periodTotals Podsumowania semestralne
 */

/**
 * Pomocnicza funkcja do parsowania tooltipu zdarzenia frekwencji
 * @param {string} title
 * @returns {Record<string, string>}
 */
function parseAttendanceTooltip(title) {
  if (!title) return {};
  const lines = title.split(/<br\s*\/?>/i).map(s => cheerio.load(s).text().trim()).filter(Boolean);
  const details = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      details[key] = val;
    }
  }
  return details;
}

/**
 * Parsuje kod HTML widoku frekwencji (/przegladaj_nb/uczen)
 * @param {string} html Kod HTML strony
 * @returns {AttendanceData}
 */
export function parseAttendance(html) {
  if (!html || typeof html !== 'string') {
    return { entries: [], days: [], periodTotals: [] };
  }

  const $ = cheerio.load(html);
  const entries = [];
  const days = [];
  const periodTotals = [];

  const table = $('table.center.big.decorated').first();
  if (!table.length) {
    return { entries: [], days: [], periodTotals: [] };
  }

  const rows = table.find('> tbody > tr, > tr');
  let currentPeriod = 1;

  rows.each((_, tr) => {
    const row = $(tr);
    const cells = row.children('td, th');
    if (!cells.length) return;

    const firstText = $(cells[0]).text().trim();

    // Wykrywanie nagłówka semestru: np. "Okres 1"
    if (firstText.startsWith('Okres')) {
      const pMatch = firstText.match(/Okres\s+(\d+)/i);
      if (pMatch) {
        currentPeriod = parseInt(pMatch[1], 10);
      }
      return;
    }

    // Wiersz podsumowania: "Suma za okres X"
    if (row.text().includes('Suma za okres')) {
      const sumCells = cells.map((_, c) => $(c).text().trim()).get();
      periodTotals.push({
        period: currentPeriod,
        unexcused: parseInt(sumCells[2], 10) || 0,
        excused: parseInt(sumCells[3], 10) || 0,
        totalAbsences: parseInt(sumCells[4], 10) || 0,
        lateness: parseInt(sumCells[5], 10) || 0,
        exempt: parseInt(sumCells[6], 10) || 0
      });
      return;
    }

    // Wiersz dnia: format "YYYY-MM-DD (dzień_tygodnia)"
    const dateMatch = firstText.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const date = dateMatch[1];

      // Wyciąganie wpisów frekwencji z komórek lekcji
      row.find('a[title*="Rodzaj:"]').each((_, a) => {
        const symbol = $(a).text().trim();
        const title = $(a).attr('title') || '';
        const details = parseAttendanceTooltip(title);

        const lessonNumber = details['godzina lekcyjna'] ? parseInt(details['godzina lekcyjna'], 10) : null;
        const trip = details['czy wycieczka'] ? details['czy wycieczka'].toLowerCase() === 'tak' : false;

        entries.push({
          date,
          period: currentPeriod,
          symbol,
          type: details['rodzaj'] || symbol,
          subject: details['lekcja'] || '',
          teacher: details['nauczyciel'] || '',
          addedBy: details['dodał'] || details['dodal'] || '',
          lessonNumber,
          isTrip: trip
        });
      });

      // Podsumowanie dzienne z końcowych kolumn
      if (cells.length >= 7) {
        const last5 = cells.slice(-5).map((_, c) => $(c).text().trim()).get();
        days.push({
          date,
          period: currentPeriod,
          unexcused: parseInt(last5[0], 10) || 0,
          excused: parseInt(last5[1], 10) || 0,
          totalAbsences: parseInt(last5[2], 10) || 0,
          lateness: parseInt(last5[3], 10) || 0,
          exempt: parseInt(last5[4], 10) || 0
        });
      }
    }
  });

  return {
    entries,
    days,
    periodTotals
  };
}
