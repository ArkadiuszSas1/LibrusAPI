import { parseAttendance } from '../parsers/AttendanceParser.js';
import { normalizeDate, isAfterOrEqual } from '../utils/dateUtils.js';

export class Attendance {
  /**
   * @param {import('../client/HttpClient.js').HttpClient} httpClient 
   */
  constructor(httpClient) {
    this.http = httpClient;
  }

  /**
   * Pobiera pełne dane o frekwencji (pojedyncze wpisy, podsumowania dzienne oraz okresowe)
   * @param {object} [options]
   * @param {Date|string|number} [options.since] Filtruje wpisy i dni od podanej daty
   * @param {number} [options.period] Filtruje po semestrze / okresie (1 lub 2)
   * @param {string} [options.type] Filtruje po typie (np. 'spóźnienie', 'nieobecność')
   * @param {string} [options.subject] Filtruje po nazwie przedmiotu
   * @returns {Promise<import('../parsers/AttendanceParser.js').AttendanceData>}
   */
  async getFull(options = {}) {
    const url = 'https://synergia.librus.pl/przegladaj_nb/uczen';
    const html = await this.http.getHtml(url);
    const data = parseAttendance(html);

    let filteredEntries = data.entries;
    let filteredDays = data.days;

    if (options.since) {
      const targetDate = normalizeDate(options.since);
      if (!targetDate) {
        throw new Error(`Nieprawidłowy format daty 'since': ${options.since}`);
      }
      filteredEntries = filteredEntries.filter(e => isAfterOrEqual(e.date, targetDate));
      filteredDays = filteredDays.filter(d => isAfterOrEqual(d.date, targetDate));
    }

    if (options.period) {
      const periodNum = parseInt(options.period, 10);
      filteredEntries = filteredEntries.filter(e => e.period === periodNum);
      filteredDays = filteredDays.filter(d => d.period === periodNum);
    }

    if (options.type) {
      const typeFilter = options.type.toLowerCase();
      filteredEntries = filteredEntries.filter(e => 
        e.type.toLowerCase().includes(typeFilter) || e.symbol.toLowerCase() === typeFilter
      );
    }

    if (options.subject) {
      const subjFilter = options.subject.toLowerCase();
      filteredEntries = filteredEntries.filter(e => 
        e.subject.toLowerCase().includes(subjFilter)
      );
    }

    return {
      entries: filteredEntries,
      days: filteredDays,
      periodTotals: data.periodTotals
    };
  }

  /**
   * Pobiera listę pojedynczych zdarzeń frekwencji (np. spóźnienia, nieobecności)
   * @param {object} [options]
   * @param {Date|string|number} [options.since] Data graniczna wystawienia
   * @param {number} [options.period] Semestr (1 lub 2)
   * @param {string} [options.type] Typ (np. 'spóźnienie')
   * @param {string} [options.subject] Przedmiot
   * @returns {Promise<import('../parsers/AttendanceParser.js').AttendanceEntry[]>}
   */
  async list(options = {}) {
    const full = await this.getFull(options);
    return full.entries;
  }

  /**
   * Pobiera zdarzenia frekwencji od podanej daty
   * @param {Date|string|number} sinceDate Data graniczna (np. '2026-09-20' lub Date)
   * @param {object} [options] Dodatkowe filtry
   * @returns {Promise<import('../parsers/AttendanceParser.js').AttendanceEntry[]>}
   */
  async getSince(sinceDate, options = {}) {
    return this.list({ ...options, since: sinceDate });
  }

  /**
   * Pobiera zestawienie dzienne frekwencji
   * @param {object} [options]
   * @param {Date|string|number} [options.since]
   * @param {number} [options.period]
   * @returns {Promise<import('../parsers/AttendanceParser.js').AttendanceDaySummary[]>}
   */
  async getDays(options = {}) {
    const full = await this.getFull(options);
    return full.days;
  }

  /**
   * Pobiera podsumowania okresowe/semestralne
   * @returns {Promise<import('../parsers/AttendanceParser.js').AttendancePeriodTotal[]>}
   */
  async getTotals() {
    const full = await this.getFull();
    return full.periodTotals;
  }
}
