import assert from 'node:assert/strict';
import test from 'node:test';
import { settleExpense } from './settle-expense.mjs';

test('charges known expenses and returns the unused reservation exactly', () => {
  assert.deepEqual(
    settleExpense({ reservedFee: 1_000n, outgoingExpense: 540n, internalExpense: 160n }),
    {
      reservedFee: 1_000n,
      outgoingExpense: 540n,
      internalExpense: 160n,
      chargedFee: 700n,
      refund: 300n,
    },
  );
});

test('refunds the entire reservation when no expense was incurred', () => {
  const result = settleExpense({ reservedFee: 25n, outgoingExpense: 0n, internalExpense: 0n });
  assert.equal(result.chargedFee, 0n);
  assert.equal(result.refund, 25n);
});

test('allows an exact reservation with no refund', () => {
  const result = settleExpense({ reservedFee: 17n, outgoingExpense: 9n, internalExpense: 8n });
  assert.equal(result.chargedFee, 17n);
  assert.equal(result.refund, 0n);
});

test('allows a zero reservation only when expenses are also zero', () => {
  assert.equal(
    settleExpense({ reservedFee: 0n, outgoingExpense: 0n, internalExpense: 0n }).refund,
    0n,
  );
  assert.throws(
    () => settleExpense({ reservedFee: 0n, outgoingExpense: 1n, internalExpense: 0n }),
    RangeError,
  );
});

test('preserves precision above the JavaScript safe-number range', () => {
  const result = settleExpense({
    reservedFee: 90_071_992_547_409_931n,
    outgoingExpense: 90_071_992_547_409_925n,
    internalExpense: 3n,
  });
  assert.equal(result.chargedFee, 90_071_992_547_409_928n);
  assert.equal(result.refund, 3n);
});

test('rejects an overrun instead of silently increasing the charge', () => {
  assert.throws(
    () => settleExpense({ reservedFee: 10n, outgoingExpense: 8n, internalExpense: 3n }),
    { name: 'RangeError', message: /review is required/ },
  );
});

for (const field of ['reservedFee', 'outgoingExpense', 'internalExpense']) {
  test(`rejects a negative ${field}`, () => {
    assert.throws(
      () =>
        settleExpense({ reservedFee: 10n, outgoingExpense: 0n, internalExpense: 0n, [field]: -1n }),
      { name: 'RangeError', message: new RegExp(field) },
    );
  });

  test(`requires ${field} to be a bigint without coercion`, () => {
    for (const invalid of [0, 0.1, '0', null, undefined, true, NaN, Infinity]) {
      assert.throws(
        () =>
          settleExpense({
            reservedFee: 10n,
            outgoingExpense: 0n,
            internalExpense: 0n,
            [field]: invalid,
          }),
        { name: 'TypeError', message: new RegExp(field) },
      );
    }
  });
}

test('rejects missing or non-object input', () => {
  for (const invalid of [undefined, null, [], 1n, 'expense', () => 0n, {}]) {
    assert.throws(() => settleExpense(invalid), TypeError);
  }
});

test('does not mutate the input and freezes its returned record', () => {
  const input = Object.freeze({ reservedFee: 10n, outgoingExpense: 2n, internalExpense: 3n });
  const result = settleExpense(input);
  assert.notEqual(result, input);
  assert.deepEqual(input, { reservedFee: 10n, outgoingExpense: 2n, internalExpense: 3n });
  assert.ok(Object.isFrozen(result));
  assert.throws(() => (result.refund = 10n), TypeError);
});

test('conserves every smallest unit across a range of valid reservations', () => {
  for (let reservedFee = 0n; reservedFee <= 30n; reservedFee += 1n) {
    for (let outgoingExpense = 0n; outgoingExpense <= reservedFee; outgoingExpense += 1n) {
      for (
        let internalExpense = 0n;
        internalExpense <= reservedFee - outgoingExpense;
        internalExpense += 1n
      ) {
        const result = settleExpense({ reservedFee, outgoingExpense, internalExpense });
        assert.equal(result.chargedFee + result.refund, reservedFee);
        assert.ok(result.refund >= 0n);
        assert.equal(result.chargedFee - outgoingExpense, internalExpense);
      }
    }
  }
});
