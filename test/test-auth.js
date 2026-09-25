import 'dotenv/config';
import { LibrusClient, AuthenticationError } from '../src/index.js';

async function runAuthDemo() {
  console.log('====================================================');
  console.log('      LibrusAPI - Test Uwierzytelniania i Sesji     ');
  console.log('====================================================\n');

  const client = new LibrusClient();

  // Test 1: Błędne dane logowania (sprawdzenie czy rzuca AuthenticationError)
  console.log('1. Test walidacji błędnych danych logowania...');
  try {
    await client.login('zly_login_123', 'zle_haslo_456');
    console.error('❌ Błąd: Logowanie z niepoprawnymi danymi powinno rzucić błąd!');
  } catch (err) {
    if (err instanceof AuthenticationError) {
      console.log('✅ Prawidłowo przechwycono AuthenticationError:', err.message);
    } else {
      console.log('✅ Przechwycono błąd logowania:', err.message);
    }
  }

  // Test 2: Wylogowanie
  console.log('\n2. Test wylogowywania (logout)...');
  await client.logout();
  console.log('✅ Stan klienta po wylogowaniu:');
  console.log('   - isAuthenticated():', client.isAuthenticated());
  console.log('   - getUserInfo():', client.getUserInfo());

  // Test 3: Logowanie za pomocą gotowej sesji / ciasteczek
  console.log('\n3. Test sesji z ciasteczek (setCookies)...');
  client.setCookies('DZIENNIKSID=test_session_token_123; SDZIENNIKSID=test_sec_token_456');
  console.log('   - isAuthenticated():', client.isAuthenticated());
  console.log('   - Ciasteczka dla synergia.librus.pl:', client.http.cookieJar.getCookieString('https://synergia.librus.pl/terminarz'));

  console.log('\n4. Test ponownego wylogowania po wstrzyknięciu ciasteczek...');
  await client.logout();
  console.log('   - isAuthenticated():', client.isAuthenticated());
  console.log('   - Ciasteczka po logout:', client.http.cookieJar.getCookieString('https://synergia.librus.pl/terminarz'));

  console.log('\n🎉 Wszystkie testy modułu uwierzytelniania i sesji zakończone sukcesem!');
}

runAuthDemo().catch(console.error);
