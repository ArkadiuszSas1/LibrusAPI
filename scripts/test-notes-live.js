import { LibrusClient } from '../src/index.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const login = process.env.JULEK_LIBRUS_LOGIN;
  const password = process.env.JULEK_LIBRUS_PASS;

  if (!login || !password) {
    console.error('Brak danych logowania dla Julka w .env!');
    process.exit(1);
  }

  const client = new LibrusClient();
  const session = await client.login(login, password);
  console.log(`Zalogowano pomyślnie jako: ${session.user.name} (${session.user.role})`);

  console.log('\n--- 1. POBIERANIE WSZYSTKICH UWAG (client.notes.list()) ---');
  const allNotes = await client.notes.list();
  console.log(`Liczba znalezionych uwag: ${allNotes.length}`);
  allNotes.forEach((n, idx) => {
    console.log(`\n[Uwaga #${idx + 1}]`);
    console.log(`  Data:       ${n.date}`);
    console.log(`  Nauczyciel: ${n.teacher}`);
    console.log(`  Rodzaj:     ${n.type}`);
    console.log(`  Kategoria:  ${n.category}`);
    console.log(`  Treść:      ${n.text}`);
    if (n.points !== null) console.log(`  Punkty:     ${n.points}`);
  });

  console.log('\n--- 2. POBIERANIE UWAG OD DATY (client.notes.getSince("2026-09-22")) ---');
  const sinceNotes = await client.notes.getSince('2026-09-22');
  console.log(`Liczba uwag od 2026-09-22: ${sinceNotes.length}`);
  sinceNotes.forEach((n, idx) => {
    console.log(`  [${idx + 1}] ${n.date} - ${n.teacher}: ${n.text}`);
  });

  console.log('\n--- 3. FILTROWANIE PO RODZAJU (client.notes.list({ type: "negatywna" })) ---');
  const negativeNotes = await client.notes.list({ type: 'negatywna' });
  console.log(`Liczba uwag negatywnych: ${negativeNotes.length}`);
}

main().catch(err => {
  console.error('Błąd testu uwag na żywo:', err);
  process.exit(1);
});
