/**
 * AES-256-GCM Encryption Utility
 * Server-side message encryption for secure storage
 * 
 * SECURITY NOTES:
 * - Uses AES-256-GCM (authenticated encryption)
 * - Random IV per message (12 bytes for GCM)
 * - Authentication tag prevents tampering
 * - Key must be 32 bytes (64 hex chars)
 * 
 * PRODUCTION UPGRADE PATH:
 * - Implement envelope encryption with KMS
 * - Per-conversation keys encrypted with master key
 * - Key rotation strategy
 */

const crypto = require('crypto');

// Load encryption key from environment
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
}

/**
 * Encrypt plaintext message using AES-256-GCM
 * @param {string} plainText - Message to encrypt
 * @returns {object} - { ciphertext, iv, authTag } all base64 encoded
 */
function encrypt(plainText) {
  try {
    // Generate random 12-byte IV (recommended for GCM)
    const iv = crypto.randomBytes(12);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    
    // Encrypt
    const ciphertext = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final()
    ]);
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * @param {object} encrypted - { ciphertext, iv, authTag } all base64 encoded
 * @returns {string} - Decrypted plaintext
 */
function decrypt({ ciphertext, iv, authTag }) {
  try {
    // Create decipher
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      ENCRYPTION_KEY,
      Buffer.from(iv, 'base64')
    );
    
    // Set authentication tag
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    
    // Decrypt
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final()
    ]);
    
    return plaintext.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Hash data using SHA-256 (for refresh tokens)
 * @param {string} data - Data to hash
 * @returns {string} - Hex hash
 */
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate random token
 * @param {number} bytes - Number of random bytes (default 32)
 * @returns {string} - Hex token
 */
function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
  encrypt,
  decrypt,
  hash,
  generateToken
};
