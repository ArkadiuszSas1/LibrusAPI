import test from 'node:test';
import assert from 'node:assert';
import { CookieJar } from '../src/client/CookieJar.js';

test('CookieJar operations, domain matching and serialization', () => {
  const jar = new CookieJar();

  // Test setCookiesFromResponse
  jar.setCookiesFromResponse([
    'DZIENNIKSID=12345; path=/; domain=librus.pl; secure; HttpOnly',
    'SDZIENNIKSID=67890; path=/; secure; HttpOnly'
  ], 'https://synergia.librus.pl/terminarz');

  assert.strictEqual(jar.has('DZIENNIKSID'), true);
  assert.strictEqual(jar.get('DZIENNIKSID'), '12345');

  // Test getCookieString for matching subdomain
  const cookieHeader = jar.getCookieString('https://synergia.librus.pl/terminarz');
  assert.ok(cookieHeader.includes('DZIENNIKSID=12345'));
  assert.ok(cookieHeader.includes('SDZIENNIKSID=67890'));

  // Test getCookieString for non-matching domain
  const otherHeader = jar.getCookieString('https://example.com/test');
  assert.strictEqual(otherHeader, '');

  // Test raw cookies injection
  jar.setRawCookies('CustomToken=secret99; AnotherCookie=abc', 'synergia.librus.pl');
  assert.strictEqual(jar.get('CustomToken'), 'secret99');

  // Test clear
  jar.clear();
  assert.strictEqual(jar.has('DZIENNIKSID'), false);
  assert.strictEqual(jar.getCookieString('https://synergia.librus.pl'), '');
});
