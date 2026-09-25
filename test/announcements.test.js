import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { parseAnnouncements } from '../src/parsers/AnnouncementsParser.js';

test('AnnouncementsParser - parseAnnouncements from fixture HTML', () => {
  const html = fs.readFileSync('test/fixtures/announcements.html', 'utf8');
  const items = parseAnnouncements(html);

  assert.ok(items.length >= 20, `Powinno zostać sparsowanych co najmniej 20 ogłoszeń (znaleziono: ${items.length})`);

  // Sprawdzenie pierwszego ogłoszenia
  const first = items[0];
  assert.ok(first.id, 'Ogłoszenie powinno posiadać ID');
  assert.ok(first.title && first.title.length > 0, 'Ogłoszenie powinno posiadać tytuł');
  assert.ok(first.author && first.author.length > 0, 'Ogłoszenie powinno posiadać autora');
  assert.ok(first.date && /^\d{4}-\d{2}-\d{2}$/.test(first.date), 'Data powinna mieć format YYYY-MM-DD');
  assert.ok(first.content && first.content.length > 0, 'Treść powinna być niepusta');
  assert.ok(first.contentHtml && first.contentHtml.length > 0, 'Treść HTML powinna być niepusta');

  // Sprawdzenie konkretnego znanego ogłoszenia z fixture
  const contestAnnouncement = items.find(a => a.title.includes('Wędrówka z legendą'));
  assert.ok(contestAnnouncement, 'Powinno znaleźć ogłoszenie o konkursie Wędrówka z legendą');
  assert.strictEqual(contestAnnouncement.author, 'Dorota Kwiatkowska');
  assert.strictEqual(contestAnnouncement.date, '2026-09-24');
  assert.ok(contestAnnouncement.content.includes('XIII EDYCJA KONKURSU DZIELNICOWEGO'));
});

test('AnnouncementsParser - returns empty array for empty or invalid input', () => {
  assert.deepStrictEqual(parseAnnouncements(''), []);
  assert.deepStrictEqual(parseAnnouncements(null), []);
  assert.deepStrictEqual(parseAnnouncements('<html><body><p>Brak</p></body></html>'), []);
});
