import * as cheerio from 'cheerio';

/**
 * @typedef {object} MessageHeader
 * @property {string} id - Identyfikator wiadomości
 * @property {string} sender - Nadawca wiadomości (lub odbiorca w skrzynce wysłanych)
 * @property {string} subject - Temat wiadomości
 * @property {string} date - Data wysłania
 * @property {boolean} isRead - Czy wiadomość została przeczytana
 * @property {boolean} hasAttachment - Czy zawiera załącznik
 * @property {string} url - Relatywny URL do pełnej treści
 */

/**
 * @typedef {object} MessageAttachment
 * @property {string} id - Identyfikator załącznika
 * @property {string} name - Nazwa pliku
 * @property {string} url - URL do pobrania załącznika
 * @property {string|null} size - Rozmiar pliku (np. '245 KB')
 */

/**
 * @typedef {object} MessageDetails
 * @property {string} id - Identyfikator wiadomości
 * @property {string} sender - Nadawca
 * @property {string} recipient - Adresat
 * @property {string} subject - Temat
 * @property {string} date - Data wysłania
 * @property {string} content - Treść tekstowa wiadomości
 * @property {string} contentHtml - Treść HTML wiadomości
 * @property {MessageAttachment[]} attachments - Lista załączników
 */

/**
 * Parsuje listę wiadomości (skrzynka odbiorcza, wysłane, kosz)
 * @param {string} html 
 * @returns {MessageHeader[]}
 */
export function parseMessagesList(html) {
  if (!html || typeof html !== 'string') return [];

  const $ = cheerio.load(html);
  const messages = [];

  $('table.decorated tbody tr, table.decorated tr').each((_, tr) => {
    // Pomijamy nagłówek z checkboxem "zaznacz wszystkie"
    if ($(tr).find('input[name="zaznacz_wszystkie"], input#wiadomosciListaWszystkie').length > 0) {
      return;
    }

    const tds = $(tr).find('td');
    if (tds.length < 3) return; // Pomijamy puste wiersze

    // 1. Znalezienie linku do wiadomości
    const linkEls = $(tr).find('a[href*="/wiadomosci/"]');
    if (linkEls.length === 0) return;

    // Wyciągnięcie ID wiadomości
    let id = null;
    const checkboxVal = $(tr).find('input.wiadomoscLista[type="checkbox"], input[type="checkbox"]').val();
    if (checkboxVal && checkboxVal !== 'on' && /^\d+$/.test(checkboxVal)) {
      id = checkboxVal;
    }

    let href = '';
    linkEls.each((_, a) => {
      const h = $(a).attr('href') || '';
      if (!href && h.includes('/wiadomosci/')) {
        href = h;
      }
      if (!id) {
        const m = h.match(/\/wiadomosci\/(?:[0-9]+\/)+([0-9]+)/) || h.match(/\/wiadomosci\/([0-9]+)/);
        if (m) id = m[1];
      }
    });

    if (!id) return;

    // 2. Temat i Nadawca
    let sender = '';
    let subject = '';

    const td1Text = $(tds[1]).text().trim().replace(/\s+/g, ' ');
    const td2Text = $(tds[2]).text().trim().replace(/\s+/g, ' ');
    const td3Text = tds.length >= 4 ? $(tds[3]).text().trim().replace(/\s+/g, ' ') : '';

    if (td1Text.length > 0 && !$(tds[1]).find('img[src*="attachment"], img[alt*="plik"]').length) {
      // Układ z fixture: td[1] = Nadawca, td[2] = Temat
      sender = td1Text;
      subject = td2Text;
    } else if (tds.length >= 5) {
      // Układ live 6 kolumn: td[1] = ikona, td[2] = Nadawca, td[3] = Temat
      sender = td2Text;
      subject = td3Text;
    } else {
      const topicLink = linkEls.last();
      subject = topicLink.text().trim();
      const senderLink = linkEls.first();
      sender = senderLink.text().trim();
    }

    // 3. Wyszukiwanie kolumny z datą (format RRRR-MM-DD HH:MM:SS lub RRRR-MM-DD)
    let date = '';
    const dateRegex = /\d{4}-\d{2}-\d{2}/;

    tds.each((idx, td) => {
      const text = $(td).text().trim().replace(/\s+/g, ' ');
      if (dateRegex.test(text) && !date) {
        date = text;
      }
    });

    // 4. Status przeczytania
    const linkEl = $(tr).find('a[href*="/wiadomosci/"]').last();
    const isBold = linkEl.find('b, strong').length > 0 || linkEl.parent().is('b, strong') || $(tr).find('b, strong').length > 0;
    const isUnreadClass = $(tr).hasClass('unread') || $(tr).find('.unread').length > 0;
    const isRead = !(isBold || isUnreadClass);

    // 5. Załącznik
    const hasAttachment = $(tr).find('img[src*="clip"], img[alt*="plik"], img[src*="attachment"], .existing-msg-files-icon').length > 0;

    messages.push({
      id: String(id),
      sender: sender || 'Nieznany',
      subject: subject || '(brak tematu)',
      date,
      isRead,
      hasAttachment,
      url: href || `/wiadomosci/1/5/${id}/f0`
    });
  });

  return messages;
}

/**
 * Parsuje szczegóły pojedynczej wiadomości
 * @param {string} html 
 * @param {string|number} [messageId]
 * @returns {MessageDetails}
 */
export function parseMessageDetails(html, messageId = '') {
  if (!html || typeof html !== 'string') {
    throw new Error('Pusty kod HTML wiadomości');
  }

  const $ = cheerio.load(html);

  // Wyciąganie metadanych z tabeli nagłówkowej
  let sender = '';
  let recipient = '';
  let date = '';
  let subject = '';

  $('table.decorated tr, table.stretch tr, .container-message tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length >= 2) {
      const label = $(tds[0]).text().toLowerCase().trim();
      const val = $(tds[1]).text().trim().replace(/\s+/g, ' ');

      if (label.includes('nadawca') && !sender) sender = val;
      else if (label.includes('adresat') && !recipient) recipient = val;
      else if ((label.includes('wysłano') || label.includes('data')) && !date) date = val;
      else if (label.includes('temat') && !subject) subject = val;
    } else if (tds.length === 1) {
      const text = $(tds[0]).text().trim().replace(/\s+/g, ' ');
      if (text.startsWith('Nadawca') && !sender) sender = text.replace(/^Nadawca\s*/i, '');
      else if (text.startsWith('Temat') && !subject) subject = text.replace(/^Temat\s*/i, '');
      else if (text.startsWith('Wysłano') && !date) date = text.replace(/^Wysłano\s*/i, '');
      else if (text.startsWith('Adresat') && !recipient) recipient = text.replace(/^Adresat\s*/i, '');
    }
  });

  // Treść wiadomości
  let contentContainer = $('.container-message-content');
  if (contentContainer.length === 0) {
    contentContainer = $('.message-content, #messageContent, .content');
  }

  // Zamiana <br> na \n dla czystego tekstu
  const contentHtml = contentContainer.html()?.trim() || '';
  const contentClone = contentContainer.clone();
  contentClone.find('br').replaceWith('\n');
  const content = contentClone.text().trim();

  // Załączniki
  const attachments = [];
  $('a[href*="pobierz_zalacznik"], a[href*="zalacznik"]').each((_, a) => {
    const url = $(a).attr('href') || '';
    const name = $(a).text().trim();
    
    // Identyfikator załącznika z linku
    const idMatch = url.match(/pobierz_zalacznik\/(?:[0-9]+\/)?([0-9]+)/);
    const id = idMatch ? idMatch[1] : '';

    // Rozmiar załącznika
    const parentText = $(a).parent().text();
    const sizeMatch = parentText.match(/\(([^)]+)\)/);
    const size = sizeMatch ? sizeMatch[1].trim() : null;

    if (url) {
      attachments.push({
        id,
        name,
        url,
        size
      });
    }
  });

  return {
    id: String(messageId || ''),
    sender,
    recipient,
    subject,
    date,
    content,
    contentHtml,
    attachments
  };
}
