# AGENTS.md

Dokument wytycznych i standardów dla agentów AI współpracujących przy rozwoju biblioteki **LibrusAPI**.

---

## 🎯 Cel Projektu
Rozwój modułowej, nowoczesnej biblioteki JavaScript/Node.js służącej do komunikacji z systemem Librus Synergia i Portalem Librus, bazującej na analizie ruchu sieciowego (reverse engineering na podstawie plików `.har` i odpowiedzi HTTP/HTML/JSON).

---

## 🏗 Standardy Techniczne i Architektura

### 1. Środowisko i runtime
- **Runtime:** Node.js (wersja >= 18 LTS).
- **Format modułów:** ECMAScript Modules (`"type": "module"` w `package.json`).
- **Zależności:**
  - `cheerio` – do parsowania widoków HTML i selektorów DOM,
  - `tough-cookie` / `axios` lub natywny `fetch` z customowym CookieJar – do zarządzania sesją i ciasteczkami w przekierowaniach między domenami (`api.librus.pl`, `synergia.librus.pl`, `portal.librus.pl`).

### 2. Podział odpowiedzialności w kodzie
- `src/client/HttpClient.js`:
  - Obsługa wszystkich żądań HTTP.
  - Automatyczne śledzenie przekierowań (301, 302, 303, 307).
  - Prawidłowe nagłówki przeglądarkowe (`User-Agent`, `Accept`, `Referer`, `Sec-Fetch-*`).
  - Przechowywanie i synchronizacja ciasteczek sesyjnych dla poszczególnych domen.
- `src/client/AuthManager.js`:
  - Izolacja logiki autoryzacji.
  - Obsługa endpointów:
    1. OAuth: `https://api.librus.pl/OAuth/Authorization?client_id=46`
    2. Bramka logowania: `https://synergia.librus.pl/gateway/api/2.0/Auth/Login`
    3. Portal: `https://portal.librus.pl/konto/login/action`
  - Obsługa błędów autoryzacji (złe hasło, wymagana zmiana hasła, 2FA, blokada konta).
- `src/parsers/`:
  - Wszystkie metody parsujące HTML powinny być czystymi funkcjami (pure functions), przyjmującymi string HTML i zwracającymi ustrukturyzowany obiekt JavaScript.
  - Odporność na brakujące elementy i zmiany layoutu Librusa (bezpieczne wyciąganie wartości z fallbackiem `null` / `undefined`).
- `src/modules/`:
  - Klasy reprezentujące konkretne domeny funkcjonalne: `Timetable`, `Grades`, `Messages`, `Attendance`, `Schedule`, `Announcements`.
  - Każdy moduł korzysta ze wspólnej instancji `HttpClient`.

---

## 🔒 Wytyczne Bezpieczeństwa i Dobre Praktyki
1. **Ochrona danych wrażliwych:**
   - Nigdy nie zapisuj w kodzie testowym ani w repozytorium prawdziwych haseł, loginów ani PESEL.
   - W plikach `.har` w folderze `examples/` sprawdzaj, czy nie ma wrażliwych tokenów, danych osobowych czy danych sesyjnych użytkowników.
2. **Kultura zapytań (Rate Limiting):**
   - Unikaj agresywnego odpytywania serwerów Librusa.
   - W implementacjach pobierania wsadowego (np. załączniki, historia wielu miesięcy) stosuj delikatne opóźnienia (`sleep`/`delay`).
3. **Obsługa błędów:**
   - Zawsze twórz czytelne klasy błędów dziedziczące po `LibrusError`, np. `AuthenticationError`, `SessionExpiredError`, `CaptchaRequiredError`, `ParseError`.

---

## 🧪 Strategia Testowania
- **Testy z mockami (Offline):** Zapisane próbki HTML i odpowiedzi JSON w katalogu `test/fixtures/` powinny być używane do testowania parserów bez konieczności połączenia z internetem.
- **Testy integracyjne (Online):** Uruchamiane opcjonalnie z użyciem zmiennych środowiskowych (`LIBRUS_LOGIN`, `LIBRUS_PASSWORD`), sprawdzające poprawność procesu logowania i pobierania danych.

---

## 📝 Konwencja Komunikatów i Kodu
- Język kodu (nazwy funkcji, zmiennych, klas): **angielski** (`getTimetable`, `AuthManager`, `fetchGrades`).
- Komentarze JSDoc przy każdej publicznej metodzie określające typy parametrów i zwracanych wartości.
- Pliki i katalogi nazywane w konwencji `kebab-case` lub `camelCase` dla modułów.
