import { LibrusClient } from '../src/index.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const login = process.env.OLEK_LIBRUS_LOGIN || process.env.JULEK_LIBRUS_LOGIN || process.env.LIBRUS_LOGIN;
  const password = process.env.OLEK_LIBRUS_PASS || process.env.JULEK_LIBRUS_PASS || process.env.LIBRUS_PASSWORD;

  if (!login || !password) {
    console.error('Brak zmiennych środowiskowych z danymi logowania (np. OLEK_LIBRUS_LOGIN i OLEK_LIBRUS_PASS).');
    process.exit(1);
  }

  console.log('--- TEST FILTROWANIA PO DACIE (SINCE) ---');
  const client = new LibrusClient();
  const session = await client.login(login, password);
  console.log(`Zalogowano jako: ${session.user.name} (${session.user.role})`);

  // Test 1: Wiadomości z ostatnich 7 dni
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sinceTimestampStr = sevenDaysAgo.toISOString().replace('T', ' ').substring(0, 19);
  console.log(`\n1. Pobieranie wiadomości od: ${sinceTimestampStr}`);
  
  const recentMessages = await client.messages.getSince(sevenDaysAgo);
  console.log(`Znaleziono wiadomości od tej daty: ${recentMessages.length}`);
  recentMessages.forEach((m, idx) => {
    console.log(`  [${idx + 1}] Data: ${m.date} | Od: ${m.sender} | Tytuł: ${m.subject}`);
  });

  // Test 2: Wiadomości z konkretnej godziny (np. '2026-09-24 15:00:00')
  const specificDate = '2026-09-24 15:00:00';
  console.log(`\n2. Pobieranie wiadomości od konkretnej daty: ${specificDate}`);
  const messagesFromSpecific = await client.messages.getSince(specificDate);
  console.log(`Znaleziono wiadomości od ${specificDate}: ${messagesFromSpecific.length}`);
  messagesFromSpecific.forEach((m, idx) => {
    console.log(`  [${idx + 1}] Data: ${m.date} | Od: ${m.sender} | Tytuł: ${m.subject}`);
  });

  // Test 3: Ogłoszenia od 2026-09-01
  const announcementsSinceDate = '2026-09-01';
  console.log(`\n3. Pobieranie ogłoszeń od: ${announcementsSinceDate}`);
  const recentAnnouncements = await client.announcements.getSince(announcementsSinceDate);
  console.log(`Znaleziono ogłoszeń od ${announcementsSinceDate}: ${recentAnnouncements.length}`);
  recentAnnouncements.forEach((a, idx) => {
    console.log(`  [${idx + 1}] Data: ${a.date} | Autor: ${a.author} | Tytuł: ${a.title}`);
  });

  // Test 4: Zadania domowe od 2026-09-01
  console.log(`\n4. Pobieranie zadań domowych od: 2026-09-01`);
  const recentHomework = await client.homework.getSince('2026-09-01');
  console.log(`Znaleziono zadań domowych: ${recentHomework.length}`);
  recentHomework.forEach((h, idx) => {
    console.log(`  [${idx + 1}] Data zadania: ${h.assignedDate} | Termin: ${h.dueDate} | Przedmiot: ${h.subject}`);
  });

  console.log('\n--- WSZYSTKIE TESTY ZAKOŃCZONE POMYŚLNIE ---');
}

main().catch(err => {
  console.error('Błąd podczas wykonywania skryptu:', err);
  process.exit(1);
});
