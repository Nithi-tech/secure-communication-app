/**
 * Cryptographic Utility Functions
 * Provides AES-256, HMAC, key derivation, and random number generation
 * SECURITY: All operations happen client-side only
 */

import CryptoJS from 'crypto-js';
import 'react-native-get-random-values';

/**
 * Generate cryptographically secure random bytes
 * @param length - Number of bytes to generate
 * @returns Uint8Array - Random bytes
 */
export const generateRandomBytes = (length: number): Uint8Array => {
  const array = new Uint8Array(length);
  // @ts-ignore - crypto.getRandomValues is available via react-native-get-random-values polyfill
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // @ts-ignore
    crypto.getRandomValues(array);
  } else {
    // Fallback for testing
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return array;
};

/**
 * AES-256-CBC Encryption
 * @param plaintext - Data to encrypt
 * @param key - 256-bit encryption key
 * @param iv - Initialization vector
 * @returns Encrypted ciphertext as Base64
 */
export const aes256Encrypt = (
  plaintext: string,
  key: Uint8Array,
  iv: Uint8Array
): string => {
  // Convert Uint8Array to WordArray for CryptoJS
  const keyWords = CryptoJS.lib.WordArray.create(key as any);
  const ivWords = CryptoJS.lib.WordArray.create(iv as any);

  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWords, {
    iv: ivWords,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return encrypted.toString();
};

/**
 * AES-256-CBC Decryption
 * @param ciphertext - Base64 encoded ciphertext
 * @param key - 256-bit decryption key
 * @param iv - Initialization vector
 * @returns Decrypted plaintext
 */
export const aes256Decrypt = (
  ciphertext: string,
  key: Uint8Array,
  iv: Uint8Array
): string => {
  const keyWords = CryptoJS.lib.WordArray.create(key as any);
  const ivWords = CryptoJS.lib.WordArray.create(iv as any);

  const decrypted = CryptoJS.AES.decrypt(ciphertext, keyWords, {
    iv: ivWords,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
};

/**
 * HMAC-SHA256 Message Authentication Code
 * @param message - Message to authenticate
 * @param key - HMAC key
 * @returns HMAC digest
 */
export const hmacSha256 = (message: Uint8Array, key: Uint8Array): Uint8Array => {
  const messageWords = CryptoJS.lib.WordArray.create(message as any);
  const keyWords = CryptoJS.lib.WordArray.create(key as any);

  const hmac = CryptoJS.HmacSHA256(messageWords, keyWords);
  return new Uint8Array(hmac.words.length * 4);
};

/**
 * HKDF (HMAC-based Key Derivation Function)
 * Used for deriving session keys in Signal protocol
 * @param inputKeyMaterial - Input key material
 * @param salt - Optional salt
 * @param info - Context information
 * @param length - Output key length in bytes
 * @returns Derived key
 */
export const hkdf = async (
  inputKeyMaterial: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> => {
  // Extract step
  const prk = hmacSha256(inputKeyMaterial, salt);

  // Expand step
  const output = new Uint8Array(length);
  let t = new Uint8Array(0);
  let offset = 0;
  let counter = 1;

  while (offset < length) {
    const data = new Uint8Array(t.length + info.length + 1);
    data.set(t, 0);
    data.set(info, t.length);
    data[data.length - 1] = counter;

    t = hmacSha256(data, prk);

    const remaining = length - offset;
    const toCopy = Math.min(t.length, remaining);
    output.set(t.slice(0, toCopy), offset);

    offset += toCopy;
    counter++;
  }

  return output;
};

/**
 * SHA-256 Hash Function
 * @param data - Data to hash
 * @returns Hash digest
 */
export const sha256 = (data: Uint8Array): Uint8Array => {
  const dataWords = CryptoJS.lib.WordArray.create(data as any);
  const hash = CryptoJS.SHA256(dataWords);

  const result = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    const word = hash.words[i];
    result[i * 4] = (word >>> 24) & 0xff;
    result[i * 4 + 1] = (word >>> 16) & 0xff;
    result[i * 4 + 2] = (word >>> 8) & 0xff;
    result[i * 4 + 3] = word & 0xff;
  }

  return result;
};

/**
 * Constant-time comparison for preventing timing attacks
 * @param a - First buffer
 * @param b - Second buffer
 * @returns true if equal
 */
export const constantTimeCompare = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
};

/**
 * Convert Uint8Array to Base64
 */
export const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  const wordArray = CryptoJS.lib.WordArray.create(bytes as any);
  return CryptoJS.enc.Base64.stringify(wordArray);
};

/**
 * Convert Base64 to Uint8Array
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const wordArray = CryptoJS.enc.Base64.parse(base64);
  const bytes = new Uint8Array(wordArray.words.length * 4);

  for (let i = 0; i < wordArray.words.length; i++) {
    const word = wordArray.words[i];
    bytes[i * 4] = (word >>> 24) & 0xff;
    bytes[i * 4 + 1] = (word >>> 16) & 0xff;
    bytes[i * 4 + 2] = (word >>> 8) & 0xff;
    bytes[i * 4 + 3] = word & 0xff;
  }

  return bytes.slice(0, wordArray.sigBytes);
};
