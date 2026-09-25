import { HttpClient } from './client/HttpClient.js';
import { AuthManager } from './client/AuthManager.js';
import { Timetable } from './modules/Timetable.js';
import { Messages } from './modules/Messages.js';
import { Homework } from './modules/Homework.js';
import { Announcements } from './modules/Announcements.js';
import { Notes } from './modules/Notes.js';
import { Grades } from './modules/Grades.js';
import { Attendance } from './modules/Attendance.js';
import { parseUserInfo } from './parsers/UserInfoParser.js';

export class LibrusClient {
  /**
   * @param {object} [options]
   * @param {string} [options.userAgent]
   * @param {number} [options.timeout]
   */
  constructor(options = {}) {
    this.http = new HttpClient(options);
    this.auth = new AuthManager(this.http);
    this.timetable = new Timetable(this.http);
    this.messages = new Messages(this.http);
    this.homework = new Homework(this.http);
    this.announcements = new Announcements(this.http);
    this.notes = new Notes(this.http);
    this.grades = new Grades(this.http);
    this.attendance = new Attendance(this.http);
  }

  /**
   * Logowanie do systemu Librus
   * @param {object|string} credentials 
   * @param {string} [credentials.login]
   * @param {string} [credentials.password]
   * @param {string} [password]
   * @returns {Promise<{success: boolean, user?: object}>}
   */
  async login(credentials, password) {
    if (typeof credentials === 'string') {
      return this.auth.login(credentials, password);
    }
    return this.auth.login(credentials.login, credentials.password);
  }

  /**
   * Wylogowanie z systemu Librus
   * @returns {Promise<boolean>}
   */
  async logout() {
    return this.auth.logout();
  }

  /**
   * Sprawdza czy klient posiada aktywną sesję
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.auth.isLoggedIn;
  }

  /**
   * Zwraca informacje o zalogowanym profilu
   * @returns {object|null}
   */
  getUserInfo() {
    return this.auth.accountInfo;
  }

  /**
   * Pobiera aktualne informacje o profilu z serwera
   * @returns {Promise<object>}
   */
  async fetchUserInfo() {
    const html = await this.http.getHtml('https://synergia.librus.pl/terminarz/dodane_od_ostatniego_logowania');
    const info = parseUserInfo(html);
    this.auth.accountInfo = info;
    return info;
  }

  /**
   * Ręczne ustawienie ciasteczek sesji (np. z HAR lub przeglądarki)
   * @param {string} rawCookies 
   * @param {string} [domain='synergia.librus.pl']
   */
  setCookies(rawCookies, domain = 'synergia.librus.pl') {
    this.http.cookieJar.setRawCookies(rawCookies, domain);
    this.auth.isLoggedIn = true;
  }
}
