import 'dotenv/config';
import { LibrusClient } from '../src/index.js';

async function testSentMessages() {
  const client = new LibrusClient();

  const login = process.env.OLEK_LIBRUS_LOGIN;
  const password = process.env.OLEK_LIBRUS_PASS;

  console.log('1. Logowanie do Librusa...');
  const authRes = await client.login(login, password);
  console.log('Zalogowano pomyślnie!', authRes?.user?.name || '');

  console.log('\n2. Pobieranie listy wiadomości wysłanych (client.messages.getSent())...');
  const sentMessages = await client.messages.getSent();
  console.log(`Liczba wiadomości w skrzynce wysłanych: ${sentMessages.length}`);

  if (sentMessages.length === 0) {
    console.log('Skrzynka wysłanych jest pusta na koncie Olek. Sprawdzam drugie konto (Julek)...');
    const julekClient = new LibrusClient();
    await julekClient.login(process.env.JULEK_LIBRUS_LOGIN, process.env.JULEK_LIBRUS_PASS);
    const julekSent = await julekClient.messages.getSent();
    console.log(`Liczba wiadomości wysłanych na koncie Julek: ${julekSent.length}`);
    if (julekSent.length > 0) {
      displayMessages(julekSent, julekClient);
      return;
    }
  } else {
    displayMessages(sentMessages, client);
  }
}

async function displayMessages(messages, client) {
  console.log('\n--- Przykładowe wiadomości wysłane ---');
  messages.slice(0, 5).forEach((msg, idx) => {
    console.log(`[#${idx + 1}] ID: ${msg.id}`);
    console.log(`     Odbiorca/Nadawca: ${msg.sender}`);
    console.log(`     Temat: ${msg.subject}`);
    console.log(`     Data: ${msg.date}`);
    console.log(`     Załącznik: ${msg.hasAttachment}`);
    console.log(`     URL: ${msg.url}`);
  });

  const firstMsg = messages[0];
  if (firstMsg) {
    console.log(`\n3. Pobieranie pełnej treści wiadomości wysłanej o ID: ${firstMsg.id}...`);
    try {
      // Dla wiadomości wysłanych folderId = 2
      const details = await client.messages.getMessage(firstMsg.id, 2);
      console.log('--- Szczegóły wiadomości ---');
      console.log(`Nadawca: ${details.sender}`);
      console.log(`Adresat: ${details.recipient}`);
      console.log(`Temat: ${details.subject}`);
      console.log(`Data: ${details.date}`);
      console.log(`Liczba załączników: ${details.attachments?.length || 0}`);
      console.log('Początek treści:');
      console.log(details.content ? details.content.slice(0, 200) + '...' : '(pusta treść)');
    } catch (err) {
      console.error('Błąd podczas pobierania szczegółów wiadomości:', err.message);
    }
  }
}

testSentMessages().catch(console.error);
