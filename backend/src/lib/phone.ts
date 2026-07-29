/**
 * Phone validation for the outbound-call path. This guards a money/abuse boundary: every accepted
 * number becomes a real billable phone call, so be strict and fail closed.
 */

/** Normalise to E.164-ish digits with a leading +. Returns null if it can't be trusted. */
export function toE164(input: string, defaultCountryCode = '91'): string | null {
  if (!input) return null;
  const raw = String(input).trim();

  // keep a leading + but drop every other non-digit (spaces, dashes, brackets)
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  let normalized: string;
  if (hasPlus) {
    normalized = digits;
  } else if (digits.length === 10) {
    normalized = defaultCountryCode + digits;      // bare local number
  } else if (digits.startsWith('00')) {
    normalized = digits.slice(2);                  // 00 international prefix
  } else {
    normalized = digits;
  }

  // E.164 allows up to 15 digits; require enough to be a real subscriber number
  if (normalized.length < 10 || normalized.length > 15) return null;
  return `+${normalized}`;
}

/**
 * When SARVAM_ALLOWED_NUMBERS is set, only those numbers may be dialled — the guard against a
 * leaked session being used to dial arbitrary numbers on your account. Unset means no restriction.
 */
export function isAllowedNumber(e164: string, allowList = process.env.SARVAM_ALLOWED_NUMBERS): boolean {
  if (!allowList || !allowList.trim()) return true;
  const allowed = allowList
    .split(',')
    .map(n => toE164(n.trim()))
    .filter(Boolean) as string[];
  return allowed.length === 0 ? true : allowed.includes(e164);
}
