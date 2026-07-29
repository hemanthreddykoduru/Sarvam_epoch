// Self-check for JWT verification. Generates its own RSA keypair and serves a stub JWKS,
// so it proves the crypto path without needing a real InsForge token.
//   npx tsx src/lib/jwtVerify.test.ts
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { keysFromJwks, verifyAccessToken } from './jwtVerify.js';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'test-key-1';
const jwks = { keys: [{ ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' }] };

// serve the stub JWKS instead of the real one
process.env.INSFORGE_URL = 'https://stub.invalid';
const realFetch = globalThis.fetch;
let fetchCount = 0;
(globalThis as any).fetch = async () => {
  fetchCount++;
  return { ok: true, json: async () => jwks } as any;
};

const sign = (payload: object, key: any = privateKey, kid: string | undefined = KID) =>
  jwt.sign(payload, key, { algorithm: 'RS256', ...(kid ? { keyid: kid } : {}) });

const SUB = '83b6300f-f268-41a7-a94c-b24307a2ea9e';

// --- JWKS parsing ---
const parsed = keysFromJwks(jwks);
assert.equal(parsed.size, 1);
assert.ok(parsed.has(KID));
assert.equal(keysFromJwks({ keys: [] }).size, 0);
assert.equal(keysFromJwks({ keys: [{ kid: 'x', kty: 'nonsense' }] }).size, 0, 'unusable JWK must be skipped, not throw');
assert.equal(keysFromJwks({}).size, 0);

// --- a properly signed token is accepted ---
const good = await verifyAccessToken(sign({ sub: SUB, email: 'a@b.c', exp: Math.floor(Date.now() / 1000) + 600 }));
assert.ok(good, 'a correctly signed token must verify');
assert.equal(good!.sub, SUB);
assert.equal(good!.email, 'a@b.c');

// --- THE bug this exists to stop: an unsigned/forged token ---
const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
const forged = `${b64({ alg: 'RS256', typ: 'JWT', kid: KID })}.${b64({ sub: SUB, exp: Math.floor(Date.now() / 1000) + 600 })}.notarealsignature`;
assert.equal(await verifyAccessToken(forged), null, 'forged signature must be rejected');

// signed by the wrong key
const { privateKey: otherKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
assert.equal(
  await verifyAccessToken(sign({ sub: SUB, exp: Math.floor(Date.now() / 1000) + 600 }, otherKey)),
  null,
  'token signed by an unknown key must be rejected',
);

// alg=none must never be honoured
const none = `${b64({ alg: 'none', typ: 'JWT', kid: KID })}.${b64({ sub: SUB })}.`;
assert.equal(await verifyAccessToken(none), null, 'alg=none must be rejected');

// --- expiry still enforced ---
assert.equal(
  await verifyAccessToken(sign({ sub: SUB, exp: Math.floor(Date.now() / 1000) - 60 })),
  null,
  'expired token must be rejected',
);

// --- malformed / missing pieces ---
assert.equal(await verifyAccessToken('not.a.jwt'), null);
assert.equal(await verifyAccessToken(''), null);
// NB: passing undefined for a defaulted param would fall back to the default, so sign directly
const noKid = jwt.sign({ sub: SUB, exp: Math.floor(Date.now() / 1000) + 600 }, privateKey, { algorithm: 'RS256' });
assert.equal(await verifyAccessToken(noKid), null, 'no kid => cannot pick a key');
assert.equal(await verifyAccessToken(sign({ email: 'a@b.c', exp: Math.floor(Date.now() / 1000) + 600 })), null, 'no sub => not a user token');

// --- unknown kid triggers at most one refetch, and is still rejected ---
const before = fetchCount;
const unknownKid = jwt.sign({ sub: SUB, exp: Math.floor(Date.now() / 1000) + 600 }, privateKey, { algorithm: 'RS256', keyid: 'rotated-away' });
assert.equal(await verifyAccessToken(unknownKid), null);
assert.ok(fetchCount - before <= 1, 'must not hammer the JWKS endpoint on unknown kids');

(globalThis as any).fetch = realFetch;
console.log('jwtVerify: all checks passed');
