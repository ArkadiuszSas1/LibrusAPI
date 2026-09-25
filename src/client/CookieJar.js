/**
 * Lekki i niezawodny magazyn ciasteczek HTTP obsługujący dopasowywanie domen i ścieżek.
 */
export class CookieJar {
  constructor() {
    /** @type {Map<string, {name: string, value: string, domain: string, path: string, secure: boolean, httpOnly: boolean, expires?: Date}>} */
    this.cookies = new Map();
  }

  /**
   * Zapisuje ciasteczka z nagłówków Set-Cookie odpowiedzi HTTP
   * @param {string[]|string} setCookieHeader 
   * @param {string} currentUrl 
   */
  setCookiesFromResponse(setCookieHeader, currentUrl) {
    if (!setCookieHeader) return;
    const headerList = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    const urlObj = new URL(currentUrl);
    const defaultDomain = urlObj.hostname;

    for (const rawCookie of headerList) {
      if (!rawCookie || typeof rawCookie !== 'string') continue;
      
      const parts = rawCookie.split(';').map(p => p.trim());
      const firstPart = parts[0];
      const eqIdx = firstPart.indexOf('=');
      if (eqIdx === -1) continue;

      const name = firstPart.slice(0, eqIdx).trim();
      const value = firstPart.slice(eqIdx + 1).trim();

      let domain = defaultDomain;
      let path = '/';
      let secure = false;
      let httpOnly = false;
      let expires = undefined;

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const [attrKey, ...attrValParts] = part.split('=');
        const key = attrKey.trim().toLowerCase();
        const val = attrValParts.join('=').trim();

        if (key === 'domain' && val) {
          domain = val.startsWith('.') ? val.slice(1) : val;
        } else if (key === 'path' && val) {
          path = val;
        } else if (key === 'secure') {
          secure = true;
        } else if (key === 'httponly') {
          httpOnly = true;
        } else if (key === 'expires' && val) {
          const d = new Date(val);
          if (!isNaN(d.getTime())) expires = d;
        } else if (key === 'max-age' && val) {
          const maxAgeSec = parseInt(val, 10);
          if (!isNaN(maxAgeSec)) {
            expires = new Date(Date.now() + maxAgeSec * 1000);
          }
        }
      }

      // Klucz unikalny dla ciasteczka w danym scope
      const key = `${domain}:${path}:${name}`;
      
      // Jeśli ciasteczko wygasło (np. max-age=0), usuwamy
      if (expires && expires.getTime() <= Date.now()) {
        this.cookies.delete(key);
      } else {
        this.cookies.set(key, {
          name,
          value,
          domain,
          path,
          secure,
          httpOnly,
          expires
        });
      }
    }
  }

  /**
   * Zwraca sformatowany ciąg dla nagłówka 'Cookie' dla wskazanego URL
   * @param {string} targetUrl 
   * @returns {string}
   */
  getCookieString(targetUrl) {
    const urlObj = new URL(targetUrl);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname || '/';
    const now = Date.now();

    const matchedCookies = [];

    for (const [key, cookie] of this.cookies.entries()) {
      if (cookie.expires && cookie.expires.getTime() <= now) {
        this.cookies.delete(key);
        continue;
      }

      // Sprawdzenie domeny (np. host 'synergia.librus.pl' pasuje do domeny 'librus.pl' lub 'synergia.librus.pl')
      const domainMatch = hostname === cookie.domain || hostname.endsWith('.' + cookie.domain);
      if (!domainMatch) continue;

      // Sprawdzenie ścieżki
      if (!pathname.startsWith(cookie.path)) continue;

      matchedCookies.push(`${cookie.name}=${cookie.value}`);
    }

    return matchedCookies.join('; ');
  }

  /**
   * Ręczne dodanie ciągu ciasteczek (np. z HAR lub nagłówka Cookie)
   * @param {string} cookieHeader 
   * @param {string} [domain='synergia.librus.pl'] 
   */
  setRawCookies(cookieHeader, domain = 'synergia.librus.pl') {
    if (!cookieHeader) return;
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const name = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      const key = `${domain}:/:${name}`;
      this.cookies.set(key, {
        name,
        value,
        domain,
        path: '/',
        secure: false,
        httpOnly: false
      });
    }
  }

  /**
   * Sprawdza czy ciasteczko o danej nazwie istnieje
   * @param {string} name 
   * @returns {boolean}
   */
  has(name) {
    for (const cookie of this.cookies.values()) {
      if (cookie.name === name && (!cookie.expires || cookie.expires.getTime() > Date.now())) {
        return true;
      }
    }
    return false;
  }

  /**
   * Pobiera wartość ciasteczka
   * @param {string} name 
   * @returns {string|null}
   */
  get(name) {
    for (const cookie of this.cookies.values()) {
      if (cookie.name === name && (!cookie.expires || cookie.expires.getTime() > Date.now())) {
        return cookie.value;
      }
    }
    return null;
  }

  /**
   * Czyści wszystkie zapisane ciasteczka
   */
  clear() {
    this.cookies.clear();
  }
}
