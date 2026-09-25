import * as cheerio from 'cheerio';

/**
 * @typedef {Object} GradeItem
 * @property {string|null} id Unikalny identyfikator oceny w systemie Librus
 * @property {string} subject Nazwa przedmiotu
 * @property {string} grade Wartość oceny (np. '5', '6-', '+', 'np')
 * @property {number} semester Semestr/Okres (1 lub 2)
 * @property {string} category Kategoria oceny (np. 'kartkówka', 'sprawdzian', 'aktywność')
 * @property {string} date Data wystawienia (format YYYY-MM-DD)
 * @property {string} teacher Nauczyciel
 * @property {string} addedBy Osoba wprowadzająca ocenę
 * @property {string} comment Komentarz do oceny
 * @property {number|null} weight Waga oceny
 * @property {string|null} href Ścieżka URL do szczegółów oceny
 */

/**
 * @typedef {Object} SubjectGradesSummary
 * @property {string} subject Nazwa przedmiotu
 * @property {{ grades: GradeItem[], average: string|null, finalGrade: string|null }} semester1 Oceny i średnia w 1. semestrze
 * @property {{ grades: GradeItem[], average: string|null, finalGrade: string|null }} semester2 Oceny i średnia w 2. semestrze
 * @property {{ average: string|null, finalGrade: string|null }} year Podsumowanie roczne
 */

/**
 * @typedef {Object} FormativeGradeItem
 * @property {string} subject Nazwa przedmiotu
 * @property {string} text Treść oceny kształtującej
 * @property {string} category Kategoria oceny
 * @property {number} semester Semestr/Okres (1 lub 2)
 * @property {string} date Data wystawienia
 * @property {string} type Typ oceny (np. 'Bieżąca')
 */

/**
 * @typedef {Object} GradesData
 * @property {GradeItem[]} grades Płaska lista wszystkich ocen cząstkowych
 * @property {SubjectGradesSummary[]} subjects Zestawienie ocen pogrupowane po przedmiotach wraz ze średnimi
 * @property {FormativeGradeItem[]} formativeGrades Lista ocen kształtujących / opisowych
 */

/**
 * Pomocnicza funkcja do parsowania tooltipu oceny
 * @param {string} title Tooltip z atrybutu title w tagu oceny
 * @returns {object}
 */
function parseGradeTooltip(title) {
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
 * Parsuje kod HTML strony ocen Librus Synergia (/przegladaj_oceny/uczen)
 * @param {string} html Kod HTML strony
 * @returns {GradesData}
 */
export function parseGrades(html) {
  if (!html || typeof html !== 'string') {
    return { grades: [], subjects: [], formativeGrades: [] };
  }

  const $ = cheerio.load(html);
  const grades = [];
  const subjects = [];
  const formativeGrades = [];

  // 1. Tabela główna ocen bieżących
  const mainTable = $('table.decorated.stretch').filter((_, el) => {
    return $(el).find('th:contains("Przedmiot"), td:contains("Przedmiot")').length > 0;
  }).first();

  if (mainTable.length > 0) {
    const rows = mainTable.find('> tbody > tr, > tr');

    rows.each((_, tr) => {
      const cells = $(tr).children('td');
      if (cells.length >= 8) {
        const subject = $(cells[1]).text().trim();
        if (!subject || subject === 'Przedmiot' || subject.includes('Oceny')) return;

        const sem1Avg = $(cells[3]).text().trim() || null;
        const sem1Grade = $(cells[4]).text().trim() || null;
        const sem2Avg = $(cells[6]).text().trim() || null;
        const sem2Grade = $(cells[7]).text().trim() || null;
        const yearAvg = $(cells[8]).text().trim() || null;
        const yearGrade = $(cells[9]).text().trim() || null;

        const parseCellGrades = (cell, semester) => {
          const cellGrades = [];
          $(cell).find('span.grade-box').each((_, span) => {
            const a = $(span).find('a.ocena');
            if (!a.length) return;

            const gradeText = a.text().trim();
            const href = a.attr('href') || null;
            const title = a.attr('title') || '';
            const idMatch = href ? href.match(/\/(\d+)$/) : null;
            const id = idMatch ? idMatch[1] : null;

            const details = parseGradeTooltip(title);

            let date = details['data'] || '';
            const dateMatch = date.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              date = dateMatch[1];
            }

            let weight = null;
            if (details['waga'] || details['waga oceny']) {
              const parsedWeight = parseFloat(details['waga'] || details['waga oceny']);
              if (!isNaN(parsedWeight)) {
                weight = parsedWeight;
              }
            }

            cellGrades.push({
              id,
              subject,
              grade: gradeText,
              semester,
              category: details['kategoria'] || '',
              date,
              teacher: details['nauczyciel'] || '',
              addedBy: details['dodał'] || details['dodal'] || '',
              comment: details['komentarz'] || '',
              weight,
              href
            });
          });
          return cellGrades;
        };

        const s1Grades = parseCellGrades(cells[2], 1);
        const s2Grades = parseCellGrades(cells[5], 2);

        grades.push(...s1Grades, ...s2Grades);

        subjects.push({
          subject,
          semester1: {
            grades: s1Grades,
            average: sem1Avg,
            finalGrade: sem1Grade
          },
          semester2: {
            grades: s2Grades,
            average: sem2Avg,
            finalGrade: sem2Grade
          },
          year: {
            average: yearAvg,
            finalGrade: yearGrade
          }
        });
      }
    });
  }

  // 2. Tabela ocen kształtujących / opisowych
  const descTable = $('table.decorated.stretch').filter((_, el) => {
    return $(el).find('th:contains("Ocena kształtująca"), td:contains("Ocena kształtująca")').length > 0;
  }).first();

  if (descTable.length > 0) {
    const descRows = descTable.find('> tbody > tr, > tr');
    let currentSubject = '';

    descRows.each((_, tr) => {
      const row = $(tr);
      if (row.find('th:contains("Ocena kształtująca"), td:contains("Ocena kształtująca")').length > 0) {
        return;
      }

      const cells = row.children('td, th');
      if (cells.length === 6) {
        currentSubject = $(cells[0]).text().trim();
        const text = $(cells[1]).text().trim().replace(/\s+/g, ' ');
        const category = $(cells[2]).text().trim();
        const period = parseInt($(cells[3]).text().trim(), 10) || 1;
        const date = $(cells[4]).text().trim();
        const type = $(cells[5]).text().trim();

        if (text) {
          formativeGrades.push({
            subject: currentSubject,
            text,
            category,
            semester: period,
            date,
            type
          });
        }
      } else if (cells.length === 5) {
        const text = $(cells[0]).text().trim().replace(/\s+/g, ' ');
        const category = $(cells[1]).text().trim();
        const period = parseInt($(cells[2]).text().trim(), 10) || 1;
        const date = $(cells[3]).text().trim();
        const type = $(cells[4]).text().trim();

        if (text) {
          formativeGrades.push({
            subject: currentSubject,
            text,
            category,
            semester: period,
            date,
            type
          });
        }
      }
    });
  }

  return {
    grades,
    subjects,
    formativeGrades
  };
}
