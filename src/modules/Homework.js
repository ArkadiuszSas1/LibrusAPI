import { parseHomeworkList, parseHomeworkDetails } from '../parsers/HomeworkParser.js';
import { normalizeDate, isAfterOrEqual } from '../utils/dateUtils.js';

export class Homework {
  /**
   * @param {import('../client/HttpClient.js').HttpClient} httpClient 
   */
  constructor(httpClient) {
    this.http = httpClient;
  }

  /**
   * Pobiera listę zadań domowych
   * @param {object} [options] Opcjonalne filtry dat i przedmiotów
   * @param {string} [options.fromDate] Data początkowa (format: YYYY-MM-DD)
   * @param {string} [options.toDate] Data końcowa (format: YYYY-MM-DD)
   * @param {Date|string|number} [options.since] Filtruje zadania zadane od podanej daty/godziny
   * @returns {Promise<import('../parsers/HomeworkParser.js').HomeworkItem[]>}
   */
  async list(options = {}) {
    let url = 'https://synergia.librus.pl/moje_zadania';
    const params = new URLSearchParams();

    let fromDate = options.fromDate;
    if (!fromDate && options.since) {
      const d = normalizeDate(options.since);
      if (d) {
        fromDate = d.toISOString().split('T')[0];
      }
    }

    if (fromDate) {
      params.append('dataOd', fromDate);
    }
    if (options.toDate) {
      params.append('dataDo', options.toDate);
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const html = await this.http.getHtml(url);
    const items = parseHomeworkList(html);

    if (options.since) {
      const targetDate = normalizeDate(options.since);
      if (!targetDate) {
        throw new Error(`Nieprawidłowy format daty 'since': ${options.since}`);
      }
      return items.filter(item => isAfterOrEqual(item.assignedDate, targetDate));
    }

    return items;
  }

  /**
   * Pobiera zadania domowe zadane od danej daty/godziny
   * @param {Date|string|number} sinceDate Data graniczna
   * @returns {Promise<import('../parsers/HomeworkParser.js').HomeworkItem[]>}
   */
  async getSince(sinceDate) {
    return this.list({ since: sinceDate });
  }

  /**
   * Pobiera szczegóły i treść konkretnego zadania domowego
   * @param {string|number} homeworkId Identyfikator zadania domowego
   * @returns {Promise<import('../parsers/HomeworkParser.js').HomeworkDetails>}
   */
  async getDetails(homeworkId) {
    if (!homeworkId) {
      throw new Error('Wymagany jest identyfikator zadania domowego (homeworkId).');
    }
    const url = `https://synergia.librus.pl/moje_zadania/podglad/${homeworkId}`;
    const html = await this.http.getHtml(url);
    return parseHomeworkDetails(html, homeworkId);
  }

  /**
   * Alias dla metody list()
   */
  async getHomework(options = {}) {
    return this.list(options);
  }

  /**
   * Alias dla metody getDetails()
   */
  async getHomeworkDetails(homeworkId) {
    return this.getDetails(homeworkId);
  }

  /**
   * Pobiera zawartość pliku załącznika zadania domowego
   * @param {string} attachmentUrl Pełny lub względny URL załącznika
   * @returns {Promise<ArrayBuffer>}
   */
  async downloadAttachment(attachmentUrl) {
    const fullUrl = attachmentUrl.startsWith('http') 
      ? attachmentUrl 
      : new URL(attachmentUrl, 'https://synergia.librus.pl').toString();
    
    const response = await this.http.get(fullUrl);
    return response.arrayBuffer();
  }
}
