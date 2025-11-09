/**
 * Signal Protocol X3DH (Extended Triple Diffie-Hellman) Implementation
 * Establishes initial shared secret between two parties
 * SECURITY: Provides forward secrecy and deniability
 */

import {ed25519} from '@noble/curves/ed25519';
import {x25519} from '@noble/curves/ed25519';
import {
  KeyPair,
  IdentityKeyPair,
  SignedPreKey,
  PreKey,
  PreKeyBundle,
} from './types';
import {generateRandomBytes, hkdf, sha256} from './utils';

/**
 * Generate Ed25519 identity key pair
 * Used for long-term device identity
 * SECURITY: Store private key in secure hardware keystore
 */
export const generateIdentityKeyPair = async (): Promise<IdentityKeyPair> => {
  const privateKey = await generateRandomBytes(32);
  const publicKey = ed25519.getPublicKey(privateKey);

  return {
    privateKey,
    publicKey,
  };
};

/**
 * Generate signed pre-key
 * Signed by identity key for authenticity
 * Rotated periodically (e.g., weekly)
 */
export const generateSignedPreKey = async (
  identityKeyPair: IdentityKeyPair,
  keyId: number
): Promise<SignedPreKey> => {
  const privateKey = await generateRandomBytes(32);
  const publicKey = x25519.getPublicKey(privateKey);

  // Sign the public key with identity key
  const signature = ed25519.sign(publicKey, identityKeyPair.privateKey);

  return {
    keyId,
    keyPair: {privateKey, publicKey},
    signature,
    timestamp: Date.now(),
  };
};

/**
 * Generate one-time pre-keys
 * Consumed once per session initialization
 * Generate batch of 100 and upload to server
 */
export const generatePreKeys = async (
  startId: number,
  count: number
): Promise<PreKey[]> => {
  const preKeys: PreKey[] = [];

  for (let i = 0; i < count; i++) {
    const privateKey = await generateRandomBytes(32);
    const publicKey = x25519.getPublicKey(privateKey);

    preKeys.push({
      keyId: startId + i,
      keyPair: {privateKey, publicKey},
    });
  }

  return preKeys;
};

/**
 * X3DH Agreement - Initiator (Alice)
 * Performs 4 Diffie-Hellman exchanges to establish shared secret
 * @param identityKeyPair - Alice's identity key pair
 * @param remotePreKeyBundle - Bob's pre-key bundle from server
 * @returns Shared secret and ephemeral key
 */
export const x3dhInitiator = async (
  identityKeyPair: IdentityKeyPair,
  remotePreKeyBundle: PreKeyBundle
): Promise<{sharedSecret: Uint8Array; ephemeralKey: Uint8Array}> => {
  // Generate ephemeral key pair for this session
  const ephemeralPrivate = await generateRandomBytes(32);
  const ephemeralPublic = x25519.getPublicKey(ephemeralPrivate);

  // Perform 4 DH exchanges:
  // DH1 = DH(IK_A, SPK_B) - Identity to Signed PreKey
  // DH2 = DH(EK_A, IK_B) - Ephemeral to Identity
  // DH3 = DH(EK_A, SPK_B) - Ephemeral to Signed PreKey
  // DH4 = DH(EK_A, OPK_B) - Ephemeral to One-Time PreKey (if available)

  const dh1 = x25519.getSharedSecret(
    identityKeyPair.privateKey.slice(0, 32),
    remotePreKeyBundle.signedPreKey
  );

  const dh2 = x25519.getSharedSecret(
    ephemeralPrivate,
    remotePreKeyBundle.identityKey
  );

  const dh3 = x25519.getSharedSecret(
    ephemeralPrivate,
    remotePreKeyBundle.signedPreKey
  );

  // Concatenate DH outputs
  let dhOutputs = new Uint8Array(dh1.length + dh2.length + dh3.length);
  let offset = 0;
  dhOutputs.set(dh1, offset);
  offset += dh1.length;
  dhOutputs.set(dh2, offset);
  offset += dh2.length;
  dhOutputs.set(dh3, offset);
  offset += dh3.length;

  // If one-time prekey is available, add DH4
  if (remotePreKeyBundle.preKey) {
    const dh4 = x25519.getSharedSecret(ephemeralPrivate, remotePreKeyBundle.preKey);
    const newOutputs = new Uint8Array(dhOutputs.length + dh4.length);
    newOutputs.set(dhOutputs);
    newOutputs.set(dh4, dhOutputs.length);
    dhOutputs = newOutputs;
  }

  // Derive shared secret using HKDF
  const salt = new Uint8Array(32); // All zeros
  const info = new TextEncoder().encode('SecurePoliceMessaging_X3DH');
  const sharedSecret = await hkdf(dhOutputs, salt, info, 32);

  return {
    sharedSecret,
    ephemeralKey: ephemeralPublic,
  };
};

/**
 * X3DH Agreement - Responder (Bob)
 * Receives ephemeral key and reconstructs shared secret
 * @param identityKeyPair - Bob's identity key pair
 * @param signedPreKey - Bob's signed pre-key used
 * @param oneTimePreKey - Bob's one-time pre-key used (optional)
 * @param remoteIdentityKey - Alice's identity key
 * @param remoteEphemeralKey - Alice's ephemeral key
 * @returns Shared secret
 */
export const x3dhResponder = async (
  identityKeyPair: IdentityKeyPair,
  signedPreKey: SignedPreKey,
  oneTimePreKey: PreKey | null,
  remoteIdentityKey: Uint8Array,
  remoteEphemeralKey: Uint8Array
): Promise<Uint8Array> => {
  // Perform same DH exchanges in reverse
  const dh1 = x25519.getSharedSecret(
    signedPreKey.keyPair.privateKey,
    remoteIdentityKey.slice(0, 32)
  );

  const dh2 = x25519.getSharedSecret(
    identityKeyPair.privateKey.slice(0, 32),
    remoteEphemeralKey
  );

  const dh3 = x25519.getSharedSecret(
    signedPreKey.keyPair.privateKey,
    remoteEphemeralKey
  );

  let dhOutputs = new Uint8Array(dh1.length + dh2.length + dh3.length);
  let offset = 0;
  dhOutputs.set(dh1, offset);
  offset += dh1.length;
  dhOutputs.set(dh2, offset);
  offset += dh2.length;
  dhOutputs.set(dh3, offset);

  if (oneTimePreKey) {
    const dh4 = x25519.getSharedSecret(
      oneTimePreKey.keyPair.privateKey,
      remoteEphemeralKey
    );
    const newOutputs = new Uint8Array(dhOutputs.length + dh4.length);
    newOutputs.set(dhOutputs);
    newOutputs.set(dh4, dhOutputs.length);
    dhOutputs = newOutputs;
  }

  const salt = new Uint8Array(32);
  const info = new TextEncoder().encode('SecurePoliceMessaging_X3DH');
  const sharedSecret = await hkdf(dhOutputs, salt, info, 32);

  return sharedSecret;
};

/**
 * Verify signed pre-key signature
 * Ensures pre-key bundle authenticity
 */
export const verifySignedPreKey = (
  publicKey: Uint8Array,
  signature: Uint8Array,
  identityKey: Uint8Array
): boolean => {
  try {
    return ed25519.verify(signature, publicKey, identityKey);
  } catch {
    return false;
  }
};
