import { parseGrades } from '../parsers/GradesParser.js';
import { normalizeDate, isAfterOrEqual } from '../utils/dateUtils.js';

export class Grades {
  /**
   * @param {import('../client/HttpClient.js').HttpClient} httpClient 
   */
  constructor(httpClient) {
    this.http = httpClient;
  }

  /**
   * Pobiera pełne dane o ocenach (oceny cząstkowe, podsumowania przedmiotów, oceny kształtujące)
   * @param {object} [options]
   * @param {Date|string|number} [options.since] Filtruje oceny cząstkowe i kształtujące od podanej daty
   * @param {number} [options.semester] Filtruje oceny według semestru (1 lub 2)
   * @param {string} [options.subject] Filtruje po nazwie przedmiotu (case-insensitive)
   * @param {string} [options.category] Filtruje po kategorii (np. 'kartkówka', 'sprawdzian')
   * @returns {Promise<import('../parsers/GradesParser.js').GradesData>}
   */
  async getFull(options = {}) {
    const url = 'https://synergia.librus.pl/przegladaj_oceny/uczen';
    const html = await this.http.getHtml(url);
    const data = parseGrades(html);

    let filteredGrades = data.grades;
    let filteredFormative = data.formativeGrades;

    if (options.since) {
      const targetDate = normalizeDate(options.since);
      if (!targetDate) {
        throw new Error(`Nieprawidłowy format daty 'since': ${options.since}`);
      }
      filteredGrades = filteredGrades.filter(g => isAfterOrEqual(g.date, targetDate));
      filteredFormative = filteredFormative.filter(g => isAfterOrEqual(g.date, targetDate));
    }

    if (options.semester) {
      const sem = parseInt(options.semester, 10);
      filteredGrades = filteredGrades.filter(g => g.semester === sem);
      filteredFormative = filteredFormative.filter(g => g.semester === sem);
    }

    if (options.subject) {
      const subj = options.subject.toLowerCase();
      filteredGrades = filteredGrades.filter(g => g.subject.toLowerCase().includes(subj));
      filteredFormative = filteredFormative.filter(g => g.subject.toLowerCase().includes(subj));
    }

    if (options.category) {
      const cat = options.category.toLowerCase();
      filteredGrades = filteredGrades.filter(g => g.category.toLowerCase().includes(cat));
      filteredFormative = filteredFormative.filter(g => g.category.toLowerCase().includes(cat));
    }

    return {
      grades: filteredGrades,
      subjects: data.subjects,
      formativeGrades: filteredFormative
    };
  }

  /**
   * Pobiera płaską listę ocen cząstkowych
   * @param {object} [options]
   * @param {Date|string|number} [options.since] Data graniczna wystawienia
   * @param {number} [options.semester] Semestr (1 lub 2)
   * @param {string} [options.subject] Nazwa przedmiotu
   * @param {string} [options.category] Kategoria
   * @returns {Promise<import('../parsers/GradesParser.js').GradeItem[]>}
   */
  async list(options = {}) {
    const full = await this.getFull(options);
    return full.grades;
  }

  /**
   * Pobiera oceny wystawione od podanej daty
   * @param {Date|string|number} sinceDate Data graniczna (np. '2026-09-20' lub Date)
   * @param {object} [options] Dodatkowe filtry (semester, subject, category)
   * @returns {Promise<import('../parsers/GradesParser.js').GradeItem[]>}
   */
  async getSince(sinceDate, options = {}) {
    return this.list({ ...options, since: sinceDate });
  }

  /**
   * Pobiera podsumowanie ocen według przedmiotów (wraz ze średnimi i ocenami semestralnymi/rocznymi)
   * @param {object} [options]
   * @param {string} [options.subject] Filtruje podsumowanie do określonego przedmiotu
   * @returns {Promise<import('../parsers/GradesParser.js').SubjectGradesSummary[]>}
   */
  async getSubjects(options = {}) {
    const full = await this.getFull();
    if (options.subject) {
      const subj = options.subject.toLowerCase();
      return full.subjects.filter(s => s.subject.toLowerCase().includes(subj));
    }
    return full.subjects;
  }

  /**
   * Pobiera oceny kształtujące / opisowe
   * @param {object} [options]
   * @param {Date|string|number} [options.since]
   * @param {string} [options.subject]
   * @returns {Promise<import('../parsers/GradesParser.js').FormativeGradeItem[]>}
   */
  async getFormativeGrades(options = {}) {
    const full = await this.getFull(options);
    return full.formativeGrades;
  }
}
