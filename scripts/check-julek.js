import 'dotenv/config';
import { LibrusClient } from '../src/index.js';

async function checkJulekData() {
  console.log('====================================================');
  console.log('       Sprawdzanie danych dla konta: Julek          ');
  console.log('====================================================\n');

  const login = process.env.JULEK_LIBRUS_LOGIN;
  const password = process.env.JULEK_LIBRUS_PASS;

  if (!login || !password) {
    console.error('❌ Brak danych JULEK_LIBRUS_LOGIN / JULEK_LIBRUS_PASS w .env');
    return;
  }

  const client = new LibrusClient();

  try {
    console.log(`Logowanie do Librusa dla użytkownika ${login}...`);
    await client.login(login, password);
    console.log('✅ Zalogowano pomyślnie jako:', client.getUserInfo());

    // 1. Zadania domowe
    console.log('\n--- 📚 ZADANIA DOMOWE JULKA ---');
    const homework = await client.homework.list();
    console.log(`Liczba zadań domowych: ${homework.length}`);

    if (homework.length > 0) {
      for (const [idx, task] of homework.entries()) {
        console.log(`\n[Zadanie #${idx + 1}] ID: ${task.id}`);
        console.log(`  - Przedmiot: ${task.subject}`);
        console.log(`  - Nauczyciel: ${task.teacher}`);
        console.log(`  - Data: ${task.assignedDate} | Termin: ${task.dueDate}`);
        console.log(`  - Temat: ${task.topic}`);
      }
    } else {
      console.log('Brak aktywnych zadań domowych.');
    }

    // 2. Skrzynka odbiorcza
    console.log('\n--- ✉️ SKRZYNKA ODBIORCZA JULKA ---');
    const inbox = await client.messages.getInbox();
    console.log(`Liczba wiadomości: ${inbox.length}`);

    if (inbox.length > 0) {
      const latest = inbox[0];
      console.log(`Najnowsza wiadomość ID: ${latest.id}`);
      console.log(`  - Od: ${latest.sender}`);
      console.log(`  - Data: ${latest.date}`);
      console.log(`  - Temat: ${latest.subject}`);

      const details = await client.messages.getMessage(latest.id);
      console.log('\nTreść:');
      console.log(details.content);
    } else {
      console.log('Skrzynka odbiorcza jest pusta.');
    }

    // 3. Terminarz
    console.log('\n--- 📅 TERMINARZ (Nowe wpisy) ---');
    const events = await client.timetable.getAddedSinceLastLogin();
    console.log(`Nowe wpisy w terminarzu: ${events.length}`);
    events.forEach(e => {
      console.log(`  - [${e.eventType}] ${e.className || ''} | ${e.eventDate || ''} | ${e.detailsRaw}`);
    });

    await client.logout();
    console.log('\n✅ Wylogowano.');
  } catch (err) {
    console.error('Błąd:', err.message);
  }
}

checkJulekData();
