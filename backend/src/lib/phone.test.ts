// Self-check for the outbound phone guard. Every accepted number becomes a billable call,
// so the failure that matters is accepting something we shouldn't.
//   npx tsx src/lib/phone.test.ts
import assert from 'node:assert/strict';
import { toE164, isAllowedNumber } from './phone.js';

// --- normalisation: the same human number in different formats must collapse to one value ---
assert.equal(toE164('+919966659900'), '+919966659900');
assert.equal(toE164('9966659900'), '+919966659900', 'bare 10-digit gets the default country code');
assert.equal(toE164('+91 99666 59900'), '+919966659900');
assert.equal(toE164('+91-99666-59900'), '+919966659900');
assert.equal(toE164('(996) 665-9900'), '+919966659900');
assert.equal(toE164('00919966659900'), '+919966659900', '00 international prefix');

// --- rejections: these must never reach the dialler ---
assert.equal(toE164(''), null);
assert.equal(toE164('   '), null);
assert.equal(toE164('abc'), null);
assert.equal(toE164('12345'), null, 'too short to be a subscriber number');
assert.equal(toE164('+1234567890123456'), null, 'longer than E.164 allows');
assert.equal(toE164(null as any), null);
assert.equal(toE164(undefined as any), null);

// --- allow list: unset means unrestricted, set means exactly those numbers ---
assert.equal(isAllowedNumber('+919966659900', undefined), true, 'unset => no restriction');
assert.equal(isAllowedNumber('+919966659900', ''), true);
assert.equal(isAllowedNumber('+919966659900', '   '), true);
assert.equal(isAllowedNumber('+919966659900', '+919966659900'), true);
assert.equal(isAllowedNumber('+919999999999', '+919966659900'), false, 'number outside the list must be blocked');
assert.equal(isAllowedNumber('+919966659900', '9966659900'), true, 'list entries are normalised too');
assert.equal(isAllowedNumber('+919966659900', '+918185020485, 9966659900'), true, 'multi-entry list');
assert.equal(isAllowedNumber('+911111111111', '+918185020485, 9966659900'), false);

console.log('phone guard: all checks passed');
