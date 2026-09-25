import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseAttendance } from '../src/parsers/AttendanceParser.js';
import { Attendance } from '../src/modules/Attendance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AttendanceParser', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'attendance-uczen.html');
  const html = fs.readFileSync(fixturePath, 'utf-8');

  it('should parse attendance entries, days, and period totals from fixture HTML', () => {
    const data = parseAttendance(html);

    assert.ok(Array.isArray(data.entries), 'entries should be an array');
    assert.ok(Array.isArray(data.days), 'days should be an array');
    assert.ok(Array.isArray(data.periodTotals), 'periodTotals should be an array');

    assert.strictEqual(data.entries.length, 4, 'should extract 4 entries');
    assert.strictEqual(data.days.length, 4, 'should extract 4 days');
    assert.strictEqual(data.periodTotals.length, 1, 'should extract 1 period total');

    // Check first entry
    const entry1 = data.entries[0];
    assert.strictEqual(entry1.date, '2026-09-25');
    assert.strictEqual(entry1.symbol, 'sp');
    assert.strictEqual(entry1.type, 'spóźnienie');
    assert.strictEqual(entry1.subject, 'język angielski');
    assert.strictEqual(entry1.teacher, 'Wójcik Martyna');
    assert.strictEqual(entry1.addedBy, 'Wójcik Martyna');
    assert.strictEqual(entry1.lessonNumber, 1);
    assert.strictEqual(entry1.isTrip, false);
    assert.strictEqual(entry1.period, 1);

    // Check period total
    const total = data.periodTotals[0];
    assert.strictEqual(total.period, 1);
    assert.strictEqual(total.lateness, 4);
    assert.strictEqual(total.unexcused, 0);
  });

  it('should safely handle empty or invalid HTML', () => {
    assert.deepStrictEqual(parseAttendance(''), { entries: [], days: [], periodTotals: [] });
    assert.deepStrictEqual(parseAttendance(null), { entries: [], days: [], periodTotals: [] });
    assert.deepStrictEqual(parseAttendance('<div>Brak tabeli</div>'), { entries: [], days: [], periodTotals: [] });
  });
});

describe('Attendance Module', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'attendance-uczen.html');
  const html = fs.readFileSync(fixturePath, 'utf-8');

  const mockHttpClient = {
    getHtml: async () => html
  };

  it('should list all attendance entries', async () => {
    const att = new Attendance(mockHttpClient);
    const list = await att.list();
    assert.strictEqual(list.length, 4);
  });

  it('should filter entries by since date', async () => {
    const att = new Attendance(mockHttpClient);
    const recent = await att.getSince('2026-09-20');
    assert.strictEqual(recent.length, 1);
    assert.strictEqual(recent[0].date, '2026-09-25');
  });

  it('should filter entries by subject', async () => {
    const att = new Attendance(mockHttpClient);
    const polish = await att.list({ subject: 'język polski' });
    assert.strictEqual(polish.length, 3);
    assert.ok(polish.every(e => e.subject === 'język polski'));
  });

  it('should filter entries by type or symbol', async () => {
    const att = new Attendance(mockHttpClient);
    const spoznienia = await att.list({ type: 'spóźnienie' });
    assert.strictEqual(spoznienia.length, 4);
  });

  it('should return day summaries and period totals', async () => {
    const att = new Attendance(mockHttpClient);
    const days = await att.getDays();
    assert.strictEqual(days.length, 4);

    const totals = await att.getTotals();
    assert.strictEqual(totals.length, 1);
    assert.strictEqual(totals[0].lateness, 4);
  });
});
