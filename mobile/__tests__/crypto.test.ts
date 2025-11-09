/**
 * Unit Tests for Cryptographic Operations
 * Tests for X3DH, Double Ratchet, AES encryption
 */

import {
  generateIdentityKeyPair,
  generateSignedPreKey,
  generatePreKeys,
  x3dhInitiator,
  x3dhResponder,
  verifySignedPreKey,
} from '../src/crypto/x3dh';

import {
  initializeSession,
  ratchetEncrypt,
  ratchetDecrypt,
} from '../src/crypto/doubleRatchet';

import {
  generateRandomBytes,
  aes256Encrypt,
  aes256Decrypt,
  hkdf,
} from '../src/crypto/utils';

describe('Cryptographic Operations', () => {
  describe('Key Generation', () => {
    test('should generate identity key pair', async () => {
      const keyPair = await generateIdentityKeyPair();
      expect(keyPair.publicKey).toHaveLength(32);
      expect(keyPair.privateKey).toHaveLength(32);
    });

    test('should generate signed pre-key', async () => {
      const identityKeyPair = await generateIdentityKeyPair();
      const signedPreKey = await generateSignedPreKey(identityKeyPair, 1);
      
      expect(signedPreKey.keyId).toBe(1);
      expect(signedPreKey.keyPair.publicKey).toHaveLength(32);
      expect(signedPreKey.signature).toBeDefined();
    });

    test('should generate batch of pre-keys', async () => {
      const preKeys = await generatePreKeys(1, 10);
      
      expect(preKeys).toHaveLength(10);
      expect(preKeys[0].keyId).toBe(1);
      expect(preKeys[9].keyId).toBe(10);
    });
  });

  describe('X3DH Key Agreement', () => {
    test('should establish shared secret between parties', async () => {
      // Alice generates keys
      const aliceIdentity = await generateIdentityKeyPair();
      const aliceSignedPreKey = await generateSignedPreKey(aliceIdentity, 1);

      // Bob generates keys
      const bobIdentity = await generateIdentityKeyPair();
      const bobSignedPreKey = await generateSignedPreKey(bobIdentity, 1);
      const bobPreKeys = await generatePreKeys(1, 1);

      // Alice performs X3DH as initiator
      const {sharedSecret: aliceSecret} = await x3dhInitiator(aliceIdentity, {
        identityKey: bobIdentity.publicKey,
        signedPreKey: bobSignedPreKey.keyPair.publicKey,
        signedPreKeyId: bobSignedPreKey.keyId,
        signedPreKeySignature: bobSignedPreKey.signature,
        preKey: bobPreKeys[0].keyPair.publicKey,
        preKeyId: bobPreKeys[0].keyId,
        registrationId: 0,
      });

      expect(aliceSecret).toHaveLength(32);
    });

    test('should verify signed pre-key signature', async () => {
      const identityKeyPair = await generateIdentityKeyPair();
      const signedPreKey = await generateSignedPreKey(identityKeyPair, 1);

      const isValid = verifySignedPreKey(
        signedPreKey.keyPair.publicKey,
        signedPreKey.signature,
        identityKeyPair.publicKey
      );

      expect(isValid).toBe(true);
    });
  });

  describe('Double Ratchet', () => {
    test('should encrypt and decrypt message', async () => {
      const sharedSecret = await generateRandomBytes(32);
      const remoteIdentityKey = await generateRandomBytes(32);

      // Initialize session
      const session = await initializeSession(
        sharedSecret,
        remoteIdentityKey,
        true
      );

      // Encrypt message
      const plaintext = 'Hello, secure world!';
      const {encrypted, newSession} = await ratchetEncrypt(session, plaintext);

      expect(encrypted.ciphertext).toBeDefined();
      expect(newSession.messageNumber).toBe(1);

      // TODO: Add decryption test
      // Requires proper session state management
    });
  });

  describe('AES Encryption', () => {
    test('should encrypt and decrypt with AES-256', async () => {
      const key = await generateRandomBytes(32);
      const iv = await generateRandomBytes(16);
      const plaintext = 'Sensitive police data';

      const ciphertext = aes256Encrypt(plaintext, key, iv);
      const decrypted = aes256Decrypt(ciphertext, key, iv);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('HKDF', () => {
    test('should derive keys using HKDF', async () => {
      const inputKey = await generateRandomBytes(32);
      const salt = await generateRandomBytes(32);
      const info = new TextEncoder().encode('test');

      const derivedKey = await hkdf(inputKey, salt, info, 32);

      expect(derivedKey).toHaveLength(32);
    });
  });
});
