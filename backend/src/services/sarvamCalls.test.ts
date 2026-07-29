// Self-check for attempts pagination. Stubs axios — no network, no API credits spent.
//   npx tsx src/services/sarvamCalls.test.ts
import assert from 'node:assert/strict';
import axios from 'axios';
import { fetchAllAttempts } from './sarvamCalls.js';

const CFG = { org: 'o', workspace: 'w', appId: 'a', key: 'k' };
const RANGE = { start: '2026-01-01T00:00:00Z', end: '2026-12-31T00:00:00Z' };

const realGet = axios.get;
let calls: any[] = [];
/** Serve `total` rows in pages of `pageSize`, recording each request. */
function stub(total: number, pageSize = 1000, status = 200) {
  calls = [];
  (axios as any).get = async (_url: string, opts: any) => {
    calls.push(opts.params);
    if (status >= 400) return { status, data: {} };
    const offset = opts.params.offset ?? 0;
    const items = Array.from(
      { length: Math.max(0, Math.min(pageSize, total - offset)) },
      (_, i) => ({ interaction_id: `i${offset + i}` }),
    );
    return { status: 200, data: { items, total } };
  };
}

// single page: one request, no wasted round-trip
stub(8);
let rows = await fetchAllAttempts(CFG, RANGE);
assert.equal(rows.length, 8);
assert.equal(calls.length, 1, 'must not request a second page when the first covers total');

// more than one page: this is the bug the loop exists to prevent
stub(2500, 1000);
rows = await fetchAllAttempts(CFG, RANGE, 1000);
assert.equal(rows.length, 2500, 'must return every row, not just the first page');
assert.equal(calls.length, 3);
assert.deepEqual(calls.map(c => c.offset), [0, 1000, 2000], 'offset must advance by rows received');
assert.equal(new Set(rows.map((r: any) => r.interaction_id)).size, 2500, 'no duplicate rows across pages');

// exact multiple of page size: must stop, not loop on an empty final page
stub(2000, 1000);
rows = await fetchAllAttempts(CFG, RANGE, 1000);
assert.equal(rows.length, 2000);
assert.equal(calls.length, 2, 'total reached => stop without fetching an empty page');

// empty workspace
stub(0);
assert.equal((await fetchAllAttempts(CFG, RANGE)).length, 0);

// a bogus `total` must not spin forever
stub(0, 1000);
(axios as any).get = async (_u: string, o: any) => {
  calls.push(o.params);
  return { status: 200, data: { items: [{ interaction_id: 'x' }], total: 999999 } };
};
rows = await fetchAllAttempts(CFG, RANGE, 1, 5);
assert.equal(calls.length, 5, 'maxPages must cap the loop');

// error on first page throws; error mid-run keeps what we already have
stub(10, 1000, 500);
await assert.rejects(() => fetchAllAttempts(CFG, RANGE), /500/);

(axios as any).get = realGet;
console.log('sarvamCalls pagination: all checks passed');
