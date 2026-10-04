import { parseMessagesList, parseMessageDetails } from '../parsers/MessagesParser.js';
import { normalizeDate, isAfterOrEqual } from '../utils/dateUtils.js';

export class Messages {
  /**
   * @param {import('../client/HttpClient.js').HttpClient} httpClient 
   */
  constructor(httpClient) {
    this.http = httpClient;
  }

  /**
   * Pobiera listę wiadomości z wybranego folderu
   * @param {number|object} [folderOrOptions=1] 1 = odebrane, 2 = wysłane, 3 = kosz LUB obiekt opcji
   * @param {number|object} [pageOrOptions=1] Numer strony (paginacja) LUB obiekt opcji
   * @returns {Promise<import('../parsers/MessagesParser.js').MessageHeader[]>}
   */
  async list(folderOrOptions = 1, pageOrOptions = 1) {
    let folderId = 1;
    let page = 1;
    let since = null;
    let maxPages = 10;

    if (typeof folderOrOptions === 'object' && folderOrOptions !== null) {
      folderId = folderOrOptions.folderId ?? 1;
      page = folderOrOptions.page ?? 1;
      since = folderOrOptions.since ?? null;
      maxPages = folderOrOptions.maxPages ?? 10;
    } else {
      folderId = Number(folderOrOptions) || 1;
      if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
        page = pageOrOptions.page ?? 1;
        since = pageOrOptions.since ?? null;
        maxPages = pageOrOptions.maxPages ?? 10;
      } else {
        page = Number(pageOrOptions) || 1;
      }
    }

    if (since) {
      return this.getSince(since, { folderId, maxPages });
    }

    let url = 'https://synergia.librus.pl/wiadomosci';
    if (folderId === 2 || folderId === 6) {
      url = 'https://synergia.librus.pl/wiadomosci/6';
    } else if (folderId === 3 || folderId === 7) {
      url = 'https://synergia.librus.pl/wiadomosci/7';
    } else if (folderId === 1 || folderId === 5) {
      url = 'https://synergia.librus.pl/wiadomosci/5';
    }

    if (page > 1) {
      url += `/page/${page}`;
    }

    const html = await this.http.getHtml(url);
    return parseMessagesList(html);
  }

  /**
   * Pobiera wiadomości nowsze lub równe podanej dacie/czasowi (np. z poprzedniego uruchomienia)
   * Automatycznie przegląda kolejne strony dopóki data wiadomości >= sinceDate.
   * @param {Date|string|number} sinceDate Data graniczna (np. '2026-09-24 15:00:00' lub instancja Date)
   * @param {object} [options]
   * @param {number} [options.folderId=1] 1 = odebrane, 2 = wysłane, 3 = kosz
   * @param {number} [options.maxPages=10] Maksymalna liczba stron do sprawdzenia
   * @returns {Promise<import('../parsers/MessagesParser.js').MessageHeader[]>}
   */
  async getSince(sinceDate, options = {}) {
    const targetDate = normalizeDate(sinceDate);
    if (!targetDate) {
      throw new Error(`Nieprawidłowy format daty 'since': ${sinceDate}`);
    }

    const folderId = options.folderId ?? 1;
    const maxPages = options.maxPages ?? 10;
    const results = [];

    for (let page = 1; page <= maxPages; page++) {
      const pageMessages = await this.list(folderId, page);
      if (!pageMessages || pageMessages.length === 0) {
        break;
      }

      let reachedOlder = false;
      for (const msg of pageMessages) {
        if (isAfterOrEqual(msg.date, targetDate)) {
          results.push(msg);
        } else {
          // Ponieważ wiadomości są posortowane malejąco po dacie, napotkanie starszej wiadomości
          // oznacza, że dalsze wiadomości na tej i kolejnych stronach również są starsze
          reachedOlder = true;
          break;
        }
      }

      if (reachedOlder) {
        break;
      }
    }

    return results;
  }

  /**
   * Pobiera wiadomości ze skrzynki odbiorczej
   * @param {number|object} [pageOrOptions=1] 
   * @returns {Promise<import('../parsers/MessagesParser.js').MessageHeader[]>}
   */
  async getInbox(pageOrOptions = 1) {
    if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
      return this.list({ ...pageOrOptions, folderId: 1 });
    }
    return this.list(1, pageOrOptions);
  }

  /**
   * Pobiera wiadomości ze skrzynki nadawczej (wysłane)
   * @param {number|object} [pageOrOptions=1] 
   * @returns {Promise<import('../parsers/MessagesParser.js').MessageHeader[]>}
   */
  async getSent(pageOrOptions = 1) {
    if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
      return this.list({ ...pageOrOptions, folderId: 2 });
    }
    return this.list(2, pageOrOptions);
  }

  /**
   * Pobiera wiadomości z kosza
   * @param {number|object} [pageOrOptions=1] 
   * @returns {Promise<import('../parsers/MessagesParser.js').MessageHeader[]>}
   */
  async getTrash(pageOrOptions = 1) {
    if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
      return this.list({ ...pageOrOptions, folderId: 3 });
    }
    return this.list(3, pageOrOptions);
  }

  /**
   * Pobiera pełną treść i załączniki konkretnej wiadomości
   * @param {string|number} messageId Identyfikator wiadomości lub relatywny/pełny URL wiadomości
   * @param {number} [folderId=1] Identyfikator folderu (1 = odebrane, 2/6 = wysłane, 3/7 = kosz)
   * @returns {Promise<import('../parsers/MessagesParser.js').MessageDetails>}
   */
  async getMessage(messageId, folderId = 1) {
    if (!messageId) {
      throw new Error('Wymagany jest identyfikator wiadomości (messageId).');
    }
    
    let url = '';
    if (typeof messageId === 'string' && messageId.includes('/')) {
      url = messageId.startsWith('http') ? messageId : `https://synergia.librus.pl${messageId.startsWith('/') ? '' : '/'}${messageId}`;
    } else {
      const isSent = folderId === 2 || folderId === 6;
      const isTrash = folderId === 3 || folderId === 7;
      const fNum = isSent ? 6 : (isTrash ? 7 : 5);
      // W Synergii wiadomości wysłane mają URL w formacie /wiadomosci/1/6/{id}/f0 lub /wiadomosci/6/{id}
      url = isSent 
        ? `https://synergia.librus.pl/wiadomosci/1/6/${messageId}/f0`
        : `https://synergia.librus.pl/wiadomosci/${folderId}/${fNum}/${messageId}/f0`;
    }

    const res = await this.http.get(url);
    let html = await res.text();

    // Fallback do prostego URL jeśli f0 nie istnieje
    if (res.status === 404 || html.includes('Brak dostępu')) {
      const isSent = folderId === 2 || folderId === 6;
      const fallbackFolder = isSent ? 6 : folderId;
      const fallbackUrl = `https://synergia.librus.pl/wiadomosci/${fallbackFolder}/${messageId}`;
      const fallbackRes = await this.http.get(fallbackUrl);
      html = await fallbackRes.text();
    }

    return parseMessageDetails(html, messageId);
  }

  /**
   * Pobiera pełną treść i załączniki wiadomości wysłanej
   * @param {string|number} messageId Identyfikator wiadomości lub link do wiadomości
   * @returns {Promise<import('../parsers/MessagesParser.js').MessageDetails>}
   */
  async getSentMessage(messageId) {
    return this.getMessage(messageId, 6);
  }

  /**
   * Pobiera zawartość pliku załącznika
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
