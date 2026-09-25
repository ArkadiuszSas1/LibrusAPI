import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { parseHomeworkList, parseHomeworkDetails } from '../src/parsers/HomeworkParser.js';

test('HomeworkParser - parseHomeworkList from fixture HTML', () => {
  const html = fs.readFileSync('test/fixtures/homework-list.html', 'utf8');
  const items = parseHomeworkList(html);

  assert.strictEqual(items.length, 2, 'Powinny zostać sparsowane 2 zadania domowe');

  // Zadanie 1
  assert.strictEqual(items[0].id, '54321');
  assert.strictEqual(items[0].subject, 'Język polski');
  assert.strictEqual(items[0].teacher, 'Anna Kowalska');
  assert.strictEqual(items[0].category, 'Zadanie domowe');
  assert.strictEqual(items[0].topic, 'Wypracowanie: Moja ulubiona książka z dzieciństwa');
  assert.strictEqual(items[0].assignedDate, '2026-09-24');
  assert.strictEqual(items[0].dueDate, '2026-09-30 23:59:00');
  assert.strictEqual(items[0].hasAttachment, true);
  assert.strictEqual(items[0].status, 'Nowe');
  assert.strictEqual(items[0].colorHex, '#90EE90');
  assert.strictEqual(items[0].url, '/moje_zadania/podglad/54321');

  // Zadanie 2
  assert.strictEqual(items[1].id, '54322');
  assert.strictEqual(items[1].subject, 'Matematyka');
  assert.strictEqual(items[1].teacher, 'Jan Nowak');
  assert.strictEqual(items[1].category, 'Projekt');
  assert.strictEqual(items[1].topic, 'Zadania z geometrii przestrzennej str. 45-47');
  assert.strictEqual(items[1].assignedDate, '2026-09-23');
  assert.strictEqual(items[1].dueDate, '2026-09-26 12:00:00');
  assert.strictEqual(items[1].hasAttachment, false);
  assert.strictEqual(items[1].status, 'W trakcie');
  assert.strictEqual(items[1].colorHex, '#FFB6C1');
});

test('HomeworkParser - parseHomeworkDetails from fixture HTML', () => {
  const html = fs.readFileSync('test/fixtures/homework-detail.html', 'utf8');
  const details = parseHomeworkDetails(html, '54321');

  assert.strictEqual(details.id, '54321');
  assert.strictEqual(details.subject, 'Język polski');
  assert.strictEqual(details.teacher, 'Anna Kowalska');
  assert.strictEqual(details.category, 'Zadanie domowe');
  assert.strictEqual(details.assignedDate, '2026-09-24');
  assert.strictEqual(details.dueDate, '2026-09-30 23:59:00');
  assert.strictEqual(details.topic, 'Wypracowanie: Moja ulubiona książka z dzieciństwa');

  // Weryfikacja treści
  assert.ok(details.content.includes('Proszę napisać wypracowanie'));
  assert.ok(details.content.includes('minimum 200 słów'));
  assert.ok(details.content.includes('poprawność ortograficzną'));

  // Weryfikacja załączników
  assert.strictEqual(details.attachments.length, 1);
  assert.strictEqual(details.attachments[0].id, '7771');
  assert.strictEqual(details.attachments[0].name, 'wskazowki_do_wypracowania.pdf');
  assert.strictEqual(details.attachments[0].url, '/moje_zadania/pobierz_zalacznik/54321/7771');
  assert.strictEqual(details.attachments[0].size, '180 KB');
});
