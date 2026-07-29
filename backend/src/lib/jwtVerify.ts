import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

/**
 * Verifies InsForge-issued JWTs against the published JWKS.
 *
 * Previously the app only base64-decoded the payload and checked `exp`, so anyone could forge a
 * token for any `sub` and act as that user — which defeats every ownership check in the API.
 *
 * InsForge signs with RS256 and publishes its public keys at /.well-known/jwks.json, so
 * verification is a local signature check. No per-request round-trip to InsForge.
 */

const JWKS_PATH = '/.well-known/jwks.json';
const REFRESH_COOLDOWN_MS = 60_000;

let keyCache = new Map<string, crypto.KeyObject>();
let lastFetchedAt = 0;

function jwksUrl(): string {
  const base = (process.env.INSFORGE_URL || '').replace(/\/+$/, '');
  return `${base}${JWKS_PATH}`;
}

/** Exported for the self-check: build the kid->key map from a JWKS document. */
export function keysFromJwks(jwks: any): Map<string, crypto.KeyObject> {
  const map = new Map<string, crypto.KeyObject>();
  for (const jwk of jwks?.keys || []) {
    if (!jwk.kid) continue;
    try {
      map.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: 'jwk' }));
    } catch (e: any) {
      logger.warn('Skipping unusable JWK', { kid: jwk.kid, message: e.message });
    }
  }
  return map;
}

async function refreshKeys(force = false): Promise<void> {
  if (!force && Date.now() - lastFetchedAt < REFRESH_COOLDOWN_MS) return;
  lastFetchedAt = Date.now();
  const res = await fetch(jwksUrl());
  if (!res.ok) throw new Error(`JWKS fetch failed (${res.status})`);
  const keys = keysFromJwks(await res.json());
  if (keys.size === 0) throw new Error('JWKS contained no usable keys');
  keyCache = keys;
}

async function keyForKid(kid: string): Promise<crypto.KeyObject | undefined> {
  if (keyCache.has(kid)) return keyCache.get(kid);
  // unknown kid: keys may have rotated, so refetch once (rate-limited)
  await refreshKeys();
  return keyCache.get(kid);
}

export interface VerifiedToken {
  sub: string;
  email?: string;
}

/**
 * Returns the verified claims, or null if the token is missing, malformed, expired, or its
 * signature doesn't check out. Fails closed: any error means "not authenticated".
 */
export async function verifyAccessToken(token: string): Promise<VerifiedToken | null> {
  try {
    const decoded: any = jwt.decode(token, { complete: true });
    const kid = decoded?.header?.kid;
    if (!kid) return null;

    const key = await keyForKid(kid);
    if (!key) return null;

    const payload: any = jwt.verify(token, key, { algorithms: ['RS256'] });
    if (!payload?.sub) return null;
    return { sub: String(payload.sub), email: payload.email };
  } catch (error: any) {
    logger.warn('Rejected token', { reason: error?.message });
    return null;
  }
}
