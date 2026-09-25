import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeDate, isAfterOrEqual, isStrictlyAfter } from '../src/utils/dateUtils.js';

describe('dateUtils', () => {
  it('should correctly normalize various date formats', () => {
    const d1 = normalizeDate('2026-09-24 15:30:00');
    assert.ok(d1 instanceof Date);
    assert.strictEqual(d1.getFullYear(), 2026);
    assert.strictEqual(d1.getMonth(), 8); // 0-indexed: Sept = 8
    assert.strictEqual(d1.getDate(), 24);
    assert.strictEqual(d1.getHours(), 15);
    assert.strictEqual(d1.getMinutes(), 30);

    const d2 = normalizeDate('2026-09-24');
    assert.ok(d2 instanceof Date);
    assert.strictEqual(d2.getFullYear(), 2026);
    assert.strictEqual(d2.getDate(), 24);

    const now = new Date();
    const d3 = normalizeDate(now);
    assert.strictEqual(d3.getTime(), now.getTime());

    const timestamp = Date.now();
    const d4 = normalizeDate(timestamp);
    assert.strictEqual(d4.getTime(), timestamp);

    assert.strictEqual(normalizeDate(''), null);
    assert.strictEqual(normalizeDate(null), null);
    assert.strictEqual(normalizeDate('invalid-date'), null);
  });

  it('should compare dates accurately with isAfterOrEqual', () => {
    assert.strictEqual(isAfterOrEqual('2026-09-25 10:00:00', '2026-09-24 15:00:00'), true);
    assert.strictEqual(isAfterOrEqual('2026-09-24 15:00:00', '2026-09-24 15:00:00'), true);
    assert.strictEqual(isAfterOrEqual('2026-09-24 14:59:59', '2026-09-24 15:00:00'), false);
    assert.strictEqual(isAfterOrEqual('2026-09-25', '2026-09-24'), true);
    assert.strictEqual(isAfterOrEqual('2026-09-23', '2026-09-24'), false);
  });

  it('should compare dates accurately with isStrictlyAfter', () => {
    assert.strictEqual(isStrictlyAfter('2026-09-25 10:00:00', '2026-09-24 15:00:00'), true);
    assert.strictEqual(isStrictlyAfter('2026-09-24 15:00:00', '2026-09-24 15:00:00'), false);
    assert.strictEqual(isStrictlyAfter('2026-09-24 15:00:01', '2026-09-24 15:00:00'), true);
  });
});
