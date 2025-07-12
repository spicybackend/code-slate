import { pbkdf2 } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";

/**
 * Edge Runtime compatible password hashing using PBKDF2
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Hash the password with PBKDF2
  const hash = pbkdf2(sha256, password, salt, { c: 100000, dkLen: 32 });

  // Combine salt and hash and encode as base64
  const combined = new Uint8Array(salt.length + hash.length);
  combined.set(salt, 0);
  combined.set(hash, salt.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Edge Runtime compatible password verification
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  try {
    // Decode the stored hash
    const combined = new Uint8Array(
      atob(hashedPassword)
        .split("")
        .map((char) => char.charCodeAt(0)),
    );

    // Extract salt and hash
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);

    // Hash the input password with the same salt
    const inputHash = pbkdf2(sha256, password, salt, { c: 100000, dkLen: 32 });

    // Compare hashes in constant time
    if (inputHash.length !== storedHash.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < inputHash.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: Array access is safe within bounds
      result |= inputHash[i]! ^ storedHash[i]!;
    }

    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Edge Runtime compatible random UUID generation
 */
export function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers/Edge Runtime)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation
  const bytes = crypto.getRandomValues(new Uint8Array(16));

  // Set version (4) and variant bits
  // biome-ignore lint/style/noNonNullAssertion: Array access is safe for fixed-size array
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  // biome-ignore lint/style/noNonNullAssertion: Array access is safe for fixed-size array
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Edge Runtime compatible secure random token generation
 */
export function generateSecureToken(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
