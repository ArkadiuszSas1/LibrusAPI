import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Grades } from '../src/modules/Grades.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Wczytujemy dane offline z fixtures
const fixturePath = path.join(__dirname, '..', 'test', 'fixtures', 'grades.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf-8');

const mockHttp = {
  getHtml: async () => fixtureHtml
};

async function run() {
  const grades = new Grades(mockHttp);

  // Poniedziałek rano (w kontekście danych to 2026-09-28 07:00:00)
  const mondayMorning = '2026-09-28 07:00:00';

  console.log(`================================================================`);
  console.log(` Oceny wystawione od: ${mondayMorning} (Poniedziałek 07:00)`);
  console.log(`================================================================\n`);

  // 1. Oceny bieżące
  const recentGrades = await grades.getSince(mondayMorning);

  console.log(`Liczba ocen bieżących od poniedziałku rano: ${recentGrades.length}\n`);
  for (const [idx, g] of recentGrades.entries()) {
    console.log(`[${idx + 1}] Data: ${g.date} | Przedmiot: ${g.subject}`);
    console.log(`    Ocena: ${g.grade} | Kategoria: ${g.category}`);
    console.log(`    Nauczyciel: ${g.teacher}`);
    if (g.comment) console.log(`    Komentarz: ${g.comment}`);
    console.log(`    ID: ${g.id} (URL: ${g.href})`);
    console.log('');
  }

  // 2. Oceny kształtujące / opisowe
  const fullData = await grades.getFull({ since: mondayMorning });
  console.log(`----------------------------------------------------------------`);
  console.log(`Liczba ocen kształtujących od poniedziałku rano: ${fullData.formativeGrades.length}\n`);
  for (const [idx, f] of fullData.formativeGrades.entries()) {
    console.log(`[${idx + 1}] Data: ${f.date} | Przedmiot: ${f.subject} | Kategoria: ${f.category}`);
    console.log(`    Treść: ${f.text}`);
    console.log('');
  }
}

run().catch(console.error);
