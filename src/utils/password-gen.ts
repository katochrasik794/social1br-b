import crypto from "crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = "!@#";
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

/** MT5 requires mixed case, digit, and symbol; avoid ambiguous chars. */
export function generatePassword(length = 12) {
  const size = Math.max(8, length);
  const chars = [
    UPPER[crypto.randomInt(UPPER.length)],
    LOWER[crypto.randomInt(LOWER.length)],
    DIGITS[crypto.randomInt(DIGITS.length)],
    SPECIAL[crypto.randomInt(SPECIAL.length)],
  ];
  const bytes = crypto.randomBytes(size - chars.length);
  for (let i = 0; i < bytes.length; i++) {
    chars.push(ALL[bytes[i] % ALL.length]);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export async function generateUniqueLogin(exists: (n: number) => Promise<boolean>) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const login = crypto.randomInt(1_000_000, 10_000_000);
    if (!(await exists(login))) return login;
  }
  throw new Error("Could not generate unique MT5 login");
}
