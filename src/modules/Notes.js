import { parseNotes } from '../parsers/NotesParser.js';
import { normalizeDate, isAfterOrEqual } from '../utils/dateUtils.js';

export class Notes {
  /**
   * @param {import('../client/HttpClient.js').HttpClient} httpClient 
   */
  constructor(httpClient) {
    this.http = httpClient;
  }

  /**
   * Pobiera listę uwag i pochwał ucznia
   * @param {object} [options]
   * @param {Date|string|number} [options.since] Zwraca uwagi wystawione od podanej daty
   * @param {string} [options.type] Filtruje po rodzaju ('negatywna', 'pozytywna')
   * @returns {Promise<import('../parsers/NotesParser.js').NoteItem[]>}
   */
  async list(options = {}) {
    const url = 'https://synergia.librus.pl/uwagi';
    const html = await this.http.getHtml(url);
    let notes = parseNotes(html);

    if (options.since) {
      const targetDate = normalizeDate(options.since);
      if (!targetDate) {
        throw new Error(`Nieprawidłowy format daty 'since': ${options.since}`);
      }
      notes = notes.filter(item => isAfterOrEqual(item.date, targetDate));
    }

    if (options.type) {
      const filterType = options.type.toLowerCase();
      notes = notes.filter(item => item.type.includes(filterType));
    }

    return notes;
  }

  /**
   * Pobiera uwagi wystawione od konkretnej daty
   * @param {Date|string|number} sinceDate Data graniczna (np. '2026-09-20' lub Date)
   * @returns {Promise<import('../parsers/NotesParser.js').NoteItem[]>}
   */
  async getSince(sinceDate) {
    return this.list({ since: sinceDate });
  }

  /**
   * Alias dla metody list()
   * @param {object} [options]
   * @returns {Promise<import('../parsers/NotesParser.js').NoteItem[]>}
   */
  async getNotes(options = {}) {
    return this.list(options);
  }
}
