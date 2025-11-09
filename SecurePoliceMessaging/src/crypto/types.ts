/**
 * Signal Protocol Implementation - Key Types
 * Defines interfaces for all cryptographic key types used in Signal protocol
 */

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface IdentityKeyPair extends KeyPair {
  // Long-term identity key pair for device
  // Stored securely in device keychain/keystore
}

export interface SignedPreKey {
  keyId: number;
  keyPair: KeyPair;
  signature: Uint8Array; // Signed by identity key
  timestamp: number;
}

export interface PreKey {
  keyId: number;
  keyPair: KeyPair;
}

export interface SessionState {
  sessionId: string;
  remoteIdentityKey: Uint8Array;
  rootKey: Uint8Array;
  chainKey: Uint8Array;
  sendingChainKey?: Uint8Array;
  receivingChainKey?: Uint8Array;
  messageNumber: number;
  previousCounter: number;
}

export interface PreKeyBundle {
  identityKey: Uint8Array;
  signedPreKey: Uint8Array;
  signedPreKeyId: number;
  signedPreKeySignature: Uint8Array;
  preKey?: Uint8Array;
  preKeyId?: number;
  registrationId: number;
}

export interface MessageKeys {
  cipherKey: Uint8Array;
  macKey: Uint8Array;
  iv: Uint8Array;
}

export interface EncryptedMessage {
  type: 'prekey' | 'message';
  registrationId: number;
  messageVersion: number;
  ciphertext: Uint8Array;
  // For prekey messages
  preKeyId?: number;
  signedPreKeyId?: number;
  baseKey?: Uint8Array;
  identityKey?: Uint8Array;
}
