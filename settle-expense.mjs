/**
 * Reconcile one reserved fee after its network expenses are known.
 * Every value must use the same smallest unit of the same asset.
 * This function does not estimate fees, convert assets, or move funds.
 *
 * @param {{ reservedFee: bigint, outgoingExpense: bigint, internalExpense: bigint }} input
 * @returns {Readonly<{ reservedFee: bigint, outgoingExpense: bigint, internalExpense: bigint, chargedFee: bigint, refund: bigint }>}
 */
export function settleExpense(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError('Expected an expense object.');
  }

  const fields = ['reservedFee', 'outgoingExpense', 'internalExpense'];
  for (const field of fields) {
    if (typeof input[field] !== 'bigint') {
      throw new TypeError(`${field} must be a bigint in the same smallest unit.`);
    }
    if (input[field] < 0n) {
      throw new RangeError(`${field} cannot be negative.`);
    }
  }

  const { reservedFee, outgoingExpense, internalExpense } = input;
  const chargedFee = outgoingExpense + internalExpense;
  if (chargedFee > reservedFee) {
    throw new RangeError('Actual expenses exceed the reserved fee; review is required.');
  }

  return Object.freeze({
    reservedFee,
    outgoingExpense,
    internalExpense,
    chargedFee,
    refund: reservedFee - chargedFee,
  });
}
