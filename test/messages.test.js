import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { parseMessagesList, parseMessageDetails } from '../src/parsers/MessagesParser.js';

test('MessagesParser - parseMessagesList from fixture HTML', () => {
  const html = fs.readFileSync('test/fixtures/messages-list.html', 'utf8');
  const messages = parseMessagesList(html);

  assert.strictEqual(messages.length, 2, 'Powinny zostać sparsowane 2 wiadomości');

  // Wiadomość 1 (nieprzeczytana, z załącznikiem)
  assert.strictEqual(messages[0].id, '10101');
  assert.strictEqual(messages[0].sender, 'Anna Kowalska (Wychowawca)');
  assert.strictEqual(messages[0].subject, 'Zebranie z rodzicami - czwartek godz. 17:30');
  assert.strictEqual(messages[0].date, '2026-09-24 18:30:15');
  assert.strictEqual(messages[0].isRead, false);
  assert.strictEqual(messages[0].hasAttachment, true);
  assert.strictEqual(messages[0].url, '/wiadomosci/1/10101');

  // Wiadomość 2 (przeczytana, bez załącznika)
  assert.strictEqual(messages[1].id, '10102');
  assert.strictEqual(messages[1].sender, 'Jan Nowak (Nauczyciel Matematyki)');
  assert.strictEqual(messages[1].subject, 'Materiały do sprawdzianu z ułamków');
  assert.strictEqual(messages[1].date, '2026-09-22 10:15:00');
  assert.strictEqual(messages[1].isRead, true);
  assert.strictEqual(messages[1].hasAttachment, false);
});

test('MessagesParser - parseMessagesList from screenshot fixture', () => {
  const html = fs.readFileSync('test/fixtures/synergia-messages-screenshot.html', 'utf8');
  const messages = parseMessagesList(html);

  assert.strictEqual(messages.length, 10, 'Powinno zostać sparsowanych 10 wiadomości ze screenshotu');

  // Wiadomość 1
  assert.strictEqual(messages[0].id, '98701');
  assert.strictEqual(messages[0].sender, 'Nowakowska Wioletta (Dyrektor Szkoły)');
  assert.strictEqual(messages[0].subject, 'Oświadczenie o zajęciach dodatkowych');
  assert.strictEqual(messages[0].date, '2026-09-25 07:44:28');
  assert.strictEqual(messages[0].hasAttachment, true);

  // Wiadomość 2
  assert.strictEqual(messages[1].id, '98702');
  assert.strictEqual(messages[1].sender, 'Adamczyk Aleksandra (Nauczyciel)');
  assert.strictEqual(messages[1].subject, 'Re: Odp: Kino sferyczne opłata');
  assert.strictEqual(messages[1].date, '2026-09-24 22:55:22');
  assert.strictEqual(messages[1].hasAttachment, false);

  // Wiadomość 5
  assert.strictEqual(messages[4].id, '98705');
  assert.strictEqual(messages[4].sender, 'Lewandowski Artur (Nauczyciel)');
  assert.strictEqual(messages[4].subject, 'Siatka');
  assert.strictEqual(messages[4].date, '2026-09-24 09:00:51');
});

test('MessagesParser - parseMessageDetails from fixture HTML', () => {
  const html = fs.readFileSync('test/fixtures/messages-detail.html', 'utf8');
  const details = parseMessageDetails(html, '10101');

  assert.strictEqual(details.id, '10101');
  assert.strictEqual(details.sender, 'Anna Kowalska (Wychowawca)');
  assert.strictEqual(details.recipient, 'Julian Sas (rodzic)');
  assert.strictEqual(details.date, '2026-09-24 18:30:15');
  assert.strictEqual(details.subject, 'Zebranie z rodzicami - czwartek godz. 17:30');
  
  // Weryfikacja treści
  assert.ok(details.content.includes('Szanowni Państwo'));
  assert.ok(details.content.includes('sali 204'));
  assert.ok(details.content.includes('Anna Kowalska'));

  // Weryfikacja załączników
  assert.strictEqual(details.attachments.length, 1);
  assert.strictEqual(details.attachments[0].name, 'porzadek_zebrania.pdf');
  assert.strictEqual(details.attachments[0].url, '/wiadomosci/pobierz_zalacznik/10101/9991');
  assert.strictEqual(details.attachments[0].id, '9991');
  assert.strictEqual(details.attachments[0].size, '245 KB');
});
