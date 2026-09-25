import 'dotenv/config';
import { LibrusClient } from '../src/index.js';

async function checkAnnouncements() {
  console.log('====================================================');
  console.log('       Pobieranie Ogłoszeń Szkolnych z Librusa       ');
  console.log('====================================================\n');

  const login = process.env.OLEK_LIBRUS_LOGIN || process.env.JULEK_LIBRUS_LOGIN;
  const password = process.env.OLEK_LIBRUS_PASS || process.env.JULEK_LIBRUS_PASS;

  if (!login || !password) {
    console.error('❌ Brak danych logowania w pliku .env');
    process.exit(1);
  }

  const client = new LibrusClient();

  try {
    console.log(`Logowanie do Librusa dla użytkownika ${login}...`);
    await client.login(login, password);
    console.log('✅ Zalogowano pomyślnie!\n');

    console.log('--- 📢 OGŁOSZENIA SZKOLNE ---');
    const announcements = await client.announcements.list();
    console.log(`Łączna liczba ogłoszeń: ${announcements.length}\n`);

    if (announcements.length === 0) {
      console.log('Brak ogłoszeń szkolnych.');
    } else {
      // Wyświetl 5 najnowszych ogłoszeń
      announcements.slice(0, 5).forEach((item, idx) => {
        console.log(`[Ogłoszenie #${idx + 1}]`);
        console.log(`  📌 Tytuł:  ${item.title}`);
        console.log(`  👤 Dodał:  ${item.author}`);
        console.log(`  📅 Data:   ${item.date}`);
        console.log(`  📄 Treść:  ${item.content.slice(0, 200).replace(/\n/g, ' ')}...`);
        console.log('----------------------------------------------------');
      });
    }

    console.log('\nWylogowywanie...');
    await client.logout();
    console.log('✅ Wylogowano.');

  } catch (error) {
    console.error('❌ Błąd:', error.message);
    if (error.details) console.error('Szczegóły:', error.details);
  }
}

checkAnnouncements();
