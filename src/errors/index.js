/**
 * Bazowy błąd biblioteki LibrusAPI
 */
export class LibrusError extends Error {
  constructor(message, code = 'LIBRUS_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Błąd uwierzytelnienia (błędny login, hasło, konto zablokowane itp.)
 */
export class AuthenticationError extends LibrusError {
  constructor(message = 'Niepoprawne dane logowania lub błąd autoryzacji', details = {}) {
    super(message, 'AUTHENTICATION_ERROR', details);
  }
}

/**
 * Wymagane uwierzytelnianie dwuskładnikowe (2FA)
 */
export class TwoFactorRequiredError extends LibrusError {
  constructor(message = 'Konto wymaga uwierzytelnienia dwuskładnikowego (2FA)', details = {}) {
    super(message, '2FA_REQUIRED', details);
  }
}

/**
 * Błąd wygasłej sesji użytkownika
 */
export class SessionExpiredError extends LibrusError {
  constructor(message = 'Sesja wygasła. Wymagane ponowne zalogowanie.', details = {}) {
    super(message, 'SESSION_EXPIRED', details);
  }
}

/**
 * Wymagana weryfikacja CAPTCHA / Bot protection
 */
export class CaptchaRequiredError extends LibrusError {
  constructor(message = 'Wykryto zabezpieczenie CAPTCHA / bot protection.', details = {}) {
    super(message, 'CAPTCHA_REQUIRED', details);
  }
}

/**
 * Błąd parsowania odpowiedzi HTML/JSON
 */
export class ParseError extends LibrusError {
  constructor(message = 'Nie udało się przetworzyć odpowiedzi serwera Librus', details = {}) {
    super(message, 'PARSE_ERROR', details);
  }
}
