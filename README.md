# LibrusAPI (Node.js)

Biblioteka w środowisku Node.js do integracji i automatyzacji interakcji z systemem **Librus Synergia** oraz **Portalem Librus**.

> **Uwaga:** Jest to nieoficjalna biblioteka. Narzędzie jest przeznaczone do celów edukacyjnych i integracji własnych kont. Używaj go w sposób odpowiedzialny, unikając nadmiernego obciążania serwerów.

---

## 🚀 Spis treści
- [Możliwości](#-możliwości)
- [Wymagania](#-wymagania)
- [Instalacja](#-instalacja)
- [Architektura uwierzytelniania](#-architektura-uwierzytelniania)
- [Szybki start (Logowanie)](#-szybki-start-logowanie)
  - [1. Logowanie poświadczeniami (Synergia)](#1-logowanie-za-pomocą-loginu-i-hasła-synergia)
  - [2. Logowanie sesją ciasteczek (Cookies / HAR)](#2-logowanie-za-pomocą-istniejącej-sesji-cookies--har)
  - [3. Terminarz i kalendarz szkolny (`/terminarz`)](#3-terminarz-i-kalendarz-szkolny-terminarz)
  - [4. Obsługa Wiadomości (`/wiadomosci`)](#4-obsługa-wiadomości-skrzynka-odbiorcza-treść-załączniki)
  - [5. Zadania domowe (`/moje_zadania`)](#5-zadania-domowe-lista-terminy-pliki-od-nauczyciela)
  - [6. Ogłoszenia szkolne (`/ogloszenia`)](#6-ogłoszenia-szkolne-ogloszenia)
  - [7. Uwagi i pochwały (`/uwagi`)](#7-uwagi-i-pochwały-uwagi)
  - [8. Synchronizacja przyrostowa (`since`)](#8-synchronizacja-przyrostowa-i-filtrowanie-po-dacie--czasie-since)
- [Struktura projektu](#-struktura-projektu)
- [Bezpieczeństwo](#️-bezpieczeństwo)

---

## 📌 Możliwości
- 🔑 **Obsługa metod logowania**:
  - Bezpośrednie logowanie kontem Synergia (Login/Hasło przez bramkę OAuth Librus),
  - Automatyczne zarządzanie sesją ciasteczek i domenami (`api.librus.pl`, `synergia.librus.pl`),
  - Import gotowej sesji z ciasteczek (Cookie / HAR).
- 📅 **Terminarz i sprawdziany (`/terminarz`)**:
  - Kalendarz miesięczny z automatycznym pobieraniem bieżącego i kolejnych miesięcy (`getUpcoming`),
  - Sprawdziany, kartkówki, prace domowe, zastępstwa, odwołane lekcje, wycieczki i wywiadówki,
  - Wpisy dodane od ostatniego logowania (`getAddedSinceLastLogin`).
- ✉️ **Wiadomości (`/wiadomosci`)**:
  - Odczytywanie odebranych, wysłanych i usuniętych wiadomości,
  - Pobieranie pełnej treści wiadomości i załączników,
  - Inteligentna wczesna paginacja przy filtrowaniu po dacie.
- 📚 **Zadania domowe (`/moje_zadania`)**:
  - Lista zadań z terminami oddania, przedmiotami i plikami załączników od nauczycieli.
- 📢 **Ogłoszenia szkolne (`/ogloszenia`)**:
  - Komunikaty dyrekcji i nauczycieli z datami publikacji i treścią HTML/tekstową.
- 📝 **Uwagi i pochwały (`/uwagi`)**:
  - Lista uwag pozytywnych, negatywnych, punktów zachowania i nazwisk nauczycieli.
- ⏱️ **Filtrowanie przyrostowe (`since`)**:
  - Pobieranie tylko nowych wiadomości, ogłoszeń, uwag i zadań od podanego znacznika czasu (np. z poprzedniego uruchomienia zewnętrznego skryptu / crona).

---

## 🛠 Wymagania
- Node.js >= 18.0.0 (wsparcie dla natywnego `fetch` / `FormData` lub `axios` / `undici`)

---

## 📦 Instalacja
```bash
npm install
```

---

## 🔐 Architektura uwierzytelniania

Librus nie udostępnia otwartego publicznego API dla aplikacji zewnętrznych. Logowanie do Synergii odbywa się w oparciu o proces autoryzacji bramkowego OAuth2:

```
[Klient LibrusAPI]
       │
       ├─► 1. GET  https://api.librus.pl/OAuth/Authorization?client_id=46
       │           (Inicjalizacja kontekstu sesji)
       │
       ├─► 2. POST https://api.librus.pl/OAuth/Authorization?client_id=46
       │           Body: action=login&login={login}&pass={haslo}
       │           (Wysłanie poświadczeń)
       │
       ├─► 3. Odbiór przekierowania (302 Redirect) lub odpowiedzi autoryzacyjnej
       │      Przejście na: https://synergia.librus.pl/gateway/api/2.0/Auth/Login
       │      lub https://synergia.librus.pl/loguj/portal
       │
       └─► 4. Ustanowienie sesji ciasteczek (LibrusSynergiaSession / PHPSESSID)
              Wszystkie kolejne zapytania do https://synergia.librus.pl/*
              używają tego słoika ciasteczek (Cookie Jar).
```

---

## ⚡ Szybki start (Logowanie)

### 1. Logowanie za pomocą loginu i hasła (Synergia)
```javascript
import { LibrusClient } from './src/index.js';

const client = new LibrusClient();

async function main() {
  try {
    // 1. Zalogowanie do systemu
    await client.login({
      login: '1234567u',
      password: 'TwojeTajneHaslo'
    });

    console.log('Zalogowano pomyślnie!');
    console.log('Użytkownik:', client.getUserInfo());

  } catch (error) {
    console.error('Błąd podczas logowania lub pobierania danych:', error.message);
  }
}

main();
```

### 2. Logowanie za pomocą istniejącej sesji (Cookies / HAR)
```javascript
import { LibrusClient } from './src/index.js';

const client = new LibrusClient();

// Ustawienie gotowych ciasteczek z przechwyconej sesji
client.setCookies('DZIENNIKSID=abcdef123456...; SDZIENNIKSID=...');

const events = await client.timetable.getUpcoming();
console.log(events);
```

### 3. Terminarz i kalendarz szkolny (`/terminarz`)
Moduł terminarza pozwala na odczyt pełnego kalendarza wydarzeń szkolnych (sprawdziany, kartkówki, prace domowe, zastępstwa, odwołane lekcje, wycieczki, wywiadówki) z automatycznym łączeniem kolejnych miesięcy.

```javascript
import { LibrusClient } from './src/index.js';

const client = new LibrusClient();
await client.login('12312130', 'TwojeHaslo123#');

// 1. Pobranie wydarzeń z bieżącego oraz następnego miesiąca (np. wrzesień + październik)
const upcomingEvents = await client.timetable.getUpcoming({ monthsAhead: 1 });
console.log(`Liczba wydarzeń w kalendarzu: ${upcomingEvents.length}`);

for (const event of upcomingEvents) {
  console.log(`📅 [${event.date}] [${event.category.toUpperCase()}] ${event.title}`);
  if (event.teacher) console.log(`   Nauczyciel: ${event.teacher}`);
  if (event.lessonNumber) console.log(`   Lekcja nr: ${event.lessonNumber}`);
  if (event.description) console.log(`   Opis: ${event.description}`);
}

// 2. Pobranie konkretnego miesiąca i roku (np. październik 2026)
const octoberEvents = await client.timetable.getMonth(10, 2026);

// 3. Pobranie wpisów dodanych do terminarza od ostatniego logowania
const addedEvents = await client.timetable.getAddedSinceLastLogin();
```

#### Przykładowy obiekt zdarzenia kalendarza (`CalendarEvent`):
```json
{
  "id": "12462979",
  "date": "2026-09-11",
  "category": "sprawdzian",
  "subject": "język polski",
  "title": "język polski - sprawdzian",
  "description": "Test sprawdzający umiejętności po klasie szóstej.",
  "teacher": "Lipowska Monika",
  "addedDate": "2026-09-07 09:11:17",
  "lessonNumber": "4",
  "time": null,
  "room": null,
  "targetClass": "7k SP133 -1-8",
  "rawText": "Nr lekcji: 4język polski, sprawdzian7k SP133 -1-8"
}
```

### 4. Obsługa Wiadomości (Skrzynka odbiorcza, wysłane, treść, załączniki)
```javascript
import { LibrusClient } from './src/index.js';

const client = new LibrusClient();
await client.login('12312130', 'TwojeHaslo123#');

// 1. Pobranie listy wiadomości ze skrzynki odbiorczej
const inbox = await client.messages.getInbox();
console.log(`Liczba wiadomości: ${inbox.length}`);

for (const msg of inbox) {
  console.log(`[${msg.id}] Od: ${msg.sender} | Temat: ${msg.subject} | Przeczytana: ${msg.isRead}`);
}

// Pobranie pełnej treści pierwszej wiadomości odebranej
if (inbox.length > 0) {
  const details = await client.messages.getMessage(inbox[0].id);
  console.log('Treść wiadomości:\n', details.content);
  console.log('Załączniki:', details.attachments);
}

// 2. Pobranie wiadomości wysłanych (skrzynka nadawcza)
const sent = await client.messages.getSent();
console.log(`Liczba wiadomości wysłanych: ${sent.length}`);

for (const msg of sent) {
  console.log(`[${msg.id}] Do: ${msg.sender} | Temat: ${msg.subject} | Data: ${msg.date}`);
}

// Pobranie pełnej treści wiadomości wysłanej
if (sent.length > 0) {
  const sentDetails = await client.messages.getSentMessage(sent[0].id);
  console.log('Adresat:', sentDetails.recipient);
  console.log('Treść wiadomości wysłanej:\n', sentDetails.content);
}
```

### 5. Zadania domowe (Lista, terminy, pliki od nauczyciela)
```javascript
import { LibrusClient } from './src/index.js';

const client = new LibrusClient();
await client.login('12312130', 'TwojeHaslo123#');

// Pobranie aktualnych zadań domowych
const homeworkList = await client.homework.list();
console.log(`Liczba zadań: ${homeworkList.length}`);

for (const task of homeworkList) {
  console.log(`[${task.id}] Przedmiot: ${task.subject} | Termin: ${task.dueDate} | Zadanie: ${task.topic}`);
}

// Pobranie szczegółów zadania domowego
if (homeworkList.length > 0) {
  const taskDetails = await client.homework.getDetails(homeworkList[0].id);
  console.log('Treść zadania:', taskDetails.content);
  console.log('Załączniki:', taskDetails.attachments);
}
```

### 6. Ogłoszenia szkolne (`/ogloszenia`)
```javascript
import { LibrusClient } from './src/index.js';

const client = new LibrusClient();
await client.login('12312130', 'TwojeHaslo123#');

// Pobranie wszystkich ogłoszeń ze szkoły
const announcements = await client.announcements.list();
console.log(`Liczba ogłoszeń: ${announcements.length}`);

for (const item of announcements) {
  console.log(`📌 [${item.date}] ${item.title} (Dodał: ${item.author})`);
  console.log(item.content);
}
```

### 7. Uwagi i pochwały (`/uwagi`)
```javascript
import { LibrusClient } from './src/index.js';

const client = new LibrusClient();
await client.login('12312130', 'TwojeHaslo123#');

// Pobranie wszystkich uwag ucznia
const notes = await client.notes.list();
console.log(`Liczba uwag: ${notes.length}`);

for (const note of notes) {
  console.log(`[${note.date}] ${note.type.toUpperCase()}: ${note.text} (Wystawił: ${note.teacher})`);
}

// Pobranie uwag dodanych od konkretnej daty
const recentNotes = await client.notes.getSince('2026-09-20');
```

### 8. Oceny bieżące, semestralne i kształtujące (`/przegladaj_oceny/uczen`)
Moduł ocen umożliwia pobieranie ocen cząstkowych, ocen kształtujących/opisowych oraz zestawień semestralnych i rocznych wraz ze średnimi:

```javascript
import { LibrusClient } from './src/index.js';

const client = new LibrusClient();
await client.login('12312130', 'TwojeHaslo123#');

// 1. Pobranie wszystkich ocen bieżących
const grades = await client.grades.list();
console.log(`Liczba ocen: ${grades.length}`);

for (const g of grades) {
  console.log(`[${g.date}] [${g.subject}] Ocena: ${g.grade} (Kategoria: ${g.category}, Nauczyciel: ${g.teacher})`);
  if (g.comment) console.log(`   Komentarz: ${g.comment}`);
  if (g.weight !== null) console.log(`   Waga: ${g.weight}`);
}

// 2. Pobranie ocen wystawionych od konkretnej daty
const recentGrades = await client.grades.getSince('2026-09-20');

// 3. Pobranie ocen z filtrowaniem po przedmiocie lub kategorii
const mathQuizzes = await client.grades.list({
  subject: 'matematyka',
  category: 'kartkówka'
});

// 4. Podsumowanie ocen wg przedmiotów (średnie i oceny końcowe)
const subjectsSummary = await client.grades.getSubjects();
for (const sub of subjectsSummary) {
  console.log(`Przedmiot: ${sub.subject}`);
  console.log(`  Semestr 1: średnia: ${sub.semester1.average || '-'}, ocena: ${sub.semester1.finalGrade || '-'}`);
  console.log(`  Semestr 2: średnia: ${sub.semester2.average || '-'}, ocena: ${sub.semester2.finalGrade || '-'}`);
}

// 5. Oceny kształtujące / opisowe
const formative = await client.grades.getFormativeGrades();
for (const f of formative) {
  console.log(`[${f.date}] [${f.subject}] [${f.category}]: ${f.text}`);
}
```

### 9. Frekwencja i nieobecności (`/przegladaj_nb/uczen`)
Moduł frekwencji umożliwia odczyt wpisów obecności, spóźnień, nieobecności usprawiedliwionych/nieusprawiedliwionych oraz podsumowań dziennych i semestralnych:

```javascript
import { LibrusClient } from './src/index.js';

const client = new LibrusClient();
await client.login('12312130', 'TwojeHaslo123#');

// 1. Pobranie wszystkich wpisów frekwencji (spóźnienia, nieobecności)
const entries = await client.attendance.list();
console.log(`Liczba zdarzeń frekwencji: ${entries.length}`);

for (const e of entries) {
  console.log(`[${e.date}] Lekcja nr ${e.lessonNumber}: ${e.subject}`);
  console.log(`  Rodzaj: ${e.type} (${e.symbol}) | Nauczyciel: ${e.teacher}`);
}

// 2. Pobranie wpisów wystawionych od konkretnej daty
const recentAttendance = await client.attendance.getSince('2026-09-20');

// 3. Filtrowanie po typie lub przedmiocie
const latenesses = await client.attendance.list({ type: 'spóźnienie' });

// 4. Podsumowanie dzienne frekwencji
const days = await client.attendance.getDays();
for (const day of days) {
  console.log(`[${day.date}] Spóźnienia: ${day.lateness}, Nieobecności: ${day.totalAbsences}, Zwolnienia: ${day.exempt}`);
}

// 5. Podsumowanie semestralne
const totals = await client.attendance.getTotals();
console.log('Podsumowanie semestralne:', totals);
```

### 10. Synchronizacja przyrostowa i filtrowanie po dacie / czasie (`since`)
Biblioteka idealnie nadaje się do okresowo uruchamianych skryptów (np. co godzinę lub raz dziennie). Wystarczy przekazać znacznik czasu poprzedniego uruchomienia (`since`), a biblioteka automatycznie zwróci tylko nowe wpisy:

```javascript
import { LibrusClient } from './src/index.js';

const client = new LibrusClient();
await client.login('12312130', 'TwojeHaslo123#');

// Data i godzina poprzedniego wykonania Twojego skryptu:
const lastRun = '2026-09-24 15:00:00'; // lub obiekt new Date(...)

// 1. Nowe wiadomości odebrane po 24 września 15:00 (automatycznie paginuje i zatrzymuje się na starszych)
const newMessages = await client.messages.getSince(lastRun);
console.log(`Nowe wiadomości (${newMessages.length}):`);
for (const msg of newMessages) {
  console.log(`- [${msg.date}] ${msg.sender}: ${msg.subject}`);
}

// 2. Nowe ogłoszenia opublikowane po dacie
const newAnnouncements = await client.announcements.getSince(lastRun);
console.log(`Nowe ogłoszenia (${newAnnouncements.length}):`);

// 3. Nowe uwagi wystawione po dacie
const newNotes = await client.notes.getSince(lastRun);
console.log(`Nowe uwagi (${newNotes.length}):`);

// 4. Nowe zadania domowe
const newHomework = await client.homework.getSince(lastRun);
console.log(`Nowe zadania domowe (${newHomework.length}):`);

// 5. Nowe wydarzenia w terminarzu
const newEvents = await client.timetable.getSince(lastRun);
console.log(`Nowe wydarzenia w terminarzu (${newEvents.length}):`);

// 6. Nowe oceny
const newGrades = await client.grades.getSince(lastRun);
console.log(`Nowe oceny (${newGrades.length}):`);

// 7. Nowe wpisy frekwencji (spóźnienia, nieobecności)
const newAttendance = await client.attendance.getSince(lastRun);
console.log(`Nowe wpisy frekwencji (${newAttendance.length}):`);
```

---

## 📂 Struktura projektu
```
LibrusAPI/
├── src/
│   ├── client/
│   │   ├── HttpClient.js          # Klient HTTP zarządzający sesją i ciasteczkami
│   │   ├── AuthManager.js         # Obsługa logowania OAuth / Synergia / Portal
│   │   └── CookieJar.js           # Magazyn ciasteczek sesyjnych
│   ├── modules/
│   │   ├── Timetable.js           # Terminarz i sprawdziany
│   │   ├── Messages.js            # Wiadomości
│   │   ├── Homework.js            # Zadania domowe
│   │   ├── Announcements.js       # Ogłoszenia szkolne
│   │   ├── Notes.js               # Uwagi i pochwały
│   │   ├── Grades.js              # Oceny bieżące, semestralne i kształtujące
│   │   └── Attendance.js          # Frekwencja i nieobecności
│   ├── parsers/                   # Parsery HTML (Cheerio)
│   │   ├── UserInfoParser.js
│   │   ├── TimetableParser.js
│   │   ├── MessagesParser.js
│   │   ├── HomeworkParser.js
│   │   ├── AnnouncementsParser.js
│   │   ├── NotesParser.js
│   │   ├── GradesParser.js
│   │   └── AttendanceParser.js
│   ├── utils/
│   │   └── dateUtils.js           # Narzędzia do normalizacji i porównywania dat
│   ├── errors/                    # Hierarchia błędów LibrusError
│   │   ├── LibrusError.js
│   │   ├── AuthenticationError.js
│   │   ├── SessionExpiredError.js
│   │   ├── CaptchaRequiredError.js
│   │   └── ParseError.js
│   ├── LibrusClient.js            # Główna fasada klienta
│   └── index.js                   # Główny punkt wejścia biblioteki
├── test/                          # Testy jednostkowe i mocki (100% offline)
├── AGENTS.md                      # Wytyczne i instrukcje dla agentów AI
├── package.json
└── README.md
```

---

## 🛡️ Bezpieczeństwo
- Nigdy nie commituj swoich haseł, loginów ani plików `.env` do repozytorium.
- Pliki HAR mogą zawierać wrażliwe tokeny sesyjne – przed dodaniem do repozytorium upewnij się, że nie zawierają poufnych danych osobowych.
