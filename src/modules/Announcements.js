import { parseAnnouncements } from '../parsers/AnnouncementsParser.js';
import { normalizeDate, isAfterOrEqual } from '../utils/dateUtils.js';

export class Announcements {
  /**
   * @param {import('../client/HttpClient.js').HttpClient} httpClient 
   */
  constructor(httpClient) {
    this.http = httpClient;
  }

  /**
   * Pobiera listę ogłoszeń szkolnych
   * @param {object} [options] Opcje pobierania
   * @param {Date|string|number} [options.since] Zwraca tylko ogłoszenia z datą nowszą lub równą podanej
   * @returns {Promise<import('../parsers/AnnouncementsParser.js').AnnouncementItem[]>}
   */
  async list(options = {}) {
    const url = 'https://synergia.librus.pl/ogloszenia';
    const html = await this.http.getHtml(url);
    const announcements = parseAnnouncements(html);

    if (options && options.since) {
      const targetDate = normalizeDate(options.since);
      if (!targetDate) {
        throw new Error(`Nieprawidłowy format daty 'since': ${options.since}`);
      }
      return announcements.filter(item => isAfterOrEqual(item.date, targetDate));
    }

    return announcements;
  }

  /**
   * Pobiera ogłoszenia opublikowane od danej daty
   * @param {Date|string|number} sinceDate Data graniczna (np. '2026-09-24' lub '2026-09-24 15:00:00')
   * @returns {Promise<import('../parsers/AnnouncementsParser.js').AnnouncementItem[]>}
   */
  async getSince(sinceDate) {
    return this.list({ since: sinceDate });
  }

  /**
   * Alias dla metody list()
   * @param {object} [options]
   * @returns {Promise<import('../parsers/AnnouncementsParser.js').AnnouncementItem[]>}
   */
  async getAnnouncements(options = {}) {
    return this.list(options);
  }
}
