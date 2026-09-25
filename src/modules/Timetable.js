import { parseAddedSinceLastLogin, parseCalendarMonth } from '../parsers/TimetableParser.js';
import { parseUserInfo } from '../parsers/UserInfoParser.js';
import { normalizeDate, isAfterOrEqual } from '../utils/dateUtils.js';
import * as cheerio from 'cheerio';

export class Timetable {
  /**
   * @param {import('../client/HttpClient.js').HttpClient} httpClient 
   */
  constructor(httpClient) {
    this.http = httpClient;
  }

  /**
   * Pobiera zdarzenia z kalendarza miesięcznego dla wybranego miesiąca i roku
   * @param {number} [month] Miesiąc (1-12). Domyślnie bieżący.
   * @param {number} [year] Rok (np. 2026). Domyślnie bieżący.
   * @returns {Promise<import('../parsers/TimetableParser.js').CalendarEvent[]>}
   */
  async getMonth(month, year) {
    let url = 'https://synergia.librus.pl/terminarz';
    let html = await this.http.getHtml(url);

    // Jeśli podano konkretny miesiąc i rok, wykonaj POST formularza terminarza
    if (month && year) {
      const $ = cheerio.load(html);
      const requestKey = $('input[name="requestkey"]').val() || '';

      const formData = new URLSearchParams();
      if (requestKey) formData.append('requestkey', requestKey);
      formData.append('miesiac', String(month));
      formData.append('rok', String(year));

      const res = await this.http.post(url, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': url
        }
      });
      html = await res.text();
    }

    return parseCalendarMonth(html);
  }

  /**
   * Pobiera zdarzenia z bieżącego miesiąca oraz kolejnych miesięcy (domyślnie następny miesiąc)
   * @param {object} [options]
   * @param {number} [options.monthsAhead=1] Ile miesięcy w przód pobrać (domyślnie 1 = bieżący + następny)
   * @param {Date|string|number} [options.since] Opcjonalny filtr zdarzeń (np. dodanych po dacie lub odbywających się po dacie)
   * @returns {Promise<import('../parsers/TimetableParser.js').CalendarEvent[]>}
   */
  async getUpcoming(options = {}) {
    const monthsAhead = options.monthsAhead ?? 1;
    const now = new Date();
    let currentYear = now.getFullYear();
    let currentMonth = now.getMonth() + 1; // 1-12

    const allEvents = [];
    const seenIds = new Set();

    for (let i = 0; i <= monthsAhead; i++) {
      let m = currentMonth + i;
      let y = currentYear;
      while (m > 12) {
        m -= 12;
        y += 1;
      }

      const monthEvents = await this.getMonth(m, y);
      for (const ev of monthEvents) {
        const uniqueKey = ev.id ? `id_${ev.id}` : `${ev.date}_${ev.title}_${ev.lessonNumber || ''}`;
        if (!seenIds.has(uniqueKey)) {
          seenIds.add(uniqueKey);
          allEvents.push(ev);
        }
      }
    }

    // Sortowanie chronologiczne
    allEvents.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

    if (options.since) {
      const targetDate = normalizeDate(options.since);
      if (!targetDate) {
        throw new Error(`Nieprawidłowy format daty 'since': ${options.since}`);
      }
      return allEvents.filter(ev => {
        // Jeśli zdarzenie ma datę dodania i jest nowsze, LUB data samego zdarzenia jest nowsza/równa
        const isAddedAfter = ev.addedDate ? isAfterOrEqual(ev.addedDate, targetDate) : false;
        const isEventAfter = isAfterOrEqual(ev.date, targetDate);
        return isAddedAfter || isEventAfter;
      });
    }

    return allEvents;
  }

  /**
   * Pobiera listę zdarzeń w terminarzu dodanych od ostatniego logowania
   * @param {object} [options]
   * @param {Date|string|number} [options.since] Filtruje zdarzenia dodane po/w podanej dacie
   * @returns {Promise<import('../parsers/TimetableParser.js').TimetableAddedEvent[]>}
   */
  async getAddedSinceLastLogin(options = {}) {
    const url = 'https://synergia.librus.pl/terminarz/dodane_od_ostatniego_logowania';
    const html = await this.http.getHtml(url);
    const items = parseAddedSinceLastLogin(html);

    if (options && options.since) {
      const targetDate = normalizeDate(options.since);
      if (!targetDate) {
        throw new Error(`Nieprawidłowy format daty 'since': ${options.since}`);
      }
      return items.filter(item => isAfterOrEqual(item.addedDate || item.date, targetDate));
    }

    return items;
  }

  /**
   * Pobiera zdarzenia dodane do terminarza od danej daty/godziny
   * @param {Date|string|number} sinceDate 
   * @returns {Promise<import('../parsers/TimetableParser.js').CalendarEvent[]>}
   */
  async getSince(sinceDate) {
    return this.getUpcoming({ since: sinceDate });
  }
}
