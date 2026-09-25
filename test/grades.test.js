import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseGrades } from '../src/parsers/GradesParser.js';
import { Grades } from '../src/modules/Grades.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('GradesParser', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'grades.html');
  const html = fs.readFileSync(fixturePath, 'utf-8');

  it('should parse grades, subjects and formative grades from fixture HTML', () => {
    const data = parseGrades(html);

    assert.ok(Array.isArray(data.grades), 'grades should be an array');
    assert.ok(Array.isArray(data.subjects), 'subjects should be an array');
    assert.ok(Array.isArray(data.formativeGrades), 'formativeGrades should be an array');

    assert.ok(data.grades.length > 0, 'should extract regular grades');
    assert.ok(data.subjects.length > 0, 'should extract subject summaries');
    assert.strictEqual(data.formativeGrades.length, 4, 'should extract 4 formative grades');

    // Test first grade (biologia - 5)
    const bioGrade = data.grades.find(g => g.subject === 'biologia');
    assert.ok(bioGrade);
    assert.strictEqual(bioGrade.grade, '5');
    assert.strictEqual(bioGrade.category, 'kartkówka');
    assert.strictEqual(bioGrade.date, '2026-09-22');
    assert.strictEqual(bioGrade.teacher, 'Kowalska Iwona');
    assert.strictEqual(bioGrade.comment, 'skóra');
    assert.strictEqual(bioGrade.semester, 1);
    assert.strictEqual(bioGrade.id, '1263122');

    // Test subject summary
    const bioSubject = data.subjects.find(s => s.subject === 'biologia');
    assert.ok(bioSubject);
    assert.strictEqual(bioSubject.semester1.grades.length, 1);
    assert.strictEqual(bioSubject.semester2.grades.length, 0);

    // Test formative grade
    const formGrade = data.formativeGrades[0];
    assert.strictEqual(formGrade.subject, 'język hiszpański');
    assert.strictEqual(formGrade.category, 'sprawdzian');
    assert.strictEqual(formGrade.semester, 1);
    assert.strictEqual(formGrade.date, '2026-09-19');
    assert.strictEqual(formGrade.type, 'Bieżąca');
    assert.ok(formGrade.text.includes('Wynik z diagnozy: 76%'));
  });

  it('should safely handle empty or invalid HTML', () => {
    const emptyResult = parseGrades('');
    assert.deepStrictEqual(emptyResult, { grades: [], subjects: [], formativeGrades: [] });

    const nullResult = parseGrades(null);
    assert.deepStrictEqual(nullResult, { grades: [], subjects: [], formativeGrades: [] });

    const dummyResult = parseGrades('<div>Brak tabeli</div>');
    assert.deepStrictEqual(dummyResult, { grades: [], subjects: [], formativeGrades: [] });
  });
});

describe('Grades Module', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'grades.html');
  const html = fs.readFileSync(fixturePath, 'utf-8');

  const mockHttpClient = {
    getHtml: async () => html
  };

  it('should list grades and support filtering by subject', async () => {
    const gradesModule = new Grades(mockHttpClient);
    const wfGrades = await gradesModule.list({ subject: 'wychowanie fizyczne' });
    assert.strictEqual(wfGrades.length, 3);
    assert.ok(wfGrades.every(g => g.subject === 'wychowanie fizyczne'));
  });

  it('should filter grades by category', async () => {
    const gradesModule = new Grades(mockHttpClient);
    const quizzes = await gradesModule.list({ category: 'kartkówka' });
    assert.ok(quizzes.length > 0);
    assert.ok(quizzes.every(g => g.category.toLowerCase().includes('kartkówka')));
  });

  it('should filter grades by date with getSince()', async () => {
    const gradesModule = new Grades(mockHttpClient);
    const recent = await gradesModule.getSince('2026-09-28');
    assert.ok(recent.length > 0);
    assert.ok(recent.every(g => g.date >= '2026-09-28'));
  });

  it('should retrieve subjects summary', async () => {
    const gradesModule = new Grades(mockHttpClient);
    const subjects = await gradesModule.getSubjects();
    assert.ok(subjects.length > 0);
    const math = await gradesModule.getSubjects({ subject: 'matematyka' });
    assert.strictEqual(math.length, 1);
    assert.strictEqual(math[0].subject, 'matematyka');
  });

  it('should retrieve formative grades', async () => {
    const gradesModule = new Grades(mockHttpClient);
    const formative = await gradesModule.getFormativeGrades();
    assert.strictEqual(formative.length, 4);
  });
});
