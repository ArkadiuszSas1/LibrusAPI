import 'dotenv/config';
import { LibrusClient } from '../src/index.js';

async function checkWithCookies() {
  const client = new LibrusClient();
  const cookies = process.env.LIBRUS_COOKIES;

  if (!cookies) {
    console.log('ℹ️ Aby pobrać dane z aktywnej sesji przeglądarki, dodaj do pliku .env:');
    console.log('LIBRUS_COOKIES="DZIENNIKSID=...; SDZIENNIKSID=..."');
    return;
  }

  client.setCookies(cookies);

  console.log('--- ✉️ POBIERANIE WIADOMOŚCI Z AKTYWNEJ SESJI ---');
  try {
    const inbox = await client.messages.getInbox();
    console.log(`Pobrano wiadomości: ${inbox.length}\n`);

    inbox.slice(0, 10).forEach((msg, idx) => {
      console.log(`[${idx + 1}] ID: ${msg.id} | Data: ${msg.date}`);
      console.log(`    Od: ${msg.sender}`);
      console.log(`    Temat: ${msg.subject}`);
      console.log(`    Załącznik: ${msg.hasAttachment ? 'TAK' : 'NIE'} | Przeczytana: ${msg.isRead ? 'TAK' : 'NIE'}\n`);
    });

    if (inbox.length > 0) {
      console.log(`Pobieranie pełnej treści najnowszej wiadomości (ID: ${inbox[0].id})...`);
      const details = await client.messages.getMessage(inbox[0].id);
      console.log('\n--- TREŚĆ NAJNOWSZEJ WIADOMOŚCI ---');
      console.log(details.content);
      if (details.attachments.length > 0) {
        console.log('\nZałączniki:', details.attachments);
      }
    }
  } catch (e) {
    console.error('Błąd:', e.message);
  }
}

checkWithCookies();
