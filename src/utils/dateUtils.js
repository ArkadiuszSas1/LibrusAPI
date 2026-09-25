/**
 * Normalizuje różne formaty dat i czasu (Date, string, timestamp) do obiektu Date
 * @param {Date|string|number} input 
 * @returns {Date|null}
 */
export function normalizeDate(input) {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Obsługa formatu 'YYYY-MM-DD HH:mm:ss' -> zamiana spacji na 'T' dla bezpiecznego parsowania ISO
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const isoLike = trimmed.replace(/\s+/, 'T');
      const d = new Date(isoLike);
      if (!isNaN(d.getTime())) return d;
    }

    // Obsługa formatu 'YYYY-MM-DD'
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(`${trimmed}T00:00:00`);
      if (!isNaN(d.getTime())) return d;
    }

    // Standardowe parsowanie Date
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Sprawdza czy data elementu jest późniejsza lub równa dacie referencyjnej (since)
 * @param {string|Date} itemDate 
 * @param {Date|string|number} sinceDate 
 * @returns {boolean}
 */
export function isAfterOrEqual(itemDate, sinceDate) {
  const item = normalizeDate(itemDate);
  const since = normalizeDate(sinceDate);

  if (!item || !since) return true;

  // Jeżeli itemDate to tylko data bez podanego czasu ('YYYY-MM-DD')
  if (typeof itemDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(itemDate.trim())) {
    const itemDay = itemDate.trim();
    const sinceYear = since.getFullYear();
    const sinceMonth = String(since.getMonth() + 1).padStart(2, '0');
    const sinceDay = String(since.getDate()).padStart(2, '0');
    const sinceDateStr = `${sinceYear}-${sinceMonth}-${sinceDay}`;

    // Jeśli ten sam dzień lub późniejszy w kalendarzu, zaliczamy
    if (itemDay >= sinceDateStr) {
      return true;
    }
    return false;
  }

  return item.getTime() >= since.getTime();
}

/**
 * Sprawdza czy data elementu jest ściśle późniejsza od daty referencyjnej
 * @param {string|Date} itemDate 
 * @param {Date|string|number} sinceDate 
 * @returns {boolean}
 */
export function isStrictlyAfter(itemDate, sinceDate) {
  const item = normalizeDate(itemDate);
  const since = normalizeDate(sinceDate);

  if (!item || !since) return true;
  return item.getTime() > since.getTime();
}
