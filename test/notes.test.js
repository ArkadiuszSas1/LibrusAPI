import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseNotes } from '../src/parsers/NotesParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('NotesParser', () => {
  it('should parse notes list from fixture HTML', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'notes.html');
    const html = fs.readFileSync(fixturePath, 'utf-8');

    const notes = parseNotes(html);
    assert.ok(Array.isArray(notes));
    assert.strictEqual(notes.length, 2);

    const note1 = notes[0];
    assert.strictEqual(note1.text, 'Julian podczas lekcji notorycznie przeszkadza w prowadzeniu zajęć swoim zachowaniem.');
    assert.strictEqual(note1.date, '2026-09-21');
    assert.strictEqual(note1.teacher, 'Wiśniewski Adam');
    assert.strictEqual(note1.type, 'negatywna');
    assert.strictEqual(note1.category, 'Zachowanie');

    const note2 = notes[1];
    assert.strictEqual(note2.text, 'nieprzygotowanie - brak ćwiczeń');
    assert.strictEqual(note2.date, '2026-09-22');
    assert.strictEqual(note2.teacher, 'Kowalska Iwona');
    assert.strictEqual(note2.type, 'negatywna');
    assert.strictEqual(note2.category, 'Zachowanie');
  });

  it('should return empty array for empty or invalid html', () => {
    assert.deepStrictEqual(parseNotes(''), []);
    assert.deepStrictEqual(parseNotes('<div>Brak tabeli</div>'), []);
    assert.deepStrictEqual(parseNotes(null), []);
  });
});
