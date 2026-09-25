import {
  AuthenticationError,
  TwoFactorRequiredError,
  CaptchaRequiredError,
  LibrusError
} from '../errors/index.js';
import { parseUserInfo } from '../parsers/UserInfoParser.js';
import * as cheerio from 'cheerio';

export class AuthManager {
  /**
   * @param {import('./HttpClient.js').HttpClient} httpClient 
   */
  constructor(httpClient) {
    this.http = httpClient;
    this.isLoggedIn = false;
    this.accountInfo = null;
  }

  /**
   * Logowanie kontem Synergia (login i hasło)
   * @param {string} login 
   * @param {string} password 
   * @returns {Promise<{success: boolean, user?: object}>}
   */
  async login(login, password) {
    if (!login || !password) {
      throw new AuthenticationError('Wymagany jest login oraz hasło do logowania.');
    }

    // 1. Inicjalizacja sesji z bramki Synergia (ustawia oauth_state na synergia.librus.pl oraz przekierowuje do api.librus.pl)
    const startUrl = `https://synergia.librus.pl/loguj/portalRodzina?v=${Date.now()}`;
    const initRes = await this.http.get(startUrl, { followRedirects: true });
    if (!initRes.ok && initRes.status !== 302) {
      throw new LibrusError(`Błąd inicjalizacji autoryzacji Librus: HTTP ${initRes.status}`);
    }

    const authPostUrl = 'https://api.librus.pl/OAuth/Authorization?client_id=46';

    // 2. Wysłanie formularza logowania
    const payload = {
      action: 'login',
      login: login.trim(),
      pass: password
    };

    const loginRes = await this.http.post(authPostUrl, payload, {
      followRedirects: false,
      headers: {
        'Referer': authPostUrl,
        'Origin': 'https://api.librus.pl'
      }
    });

    const responseText = await loginRes.text();

    // Sprawdzenie błędów
    if (responseText.includes('Nieprawidłowy login i/lub hasło') || 
        responseText.includes('Błędny login lub hasło') ||
        responseText.includes('Nieprawidłowy login lub hasło')) {
      throw new AuthenticationError('Nieprawidłowy login i/lub hasło.');
    }

    if (responseText.includes('Twoje konto zostało zablokowane')) {
      throw new AuthenticationError('Konto Librus zostało zablokowane.');
    }

    if (responseText.includes('Wymagana zmiana hasła') || responseText.includes('hasło wygasło')) {
      throw new AuthenticationError('Wymagana jest zmiana hasła w systemie Librus przed zalogowaniem.');
    }

    if (responseText.includes('g-recaptcha') || responseText.includes('h-captcha') || responseText.includes('cf-turnstile')) {
      throw new CaptchaRequiredError('Wykryto zabezpieczenie CAPTCHA podczas logowania.');
    }

    // Przetwarzanie odpowiedzi JSON z polem goTo
    let goToUrl = null;
    try {
      const jsonRes = JSON.parse(responseText);
      if (jsonRes.status === 'ok' && jsonRes.goTo) {
        goToUrl = new URL(jsonRes.goTo, 'https://api.librus.pl').toString();
      } else if (jsonRes.errors && Array.isArray(jsonRes.errors)) {
        const errorMsg = jsonRes.errors.map(e => e.message).join('; ');
        throw new AuthenticationError(`Błąd logowania: ${errorMsg}`);
      }
    } catch (e) {
      if (e instanceof AuthenticationError) throw e;
      // Jeśli nie JSON, sprawdzamy nagłówek Location
      const loc = loginRes.headers.get('location');
      if (loc) {
        goToUrl = new URL(loc, 'https://api.librus.pl').toString();
      }
    }

    // 3. Podążanie za łańcuchem przekierowań OAuth (goTo) aż do powrotu do Synergii
    if (goToUrl) {
      let currentUrl = goToUrl;
      while (currentUrl) {
        const res = await this.http.get(currentUrl, { followRedirects: false });
        const loc = res.headers.get('location');
        if (loc) {
          currentUrl = new URL(loc, currentUrl).toString();
        } else {
          break;
        }
      }
    }

    // 4. Weryfikacja zalogowania przez pobranie widoku Synergia (rodzic/index lub terminarz)
    const homeRes = await this.http.get('https://synergia.librus.pl/rodzic/index');
    const homeHtml = await homeRes.text();

    if (homeHtml.includes('/wyloguj') || homeHtml.includes('jesteś zalogowany jako:')) {
      this.isLoggedIn = true;
      this.accountInfo = parseUserInfo(homeHtml);
      return {
        success: true,
        user: this.accountInfo
      };
    }

    const verifyRes = await this.http.get('https://synergia.librus.pl/terminarz/dodane_od_ostatniego_logowania');
    const verifyHtml = await verifyRes.text();

    if (verifyHtml.includes('/wyloguj') || verifyHtml.includes('jesteś zalogowany jako:')) {
      this.isLoggedIn = true;
      this.accountInfo = parseUserInfo(verifyHtml);
      return {
        success: true,
        user: this.accountInfo
      };
    }

    // Sprawdzenie panelu ucznia WCAG / gateway
    const wcagRes = await this.http.get('https://synergia.librus.pl/gateway/ms/studentdatapanel/ui/');
    const wcagHtml = await wcagRes.text();
    if (wcagRes.ok && (wcagHtml.includes('Wyloguj') || wcagHtml.includes('szczęśliwy numerek') || wcagHtml.includes('panel ucznia'))) {
      this.isLoggedIn = true;
      this.accountInfo = parseUserInfo(wcagHtml);
      return {
        success: true,
        user: this.accountInfo
      };
    }

    throw new AuthenticationError('Nie udało się potwierdzić sesji Librus Synergia po zalogowaniu.');
  }

  /**
   * Wylogowanie z systemu Librus Synergia i wyczyszczenie sesji
   * @returns {Promise<boolean>}
   */
  async logout() {
    try {
      await this.http.get('https://synergia.librus.pl/wyloguj');
    } catch (e) {
      // Ignorujemy ew. błędy sieciowe przy samym wylogowaniu
    } finally {
      this.http.cookieJar.clear();
      this.isLoggedIn = false;
      this.accountInfo = null;
    }
    return true;
  }
}
