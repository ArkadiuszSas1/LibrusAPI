import * as cheerio from 'cheerio';

/**
 * Czysta funkcja parsująca sekcję użytkownika ze stron Synergii
 * @param {string} html
 * @returns {{name: string|null, role: string|null, luckyNumber: number|null, lastLogin: string|null, notificationsCount: {announcements: number, timetable: number}}}
 */
export function parseUserInfo(html) {
  if (!html || typeof html !== 'string') {
    return {
      name: null,
      role: null,
      luckyNumber: null,
      lastLogin: null,
      notificationsCount: { announcements: 0, timetable: 0 }
    };
  }

  const $ = cheerio.load(html);
  const userSection = $('#user-section').text() || '';

  // Parsowanie "jesteś zalogowany jako: Julian Sas (rodzic)"
  let name = null;
  let role = null;
  const userMatch = userSection.match(/jesteś zalogowany jako:\s*([^(\n\r]+)(?:\(([^)]+)\))?/i);
  if (userMatch) {
    name = userMatch[1]?.trim() || null;
    role = userMatch[2]?.trim() || null;
  }

  // Szczęśliwy numerek
  let luckyNumber = null;
  const luckyText = $('#user-section .luckyNumber').text().trim();
  if (luckyText) {
    const parsedNum = parseInt(luckyText, 10);
    if (!isNaN(parsedNum)) luckyNumber = parsedNum;
  }

  // Ostatnie logowanie (obsługuje encje HTML &lt;br /&gt; w atrybucie title)
  let lastLogin = null;
  const lastLoginMatch = html.match(/ostatnie udane logowania:(?:&lt;|<)\/b(?:&gt;|>)(?:&lt;|<)br\s*\/(?:&gt;|>)\s*([^<,&]+)/i);
  if (lastLoginMatch) {
    lastLogin = lastLoginMatch[1]?.trim() || null;
  }

  // Liczniki powiadomień
  let announcementsCount = 0;
  const annCounterText = $('#icon-ogloszenia').siblings('.counter').text().trim();
  if (annCounterText) announcementsCount = parseInt(annCounterText, 10) || 0;

  let timetableCount = 0;
  const timeCounterText = $('#icon-terminarz').siblings('.counter').text().trim();
  if (timeCounterText) timetableCount = parseInt(timeCounterText, 10) || 0;

  return {
    name,
    role,
    luckyNumber,
    lastLogin,
    notificationsCount: {
      announcements: announcementsCount,
      timetable: timetableCount
    }
  };
}
