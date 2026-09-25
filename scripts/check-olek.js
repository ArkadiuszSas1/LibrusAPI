import 'dotenv/config';
import { LibrusClient } from '../src/index.js';

async function checkOlekData() {
  console.log('====================================================');
  console.log('     Sprawdzanie danych dla konta: Aleksander       ');
  console.log('====================================================\n');

  const login = process.env.OLEK_LIBRUS_LOGIN;
  const password = process.env.OLEK_LIBRUS_PASS;

  if (!login || !password) {
    console.error('❌ Brak danych OLEK_LIBRUS_LOGIN / OLEK_LIBRUS_PASS w .env');
    process.exit(1);
  }

  const client = new LibrusClient();

  try {
    console.log(`Logowanie do Librusa dla użytkownika ${login}...`);
    await client.login(login, password);
    console.log('✅ Zalogowano pomyślnie!\n');

    // 1. Zadania domowe
    console.log('--- 📚 ZADANIA DOMOWE OLKA ---');
    const homework = await client.homework.list();
    console.log(`Liczba zadań domowych: ${homework.length}`);

    if (homework.length === 0) {
      console.log('Brak aktywnych zadań domowych w systemie.');
    } else {
      for (const [idx, task] of homework.entries()) {
        console.log(`\n[Zadanie #${idx + 1}] ID: ${task.id}`);
        console.log(`  - Przedmiot: ${task.subject}`);
        console.log(`  - Nauczyciel: ${task.teacher}`);
        console.log(`  - Data zadania: ${task.assignedDate} | Termin oddania: ${task.dueDate}`);
        console.log(`  - Temat: ${task.topic}`);
        if (task.status) console.log(`  - Status: ${task.status}`);
        if (task.hasAttachment) console.log(`  - Załącznik: TAK`);

        // Pobierz pełną treść pierwszego zadania
        if (idx === 0) {
          const details = await client.homework.getDetails(task.id);
          console.log(`  - Szczegółowa treść polecenia:\n    ${details.content.replace(/\n/g, '\n    ')}`);
          if (details.attachments.length > 0) {
            console.log(`  - Pliki załączników:`, details.attachments.map(a => `${a.name} (${a.size || 'brak rozmiaru'})`).join(', '));
          }
        }
      }
    }

    // 2. Ostatnia wiadomość ze skrzynki odbiorczej
    console.log('\n--- ✉️ SKRZYNKA ODBIORCZA (OSTATNIA WIADOMOŚĆ) ---');
    const inbox = await client.messages.getInbox();
    console.log(`Łączna liczba wiadomości w skrzynce: ${inbox.length}`);

    if (inbox.length === 0) {
      console.log('Skrzynka odbiorcza jest pusta.');
    } else {
      const latestMsg = inbox[0];
      console.log(`\nNajnowsza wiadomość (ID: ${latestMsg.id}):`);
      console.log(`  - Od: ${latestMsg.sender}`);
      console.log(`  - Data: ${latestMsg.date}`);
      console.log(`  - Temat: ${latestMsg.subject}`);
      console.log(`  - Przeczytana: ${latestMsg.isRead ? 'TAK' : 'NIE'}`);

      // Pobieranie pełnej treści
      console.log('\nPobieranie pełnej treści wiadomości...');
      const msgDetails = await client.messages.getMessage(latestMsg.id);
      console.log('\n--- TREŚĆ WIADOMOŚCI ---');
      console.log(msgDetails.content);
      console.log('------------------------');

      if (msgDetails.attachments.length > 0) {
        console.log('\nZałączniki w wiadomości:');
        msgDetails.attachments.forEach(att => {
          console.log(`  📎 ${att.name} (${att.size || 'plik'}) -> ${att.url}`);
        });
      }
    }

    // Wylogowanie
    console.log('\nWylogowywanie...');
    await client.logout();
    console.log('✅ Wylogowano.');

  } catch (error) {
    console.error('❌ Wystąpił błąd:', error.message);
    if (error.details) {
      console.error('Szczegóły:', error.details);
    }
  }
}

checkOlekData();
