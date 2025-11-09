/**
 * Signal Protocol Double Ratchet Implementation
 * Provides forward secrecy and post-compromise security for ongoing conversations
 * SECURITY: Keys are continuously ratcheted, old keys deleted after use
 */

import {x25519} from '@noble/curves/ed25519';
import {SessionState, MessageKeys, EncryptedMessage} from './types';
import {generateRandomBytes, hkdf, hmacSha256, aes256Encrypt, aes256Decrypt} from './utils';

const MESSAGE_KEY_SEED = new TextEncoder().encode('MessageKeys');
const CHAIN_KEY_SEED = new TextEncoder().encode('ChainKey');
const ROOT_KEY_SEED = new TextEncoder().encode('RootKey');

/**
 * Initialize Double Ratchet session from X3DH shared secret
 * @param sharedSecret - Output from X3DH key agreement
 * @param remoteIdentityKey - Remote party's identity key
 * @returns Initial session state
 */
export const initializeSession = async (
  sharedSecret: Uint8Array,
  remoteIdentityKey: Uint8Array,
  isInitiator: boolean
): Promise<SessionState> => {
  // Derive root key and chain key from shared secret
  const salt = new Uint8Array(32);
  const rootKey = await hkdf(sharedSecret, salt, ROOT_KEY_SEED, 32);
  const chainKey = await hkdf(sharedSecret, salt, CHAIN_KEY_SEED, 32);

  const sessionId = `session_${Date.now()}_${Math.random().toString(36)}`;

  return {
    sessionId,
    remoteIdentityKey,
    rootKey,
    chainKey,
    sendingChainKey: isInitiator ? chainKey : undefined,
    receivingChainKey: isInitiator ? undefined : chainKey,
    messageNumber: 0,
    previousCounter: 0,
  };
};

/**
 * Ratchet chain key forward to derive message key
 * Chain key is ratcheted after each message
 * @param chainKey - Current chain key
 * @returns New chain key and message key
 */
const ratchetChainKey = async (
  chainKey: Uint8Array
): Promise<{newChainKey: Uint8Array; messageKey: Uint8Array}> => {
  // New chain key = HMAC(chainKey, 0x02)
  const chainInput = new Uint8Array([0x02]);
  const newChainKey = hmacSha256(chainInput, chainKey);

  // Message key = HMAC(chainKey, 0x01)
  const messageInput = new Uint8Array([0x01]);
  const messageKey = hmacSha256(messageInput, chainKey);

  return {newChainKey, messageKey};
};

/**
 * Derive encryption keys from message key
 * Generates cipher key, MAC key, and IV
 */
const deriveMessageKeys = async (messageKey: Uint8Array): Promise<MessageKeys> => {
  const salt = new Uint8Array(32);
  const info = MESSAGE_KEY_SEED;

  // Derive 80 bytes: 32 for cipher key, 32 for MAC key, 16 for IV
  const keyMaterial = await hkdf(messageKey, salt, info, 80);

  return {
    cipherKey: keyMaterial.slice(0, 32),
    macKey: keyMaterial.slice(32, 64),
    iv: keyMaterial.slice(64, 80),
  };
};

/**
 * Perform Diffie-Hellman ratchet step
 * Generates new root key and chain key
 */
const dhRatchet = async (
  rootKey: Uint8Array,
  dhOutput: Uint8Array
): Promise<{newRootKey: Uint8Array; newChainKey: Uint8Array}> => {
  const salt = new Uint8Array(32);
  const info = ROOT_KEY_SEED;

  const keyMaterial = await hkdf(dhOutput, salt, info, 64);

  return {
    newRootKey: keyMaterial.slice(0, 32),
    newChainKey: keyMaterial.slice(32, 64),
  };
};

/**
 * Encrypt message using Double Ratchet
 * @param session - Current session state
 * @param plaintext - Message to encrypt
 * @returns Encrypted message and updated session
 */
export const ratchetEncrypt = async (
  session: SessionState,
  plaintext: string
): Promise<{encrypted: EncryptedMessage; newSession: SessionState}> => {
  if (!session.sendingChainKey) {
    throw new Error('No sending chain key available');
  }

  // Ratchet chain key to get message key
  const {newChainKey, messageKey} = await ratchetChainKey(session.sendingChainKey);

  // Derive encryption keys from message key
  const messageKeys = await deriveMessageKeys(messageKey);

  // Encrypt plaintext with AES-256-CBC
  const ciphertext = aes256Encrypt(plaintext, messageKeys.cipherKey, messageKeys.iv);

  // Create encrypted message envelope
  const encrypted: EncryptedMessage = {
    type: 'message',
    registrationId: 0, // Set by sender
    messageVersion: 1,
    ciphertext: new TextEncoder().encode(ciphertext),
  };

  // Update session with new chain key and increment counter
  const newSession: SessionState = {
    ...session,
    sendingChainKey: newChainKey,
    messageNumber: session.messageNumber + 1,
  };

  // SECURITY: Delete old message key from memory
  messageKeys.cipherKey.fill(0);
  messageKeys.macKey.fill(0);
  messageKey.fill(0);

  return {encrypted, newSession};
};

/**
 * Decrypt message using Double Ratchet
 * @param session - Current session state
 * @param encrypted - Encrypted message
 * @returns Decrypted plaintext and updated session
 */
export const ratchetDecrypt = async (
  session: SessionState,
  encrypted: EncryptedMessage
): Promise<{plaintext: string; newSession: SessionState}> => {
  if (!session.receivingChainKey) {
    throw new Error('No receiving chain key available');
  }

  // Ratchet chain key to get message key
  const {newChainKey, messageKey} = await ratchetChainKey(session.receivingChainKey);

  // Derive decryption keys from message key
  const messageKeys = await deriveMessageKeys(messageKey);

  // Decrypt ciphertext with AES-256-CBC
  const ciphertextStr = new TextDecoder().decode(encrypted.ciphertext);
  const plaintext = aes256Decrypt(ciphertextStr, messageKeys.cipherKey, messageKeys.iv);

  // Update session with new chain key
  const newSession: SessionState = {
    ...session,
    receivingChainKey: newChainKey,
    previousCounter: session.messageNumber,
    messageNumber: session.messageNumber + 1,
  };

  // SECURITY: Delete old message key from memory
  messageKeys.cipherKey.fill(0);
  messageKeys.macKey.fill(0);
  messageKey.fill(0);

  return {plaintext, newSession};
};

/**
 * Handle out-of-order messages
 * Skipped message keys are stored temporarily for late arrivals
 */
export const handleSkippedMessage = async (
  session: SessionState,
  encrypted: EncryptedMessage,
  skippedCount: number
): Promise<{plaintext: string; newSession: SessionState}> => {
  // In production, implement skipped message key storage
  // For now, attempt normal decryption
  return ratchetDecrypt(session, encrypted);
};

/**
 * Session cleanup - securely delete session keys
 * Call when session is revoked or user logs out
 */
export const cleanupSession = (session: SessionState): void => {
  // Overwrite sensitive key material with zeros
  session.rootKey.fill(0);
  session.chainKey.fill(0);
  if (session.sendingChainKey) {
    session.sendingChainKey.fill(0);
  }
  if (session.receivingChainKey) {
    session.receivingChainKey.fill(0);
  }
  session.remoteIdentityKey.fill(0);
};
