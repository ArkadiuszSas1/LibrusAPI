import * as cheerio from 'cheerio';

/**
 * @typedef {object} HomeworkItem
 * @property {string} id - Identyfikator zadania domowego
 * @property {string} subject - Przedmiot (np. 'Język polski')
 * @property {string} teacher - Nauczyciel zadający
 * @property {string} category - Kategoria (np. 'Zadanie domowe', 'Projekt')
 * @property {string} topic - Temat zadania
 * @property {string} assignedDate - Data zadania
 * @property {string} dueDate - Termin oddania
 * @property {boolean} hasAttachment - Czy zadanie zawiera załączniki
 * @property {string|null} status - Status zadania (np. 'Nowe', 'Oddane')
 * @property {string|null} colorHex - Kolor statusu (np. '#90EE90')
 * @property {string} url - Relatywny URL do szczegółów zadania
 */

/**
 * @typedef {object} HomeworkAttachment
 * @property {string} id - Identyfikator załącznika
 * @property {string} name - Nazwa pliku
 * @property {string} url - URL do pobrania załącznika
 * @property {string|null} size - Rozmiar pliku (np. '180 KB')
 */

/**
 * @typedef {object} HomeworkDetails
 * @property {string} id - Identyfikator zadania
 * @property {string} subject - Przedmiot
 * @property {string} teacher - Nauczyciel
 * @property {string} category - Kategoria
 * @property {string} assignedDate - Data zadania
 * @property {string} dueDate - Termin oddania
 * @property {string} topic - Temat zadania
 * @property {string} content - Treść / polecenie zadania (tekst)
 * @property {string} contentHtml - Treść zadania w formacie HTML
 * @property {HomeworkAttachment[]} attachments - Lista załączników od nauczyciela
 */

/**
 * Parsuje listę zadań domowych z widoku /moje_zadania
 * @param {string} html 
 * @returns {HomeworkItem[]}
 */
export function parseHomeworkList(html) {
  if (!html || typeof html !== 'string') return [];

  const $ = cheerio.load(html);
  const items = [];

  // Wykrycie mapowania kolumn z thead jeśli istnieje
  let colMap = {
    subject: -1,
    teacher: -1,
    topic: -1,
    category: -1,
    assignedDate: -1,
    dueDate: -1,
    status: -1
  };

  $('table.decorated thead tr th, table.decorated thead tr td').each((idx, th) => {
    const text = $(th).text().trim().toLowerCase();
    if (text.includes('przedmiot')) colMap.subject = idx;
    else if (text.includes('nauczyciel')) colMap.teacher = idx;
    else if (text.includes('temat')) colMap.topic = idx;
    else if (text.includes('kategoria')) colMap.category = idx;
    else if (text.includes('data zadania') || text.includes('zadano')) colMap.assignedDate = idx;
    else if (text.includes('termin')) colMap.dueDate = idx;
    else if (text.includes('status')) colMap.status = idx;
  });

  $('table.decorated tbody tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 5) return;

    // Pomijamy wiersze formularza filtrów
    if ($(tr).find('select[name="przedmiot"], select[name="status"], input#dateFrom').length > 0) {
      return;
    }

    // Link lub przycisk do podglądu zadania
    const linkEl = $(tr).find('a[href*="/moje_zadania/podglad"], a[href*="/moje_zadania/szczegoly"]');
    const href = linkEl.attr('href') || '';
    
    let id = '';
    const idMatch = href.match(/\/moje_zadania\/(?:podglad|szczegoly)\/([0-9]+)/);
    if (idMatch) {
      id = idMatch[1];
    } else {
      const onclick = $(tr).find('[onclick*="podglad"], [onclick*="checkAsRead"]').attr('onclick') || '';
      const onclickMatch = onclick.match(/podglad\/([0-9]+)/) || onclick.match(/checkAsRead\(([0-9]+)\)/);
      if (onclickMatch) id = onclickMatch[1];
    }

    if (!id && !linkEl.length) return;

    // Kolor indykatora
    const boxEl = $(tr).find('.box, [class*="box"]');
    const boxStyle = boxEl.attr('style') || '';
    const colorMatch = boxStyle.match(/background-color:\s*([^;]+)/i);
    const colorHex = colorMatch ? colorMatch[1].trim() : null;

    let subject = '';
    let teacher = '';
    let topic = '';
    let category = '';
    let assignedDate = '';
    let dueDate = '';
    let status = null;

    const dateRegex = /\d{4}-\d{2}-\d{2}/;

    if (dateRegex.test($(tds[4]).text())) {
      // Live Synergia (10 kolumn):
      // td[0]=Przedmiot, td[1]=Nauczyciel, td[2]=Temat, td[3]=Kategoria, td[4]=Data zadania, td[6]=Termin
      subject = $(tds[0]).text().trim();
      teacher = $(tds[1]).text().trim().replace(/\s+/g, ' ');
      topic = $(tds[2]).text().trim();
      category = $(tds[3]).text().trim();
      assignedDate = $(tds[4]).text().trim();
      dueDate = tds.length >= 7 ? $(tds[6]).text().trim() : '';
      status = tds.length >= 9 ? $(tds[8]).text().trim() : null;
    } else if (dateRegex.test($(tds[1]).text())) {
      // Alternatywny / starszy układ:
      // td[0]=box, td[1]=Data zadania, td[2]=Termin, td[3]=Przedmiot, td[4]=Kategoria, td[5]=Nauczyciel, td[6]=Temat
      assignedDate = $(tds[1]).text().trim();
      dueDate = $(tds[2]).text().trim();
      subject = $(tds[3]).text().trim();
      category = $(tds[4]).text().trim();
      teacher = $(tds[5]).text().trim().replace(/\s+/g, ' ');
      topic = linkEl.text().trim() || $(tds[6]).text().trim();
      status = tds.length >= 9 ? $(tds[8]).text().trim() : null;
    } else if (colMap.subject !== -1 && colMap.teacher !== -1) {
      subject = $(tds[colMap.subject]).text().trim();
      teacher = $(tds[colMap.teacher]).text().trim().replace(/\s+/g, ' ');
      topic = colMap.topic !== -1 ? $(tds[colMap.topic]).text().trim() : '';
      category = colMap.category !== -1 ? $(tds[colMap.category]).text().trim() : '';
      assignedDate = colMap.assignedDate !== -1 ? $(tds[colMap.assignedDate]).text().trim() : '';
      dueDate = colMap.dueDate !== -1 ? $(tds[colMap.dueDate]).text().trim() : '';
      status = colMap.status !== -1 ? $(tds[colMap.status]).text().trim() : null;
    }

    if (!topic && linkEl.length) {
      topic = linkEl.text().trim();
    }

    const hasAttachment = $(tr).find('img[src*="clip"], img[alt*="Załącznik"], img[title*="załącznik"], img[src*="attachment"]').length > 0;

    items.push({
      id: String(id || ''),
      subject,
      teacher,
      category,
      topic,
      assignedDate,
      dueDate,
      hasAttachment,
      status: status === '-' ? null : status,
      colorHex,
      url: href || `/moje_zadania/podglad/${id}`
    });
  });

  return items;
}

/**
 * Parsuje szczegóły zadania domowego z widoku /moje_zadania/podglad/{id}
 * @param {string} html 
 * @param {string|number} [homeworkId]
 * @returns {HomeworkDetails}
 */
export function parseHomeworkDetails(html, homeworkId = '') {
  if (!html || typeof html !== 'string') {
    throw new Error('Pusty kod HTML zadania domowego');
  }

  const $ = cheerio.load(html);

  let subject = '';
  let teacher = '';
  let category = '';
  let assignedDate = '';
  let dueDate = '';
  let topic = '';
  let content = '';
  let contentHtml = '';

  $('table.decorated tr').each((_, tr) => {
    const label = $(tr).find('td:first-child').text().toLowerCase().trim();
    const valTd = $(tr).find('td:nth-child(2)');
    const val = valTd.text().trim().replace(/\s+/g, ' ');

    if (label.includes('przedmiot')) subject = val;
    else if (label.includes('nauczyciel')) teacher = val;
    else if (label.includes('kategoria')) category = val;
    else if (label.includes('data zadania') || label.includes('data dodania')) assignedDate = val;
    else if (label.includes('termin oddania') || label.includes('data oddania')) dueDate = val;
    else if (label.includes('temat')) topic = val;
    else if (label.includes('treść') || label.includes('opis')) {
      const taskDiv = valTd.find('.task-content, .content, div');
      const container = taskDiv.length > 0 ? taskDiv : valTd;
      
      contentHtml = container.html()?.trim() || '';
      const clone = container.clone();
      clone.find('br').replaceWith('\n');
      content = clone.text().trim();
    }
  });

  // Fallback dla treści poza tabelą
  if (!content) {
    const mainContent = $('.task-content, .container-message-content, .content-homework');
    if (mainContent.length > 0) {
      contentHtml = mainContent.html()?.trim() || '';
      const clone = mainContent.clone();
      clone.find('br').replaceWith('\n');
      content = clone.text().trim();
    }
  }

  // Załączniki
  const attachments = [];
  $('a[href*="pobierz_zalacznik"], a[href*="zalacznik"]').each((_, a) => {
    const url = $(a).attr('href') || '';
    const name = $(a).text().trim();
    
    // ID załącznika
    const idMatch = url.match(/pobierz_zalacznik\/(?:[0-9]+\/)?([0-9]+)/);
    const id = idMatch ? idMatch[1] : '';

    // Rozmiar
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
    id: String(homeworkId || ''),
    subject,
    teacher,
    category,
    assignedDate,
    dueDate,
    topic,
    content,
    contentHtml,
    attachments
  };
}
