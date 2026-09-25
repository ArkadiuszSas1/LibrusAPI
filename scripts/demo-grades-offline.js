import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Grades } from '../src/modules/Grades.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Wczytujemy zapisany wcześniej fixture (100% offline)
const fixturePath = path.join(__dirname, '..', 'test', 'fixtures', 'grades.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf-8');

// Mock klienta HTTP zwracający HTML z pliku bez dotykania sieci
const mockHttp = {
  getHtml: async () => fixtureHtml
};

async function demoGrades() {
  const gradesModule = new Grades(mockHttp);

  console.log('================================================================');
  console.log('      PREZENTACJA DANYCH MODUŁU OCEN (DEMO OFFLINE / FIXTURE)    ');
  console.log('================================================================\n');

  // 1. Płaska lista ocen bieżących (list)
  const allGrades = await gradesModule.list();
  console.log(`📌 1. Wszystkie oceny bieżące (liczba: ${allGrades.length})`);
  console.log('Pierwsze 5 ocen:');
  console.dir(allGrades.slice(0, 5), { depth: null });

  // 2. Filtrowanie po dacie (getSince)
  console.log('\n----------------------------------------------------------------');
  const recentGrades = await gradesModule.getSince('2026-09-26');
  console.log(`📌 2. Oceny wystawione od 26 września 2026 (liczba: ${recentGrades.length}):`);
  for (const g of recentGrades) {
    console.log(`   • [${g.date}] ${g.subject.padEnd(20)} -> Ocena: ${g.grade.padEnd(3)} | Kat: ${g.category.padEnd(16)} | Nauczyciel: ${g.teacher}`);
    if (g.comment) console.log(`     Komentarz: "${g.comment}"`);
  }

  // 3. Filtrowanie po przedmiocie
  console.log('\n----------------------------------------------------------------');
  const wfGrades = await gradesModule.list({ subject: 'wychowanie fizyczne' });
  console.log(`📌 3. Oceny z Wychowania Fizycznego (liczba: ${wfGrades.length}):`);
  console.dir(wfGrades, { depth: null });

  // 4. Zestawienie ocen wg przedmiotów (getSubjects)
  console.log('\n----------------------------------------------------------------');
  const subjects = await gradesModule.getSubjects();
  console.log(`📌 4. Podsumowanie wg przedmiotów (przedmiotów: ${subjects.length}):`);
  
  // Wyświetlamy te przedmioty, które mają jakiekolwiek oceny
  const activeSubjects = subjects.filter(s => s.semester1.grades.length > 0 || s.semester2.grades.length > 0);
  console.log(`Przedmioty z wpisanymi ocenami (${activeSubjects.length}):`);
  for (const sub of activeSubjects) {
    const s1GradesStr = sub.semester1.grades.map(g => g.grade).join(', ');
    console.log(`   • ${sub.subject.padEnd(20)} | Semestr 1: [${s1GradesStr}] (ocen: ${sub.semester1.grades.length}) | Średnia: ${sub.semester1.average || '-'} | Końcowa: ${sub.semester1.finalGrade || '-'}`);
  }

  // 5. Oceny kształtujące / opisowe (getFormativeGrades)
  console.log('\n----------------------------------------------------------------');
  const formative = await gradesModule.getFormativeGrades();
  console.log(`📌 5. Oceny kształtujące / opisowe (liczba: ${formative.length}):`);
  console.dir(formative, { depth: null });
}

demoGrades().catch(console.error);
