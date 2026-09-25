import { LibrusClient } from '../src/index.js';
import dotenv from 'dotenv';
dotenv.config();

async function showCalendarData() {
  const client = new LibrusClient();
  const login = process.env.OLEK_LIBRUS_LOGIN || process.env.JULEK_LIBRUS_LOGIN;
  const password = process.env.OLEK_LIBRUS_PASS || process.env.JULEK_LIBRUS_PASS;

  await client.login(login, password);
  console.log('=== POBIERANIE KALENDARZA (BIEŻĄCY + NASTĘPNY MIESIĄC) ===\n');

  // Pobranie bieżącego i następnego miesiąca (monthsAhead: 1)
  const upcomingEvents = await client.timetable.getUpcoming({ monthsAhead: 1 });

  console.log(`Znaleziono łącznie ${upcomingEvents.length} zdarzeń w terminarzu.`);
  console.log('\n--- PRZYKŁADOWE PEŁNE OBIEKTY JSON ZWRÓCONE PRZEZ API ---\n');

  // Wyświetl 3 różne typy zdarzeń w pełnym formacie JSON:
  // 1. Sprawdzian / kartkówka z opisem
  // 2. Praca domowa
  // 3. Zastępstwo / wycieczka
  const sprawdzian = upcomingEvents.find(e => e.category === 'sprawdzian');
  const pracaDomowa = upcomingEvents.find(e => e.category === 'Praca domowa');
  const zastepstwo = upcomingEvents.find(e => e.category === 'Zastępstwo');

  console.log('1. Przykład: SPRAWDZIAN:');
  console.log(JSON.stringify(sprawdzian, null, 2));

  console.log('\n2. Przykład: PRACA DOMOWA W TERMINARZU:');
  console.log(JSON.stringify(pracaDomowa, null, 2));

  console.log('\n3. Przykład: ZASTĘPSTWO:');
  console.log(JSON.stringify(zastepstwo, null, 2));

  console.log('\n--- PODSUMOWANIE NADCHODZĄCYCH WYDARZEŃ (LISTA) ---');
  upcomingEvents.forEach((ev, idx) => {
    console.log(`[${idx + 1}] ${ev.date} | [${ev.category.toUpperCase()}] ${ev.subject || ev.title} (Lekcja: ${ev.lessonNumber || '-'}, Nauczyciel: ${ev.teacher || '-'})`);
    if (ev.description) {
      console.log(`    Opis: ${ev.description.replace(/\n/g, ' ')}`);
    }
  });
}

showCalendarData().catch(console.error);
