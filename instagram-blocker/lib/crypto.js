/** Password hashing helpers (Web Crypto PBKDF2). No plaintext storage. */

const ITERATIONS = 210_000;
const KEY_BITS = 256;

/**
 * @param {number} byteLength
 * @returns {Uint8Array}
 */
export function randomBytes(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * @param {string} value
 * @returns {Uint8Array}
 */
export function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * @param {string} password
 * @param {Uint8Array} salt
 * @returns {Promise<Uint8Array>}
 */
export async function hashPassword(password, salt) {
  const encoded = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoded,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/**
 * @param {string} password
 * @param {string} saltBase64
 * @param {string} expectedHashBase64
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, saltBase64, expectedHashBase64) {
  const salt = fromBase64(saltBase64);
  const actual = await hashPassword(password, salt);
  const expected = fromBase64(expectedHashBase64);
  if (actual.length !== expected.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}
