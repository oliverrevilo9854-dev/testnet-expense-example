# Testnet expense settlement example

A small, dependency-free JavaScript example for reconciling a fee reservation after the actual
outgoing and internal expenses are known. It demonstrates exact integer accounting and an explicit
failure when expenses exceed the reservation.

This is an arithmetic example for developers. It does not connect to a blockchain, estimate gas,
handle wallets, convert currencies, or send money.

## Run

Use Node.js 22 or newer. No dependency installation is needed.

```sh
node --test
```

## Example

```js
import { settleExpense } from './settle-expense.mjs';

const result = settleExpense({
  reservedFee: 1_000n,
  outgoingExpense: 540n,
  internalExpense: 160n,
});

// result.chargedFee === 700n
// result.refund === 300n
```

All inputs must be non-negative `bigint` values in the **same smallest unit of the same asset**.
The numbers above are illustrative units, not a fee schedule. A reservation is an upper bound on
the charge; the returned refund is the unused portion. There is no markup in this example.

The calculation preserves two rules:

- `chargedFee = outgoingExpense + internalExpense`
- `reservedFee = chargedFee + refund`

Numbers, decimal strings, missing values, and negative values are rejected. An overrun throws a
`RangeError`; callers must resolve it explicitly rather than silently charging more. The result is
frozen and the input is not modified.

## Integration boundary

An application must establish the actual expenses and their provenance before calling this
function. If expenses were paid in another asset, their conversion and rounding require a separate,
reviewed rule. This example intentionally does not assume a token price or a conversion rate.

Persisting a settlement, releasing a reservation, refunding a balance, handling retries exactly once,
and authorizing an operation are also the caller's responsibility. A passing arithmetic test is not
proof that a payment or a refund occurred.

The included tests cover zero expenses, exact reservations, overruns, invalid inputs, large integers,
immutability, and conservation of units across a range of values.
