import { CookieJar } from './CookieJar.js';
import { LibrusError } from '../errors/index.js';

export class HttpClient {
  /**
   * @param {object} [options]
   * @param {string} [options.userAgent]
   * @param {number} [options.timeout=30000]
   */
  constructor(options = {}) {
    this.cookieJar = new CookieJar();
    this.userAgent = options.userAgent || 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.timeout = options.timeout || 30000;
  }

  /**
   * Wykonuje zapytanie HTTP z obsługą ciasteczek i manualnym śledzeniem przekierowań
   * @param {string} url 
   * @param {object} [options={}] 
   * @param {number} [maxRedirects=10]
   * @returns {Promise<Response>}
   */
  async request(url, options = {}, maxRedirects = 10) {
    let currentUrl = url;
    let currentOptions = { ...options };
    let redirectCount = 0;

    while (redirectCount <= maxRedirects) {
      const headers = new Headers(currentOptions.headers || {});

      // Domyślne nagłówki przeglądarkowe
      if (!headers.has('User-Agent')) {
        headers.set('User-Agent', this.userAgent);
      }
      if (!headers.has('Accept')) {
        headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8');
      }
      if (!headers.has('Accept-Language')) {
        headers.set('Accept-Language', 'pl,en-US;q=0.7,en;q=0.3');
      }

      // Dołączenie ciasteczek dla bieżącego URL
      const cookieHeader = this.cookieJar.getCookieString(currentUrl);
      if (cookieHeader) {
        headers.set('Cookie', cookieHeader);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      let response;
      try {
        response = await fetch(currentUrl, {
          ...currentOptions,
          headers,
          redirect: 'manual', // Przechwytujemy przekierowania ręcznie, aby zbierać Set-Cookie na każdym etapie
          signal: controller.signal
        });
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new LibrusError(`Timeout żądania (${this.timeout}ms) do ${currentUrl}`);
        }
        throw new LibrusError(`Błąd sieciowy podczas żądania do ${currentUrl}: ${err.message}`, 'NETWORK_ERROR', { originalError: err });
      } finally {
        clearTimeout(timeoutId);
      }

      // Odczyt i zapis ciasteczek Set-Cookie z odpowiedzi
      const setCookieHeaders = response.headers.getSetCookie 
        ? response.headers.getSetCookie() 
        : [response.headers.get('set-cookie')].filter(Boolean);

      this.cookieJar.setCookiesFromResponse(setCookieHeaders, currentUrl);

      // Obsługa przekierowań (301, 302, 303, 307, 308)
      const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
      const location = response.headers.get('location');

      if (isRedirect && location && (options.followRedirects !== false)) {
        redirectCount++;
        const nextUrl = new URL(location, currentUrl).toString();

        // Przy 303 zawsze zmieniamy metodę na GET bez body, przy 301/302 w przeglądarkach zwykle też
        let nextMethod = currentOptions.method || 'GET';
        let nextBody = currentOptions.body;

        if (response.status === 303 || ((response.status === 301 || response.status === 302) && nextMethod === 'POST')) {
          nextMethod = 'GET';
          nextBody = undefined;
        }

        const nextHeaders = new Headers(currentOptions.headers || {});
        nextHeaders.set('Referer', currentUrl);
        nextHeaders.delete('Content-Type');
        nextHeaders.delete('Content-Length');

        currentUrl = nextUrl;
        currentOptions = {
          method: nextMethod,
          headers: nextHeaders,
          body: nextBody
        };
        continue;
      }

      // Przy braku dalszych przekierowań zwracamy odpowiedź
      return response;
    }

    throw new LibrusError(`Przekroczono limit przekierowań (${maxRedirects}) dla ${url}`, 'TOO_MANY_REDIRECTS');
  }

  /**
   * Wykonuje żądanie GET
   * @param {string} url 
   * @param {object} [options] 
   * @returns {Promise<Response>}
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * Wykonuje żądanie POST (z danymi URLSearchParams lub stringiem)
   * @param {string} url 
   * @param {string|URLSearchParams|object} body 
   * @param {object} [options] 
   * @returns {Promise<Response>}
   */
  async post(url, body, options = {}) {
    const headers = new Headers(options.headers || {});
    let formattedBody = body;

    if (body instanceof URLSearchParams) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/x-www-form-urlencoded');
      }
      formattedBody = body.toString();
    } else if (typeof body === 'object' && !(body instanceof String) && !(body instanceof Buffer) && !(body instanceof Uint8Array)) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/x-www-form-urlencoded');
      }
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      formattedBody = params.toString();
    }

    return this.request(url, {
      ...options,
      method: 'POST',
      headers,
      body: formattedBody
    });
  }

  /**
   * Pomocnicza metoda zwracająca tekst HTML odpowiedzi
   * @param {string} url 
   * @param {object} [options] 
   * @returns {Promise<string>}
   */
  async getHtml(url, options = {}) {
    const res = await this.get(url, options);
    return res.text();
  }
}
