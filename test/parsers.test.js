import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { parseUserInfo } from '../src/parsers/UserInfoParser.js';
import { parseAddedSinceLastLogin, parseCalendarMonth } from '../src/parsers/TimetableParser.js';

test('Timetable and UserInfo parsers with sample HTML fixture', () => {
  const html = fs.readFileSync('test/fixtures/timetable_month.html', 'utf8');

  // Test UserInfo Parser
  const userInfo = parseUserInfo(html);
  assert.strictEqual(userInfo.name, 'Aleksander Sas');
  assert.strictEqual(userInfo.role, 'rodzic');
  assert.strictEqual(userInfo.luckyNumber, 26);
  assert.ok(userInfo.lastLogin && userInfo.lastLogin.includes('2026-09-25'), 'lastLogin should be today timestamp');
  assert.strictEqual(typeof userInfo.notificationsCount.announcements, 'number');
  assert.strictEqual(typeof userInfo.notificationsCount.timetable, 'number');

  // Test parseCalendarMonth from fixture
  const calendarHtml = fs.readFileSync('test/fixtures/timetable_month.html', 'utf8');
  const monthEvents = parseCalendarMonth(calendarHtml);
  assert.ok(Array.isArray(monthEvents));
  assert.ok(monthEvents.length > 5, 'Should parse multiple events from month calendar');

  const homeworkEvent = monthEvents.find(e => e.id === '12458315');
  assert.ok(homeworkEvent, 'Should find homework event 12458315');
  assert.strictEqual(homeworkEvent.date, '2026-09-07');
  assert.strictEqual(homeworkEvent.category, 'Praca domowa');
  assert.strictEqual(homeworkEvent.subject, 'matematyka');
  assert.strictEqual(homeworkEvent.lessonNumber, '5');
  assert.strictEqual(homeworkEvent.teacher, 'Zielińska Agnieszka');
  assert.strictEqual(homeworkEvent.addedDate, '2026-09-04 09:38:01');

  const testEvent = monthEvents.find(e => e.id === '12462979');
  assert.ok(testEvent, 'Should find sprawdzian event 12462979');
  assert.strictEqual(testEvent.date, '2026-09-11');
  assert.strictEqual(testEvent.category, 'sprawdzian');
  assert.strictEqual(testEvent.subject, 'język polski');
  assert.strictEqual(testEvent.lessonNumber, '4');
  assert.strictEqual(testEvent.teacher, 'Kaczmarek Monika');
});
