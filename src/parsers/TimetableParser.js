import * as cheerio from 'cheerio';

/**
 * @typedef {object} TimetableAddedEvent
 * @property {string} addedDate - Data i czas dodania wpisu
 * @property {string} eventType - Rodzaj zdarzenia (np. 'kartkówka', 'Nieobecność klasy', 'sprawdzian')
 * @property {string} detailsRaw - Surowy tekst ze szczegółami
 * @property {string|null} className - Nazwa klasy (np. '4a SP133 -1-8')
 * @property {string|null} eventDate - Data zdarzenia (np. '2026-09-30 do 2026-09-30')
 * @property {string|null} lessonNumber - Numer lekcji (np. '5', '3 do 7')
 * @property {string|null} colorHex - Kolor wyróżnienia hex (np. '#FF7878')
 */

/**
 * Parsuje widok zdarzeń dodanych do terminarza od ostatniego logowania
 * @param {string} html 
 * @returns {TimetableAddedEvent[]}
 */
export function parseAddedSinceLastLogin(html) {
  if (!html || typeof html !== 'string') return [];

  const $ = cheerio.load(html);
  const events = [];

  // Tabela: table.decorated.big.center
  $('table.decorated tbody tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 4) return;

    // Kolor w span.box
    const colorStyle = $(tds[0]).find('.box').attr('style') || '';
    const colorMatch = colorStyle.match(/background-color:\s*([^;]+)/i);
    const colorHex = colorMatch ? colorMatch[1].trim() : null;

    // Czas dodania
    const addedDate = $(tds[1]).text().trim();

    // Rodzaj zdarzenia
    const eventType = $(tds[2]).text().trim();

    // Szczegóły
    const rawDetails = $(tds[3]).text().trim().replace(/\s+/g, ' ');

    // Bezpieczne wyciąganie poszczególnych pól ze szczegółów
    let className = null;
    let eventDate = null;
    let lessonNumber = null;

    const classMatch = rawDetails.match(/Klasa:\s*(.*?)(?=\s*Data:|\s*Nr lekcji:|$)/i);
    if (classMatch) className = classMatch[1].trim();

    const dateMatch = rawDetails.match(/Data:\s*(.*?)(?=\s*Nr lekcji:|$)/i);
    if (dateMatch) eventDate = dateMatch[1].trim();

    const lessonMatch = rawDetails.match(/Nr lekcji:\s*(.*)/i);
    if (lessonMatch) lessonNumber = lessonMatch[1].trim();

    if (addedDate || eventType) {
      events.push({
        addedDate,
        eventType,
        detailsRaw: rawDetails,
        className,
        eventDate,
        lessonNumber,
        colorHex
      });
    }
  });

  return events;
}

/**
 * @typedef {object} CalendarEvent
 * @property {string|null} id - Identyfikator wpisu w terminarzu (jeśli posiada stronę szczegółów)
 * @property {string} date - Data zdarzenia (format YYYY-MM-DD)
 * @property {string} category - Kategoria (np. 'sprawdzian', 'kartkówka', 'Praca domowa', 'Zastępstwo', 'Wywiadówka', 'Wycieczka')
 * @property {string|null} subject - Przedmiot szkolny (np. 'matematyka', 'język angielski')
 * @property {string|null} title - Krótki tytuł / podsumowanie zdarzenia
 * @property {string|null} description - Pełny opis zdarzenia
 * @property {string|null} teacher - Nauczyciel zgłaszający / prowadzący zastępstwo
 * @property {string|null} addedDate - Data i czas dodania wpisu
 * @property {string|null} lessonNumber - Numer lekcji (np. '3', '5')
 * @property {string|null} time - Godziny trwania (np. '10:00 - 14:00', '17:30')
 * @property {string|null} room - Sala lekcyjna (np. 's11', '10')
 * @property {string|null} targetClass - Klasa / grupa (np. '7k SP133 -1-8')
 * @property {string|null} rawText - Surowa treść kafelka
 */

/**
 * Parsuje widok kalendarza miesięcznego (https://synergia.librus.pl/terminarz)
 * @param {string} html Kod HTML strony z terminarzem
 * @returns {CalendarEvent[]}
 */
export function parseCalendarMonth(html) {
  if (!html || typeof html !== 'string') return [];

  const $ = cheerio.load(html);
  const events = [];

  // Ustal aktywny rok i miesiąc z formularza
  const monthVal = $('select[name="miesiac"] option[selected]').val() || ($('select[name="miesiac"]').val());
  const yearVal = $('select[name="rok"] option[selected]').val() || ($('select[name="rok"]').val());

  const currentMonth = monthVal ? String(monthVal).padStart(2, '0') : null;
  const currentYear = yearVal ? String(yearVal) : null;

  $('table.kalendarz div.kalendarz-dzien').each((_, dayEl) => {
    const dayNumText = $(dayEl).find('.kalendarz-numer-dnia').text().trim();
    if (!dayNumText) return;

    const dayNum = String(parseInt(dayNumText, 10)).padStart(2, '0');
    const eventDate = (currentYear && currentMonth) ? `${currentYear}-${currentMonth}-${dayNum}` : dayNum;

    // Przeszukaj wszystkie komórki zdarzeń w tym dniu
    $(dayEl).find('table tbody td, table tr td').each((_, td) => {
      const tdEl = $(td);
      const rawText = tdEl.text().trim().replace(/\s+/g, ' ');
      if (!rawText) return;

      // Sprawdź czy to zastępstwo lub odwołane zajęcia (specjalny format komórki)
      const isSubstitution = rawText.includes('Zastępstwo z');
      const isCancelled = rawText.includes('Odwołane zajęcia');

      // Parsowanie atrybutu title (zawiera metadane: Nauczyciel, Opis, Data dodania)
      const titleAttr = tdEl.attr('title') || '';
      let teacher = null;
      let description = null;
      let addedDate = null;

      if (titleAttr) {
        // Dekodowanie encji HTML
        const cleanTitle = titleAttr
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&oacute;/g, 'ó')
          .replace(/&nbsp;/g, ' ');

        const teacherMatch = cleanTitle.match(/Nauczyciel:\s*(.*?)(?=<br|$)/i);
        if (teacherMatch) teacher = teacherMatch[1].trim();

        const descMatch = cleanTitle.match(/Opis:\s*(.*?)(?=<br\s*\/>\s*Data dodania:|$)/is);
        if (descMatch) {
          description = descMatch[1].replace(/<br\s*\/?>/gi, '\n').trim();
        }

        const addedMatch = cleanTitle.match(/Data dodania:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2})/i);
        if (addedMatch) addedDate = addedMatch[1].trim();
      }

      // Parsowanie onclick -> wyciągnięcie ID zdarzenia
      const onclickAttr = tdEl.attr('onclick') || '';
      let eventId = null;
      const idMatch = onclickAttr.match(/\/terminarz\/szczegoly\/([0-9]+)/);
      if (idMatch) {
        eventId = idMatch[1];
      }

      // Parsowanie zawartości widocznej w kafelku
      const subjectEl = tdEl.find('.przedmiot');
      let subject = subjectEl.length > 0 ? subjectEl.text().trim() : null;
      let category = 'Inne';
      let lessonNumber = null;
      let time = null;
      let room = null;
      let targetClass = null;
      let title = null;

      if (isSubstitution) {
        category = 'Zastępstwo';
        const subMatch = rawText.match(/Zastępstwo z\s+(.*?)\s+na lekcji nr:\s*([0-9]+)\s*\((.*?)\)/i);
        if (subMatch) {
          teacher = teacher || subMatch[1].trim();
          lessonNumber = subMatch[2].trim();
          subject = subject || subMatch[3].trim();
        }
        title = rawText;
      } else if (isCancelled) {
        category = 'Odwołane zajęcia';
        const cancelMatch = rawText.match(/Odwołane zajęcia\s*(.*?)\s+na lekcji nr:\s*([0-9]+)\s*\((.*?)\)/i);
        if (cancelMatch) {
          teacher = teacher || cancelMatch[1].trim();
          lessonNumber = cancelMatch[2].trim();
          subject = subject || cancelMatch[3].trim();
        }
        title = rawText;
      } else if (rawText.includes('Wywiadówka:')) {
        category = 'Wywiadówka';
        title = 'Wywiadówka: Zebranie z rodzicami';
        const godzMatch = rawText.match(/godz\.:?\s*([0-9]{1,2}:[0-9]{2})/i);
        if (godzMatch) time = godzMatch[1].trim();
      } else if (rawText.includes('Wycieczka')) {
        category = 'Wycieczka';
        title = 'Wycieczka';
        const czasMatch = rawText.match(/Czas:\s*([0-9]{1,2}:[0-9]{2}\s*-\s*[0-9]{1,2}:[0-9]{2})/i);
        if (czasMatch) time = czasMatch[1].trim();
      } else if (rawText.includes('Nieobecność klasy')) {
        category = 'Nieobecność klasy';
        title = 'Nieobecność klasy';
      } else {
        // Kartkówka, Sprawdzian, Praca domowa, Diagnoza, Poprawa itp.
        if (rawText.toLowerCase().includes('sprawdzian')) category = 'sprawdzian';
        else if (rawText.toLowerCase().includes('kartkówka')) category = 'kartkówka';
        else if (rawText.toLowerCase().includes('praca domowa')) category = 'Praca domowa';
        else if (rawText.toLowerCase().includes('diagnoza')) category = 'Diagnoza';
        else if (rawText.toLowerCase().includes('poprawa')) category = 'Poprawa';
        else if (rawText.toLowerCase().includes('lektura')) category = 'Lektura';

        const lessonMatch = rawText.match(/Nr lekcji:\s*([0-9]+)/i);
        if (lessonMatch) lessonNumber = lessonMatch[1].trim();

        const roomMatch = rawText.match(/Sala:\s*([^\s]+)/i);
        if (roomMatch) room = roomMatch[1].trim();

        title = subject ? `${subject} - ${category}` : category;
      }

      // Klasa / Grupa (np. 7k SP133 -1-8, 7k, 7p, 7e gr. 3)
      // Szukamy po przecinku lub na końcu tekstu, unikając 'Nr lekcji: X'
      const classMatch = rawText.match(/(?:sprawdzian|kartkówka|domowa|diagnoza|poprawa|inne|lektura|wycieczka|godz\.:\s*[^\s]+)\s*([0-9][a-z](?:\s*,\s*[0-9][a-z])*(?:\s+gr\.\s*[0-9]+)?(?:\s+SP[0-9]+[^\n]*)?)/i)
        || rawText.match(/\b([0-9][a-z](?:\s*,\s*[0-9][a-z])*(?:\s+gr\.\s*[0-9]+)?\s+SP[0-9]+[^\n]*)/i);

      if (classMatch && !isSubstitution && !isCancelled) {
        targetClass = classMatch[1].replace(/Sala:.*$/i, '').trim();
      }

      events.push({
        id: eventId,
        date: eventDate,
        category,
        subject,
        title: title || rawText,
        description: description || null,
        teacher: teacher || null,
        addedDate: addedDate || null,
        lessonNumber,
        time,
        room,
        targetClass,
        rawText
      });
    });
  });

  return events;
}

