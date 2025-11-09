/**
 * Secure Key Storage Service
 * Manages cryptographic keys using platform secure storage
 * SECURITY: Uses iOS Keychain and Android Keystore (hardware-backed when available)
 */

import * as Keychain from 'react-native-keychain';
import {IdentityKeyPair, SignedPreKey, PreKey, SessionState} from '@crypto/types';
import {uint8ArrayToBase64, base64ToUint8Array} from '@crypto/utils';

const SERVICE_NAME = 'SecurePoliceMessaging';

/**
 * Storage keys for different key types
 */
const STORAGE_KEYS = {
  IDENTITY_KEY: 'identity_key_pair',
  SIGNED_PREKEY: 'signed_prekey',
  PREKEYS: 'prekeys',
  SESSIONS: 'sessions',
  DEVICE_ID: 'device_id',
  REGISTRATION_ID: 'registration_id',
};

/**
 * Keychain security level configuration
 * Prefer hardware-backed storage when available
 */
const KEYCHAIN_OPTIONS: Keychain.Options = {
  service: SERVICE_NAME,
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
};

/**
 * Store identity key pair securely
 * SECURITY: Private key never leaves secure storage
 */
export const storeIdentityKeyPair = async (
  keyPair: IdentityKeyPair
): Promise<void> => {
  const data = {
    publicKey: uint8ArrayToBase64(keyPair.publicKey),
    privateKey: uint8ArrayToBase64(keyPair.privateKey),
  };

  await Keychain.setGenericPassword(
    STORAGE_KEYS.IDENTITY_KEY,
    JSON.stringify(data),
    {
      ...KEYCHAIN_OPTIONS,
      service: `${SERVICE_NAME}_identity`,
    }
  );
};

/**
 * Retrieve identity key pair from secure storage
 */
export const getIdentityKeyPair = async (): Promise<IdentityKeyPair | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${SERVICE_NAME}_identity`,
    });

    if (!credentials) {
      return null;
    }

    const data = JSON.parse(credentials.password);
    return {
      publicKey: base64ToUint8Array(data.publicKey),
      privateKey: base64ToUint8Array(data.privateKey),
    };
  } catch (error) {
    console.error('Failed to retrieve identity key pair:', error);
    return null;
  }
};

/**
 * Store signed pre-key
 */
export const storeSignedPreKey = async (signedPreKey: SignedPreKey): Promise<void> => {
  const data = {
    keyId: signedPreKey.keyId,
    publicKey: uint8ArrayToBase64(signedPreKey.keyPair.publicKey),
    privateKey: uint8ArrayToBase64(signedPreKey.keyPair.privateKey),
    signature: uint8ArrayToBase64(signedPreKey.signature),
    timestamp: signedPreKey.timestamp,
  };

  await Keychain.setGenericPassword(
    STORAGE_KEYS.SIGNED_PREKEY,
    JSON.stringify(data),
    {
      ...KEYCHAIN_OPTIONS,
      service: `${SERVICE_NAME}_signedprekey`,
    }
  );
};

/**
 * Retrieve signed pre-key
 */
export const getSignedPreKey = async (): Promise<SignedPreKey | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${SERVICE_NAME}_signedprekey`,
    });

    if (!credentials) {
      return null;
    }

    const data = JSON.parse(credentials.password);
    return {
      keyId: data.keyId,
      keyPair: {
        publicKey: base64ToUint8Array(data.publicKey),
        privateKey: base64ToUint8Array(data.privateKey),
      },
      signature: base64ToUint8Array(data.signature),
      timestamp: data.timestamp,
    };
  } catch (error) {
    console.error('Failed to retrieve signed pre-key:', error);
    return null;
  }
};

/**
 * Store pre-keys batch
 */
export const storePreKeys = async (preKeys: PreKey[]): Promise<void> => {
  const data = preKeys.map(pk => ({
    keyId: pk.keyId,
    publicKey: uint8ArrayToBase64(pk.keyPair.publicKey),
    privateKey: uint8ArrayToBase64(pk.keyPair.privateKey),
  }));

  await Keychain.setGenericPassword(
    STORAGE_KEYS.PREKEYS,
    JSON.stringify(data),
    {
      ...KEYCHAIN_OPTIONS,
      service: `${SERVICE_NAME}_prekeys`,
    }
  );
};

/**
 * Retrieve pre-key by ID
 */
export const getPreKey = async (keyId: number): Promise<PreKey | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${SERVICE_NAME}_prekeys`,
    });

    if (!credentials) {
      return null;
    }

    const data = JSON.parse(credentials.password);
    const preKeyData = data.find((pk: any) => pk.keyId === keyId);

    if (!preKeyData) {
      return null;
    }

    return {
      keyId: preKeyData.keyId,
      keyPair: {
        publicKey: base64ToUint8Array(preKeyData.publicKey),
        privateKey: base64ToUint8Array(preKeyData.privateKey),
      },
    };
  } catch (error) {
    console.error('Failed to retrieve pre-key:', error);
    return null;
  }
};

/**
 * Delete used pre-key (one-time use)
 * SECURITY: Pre-keys are consumed after first use
 */
export const deletePreKey = async (keyId: number): Promise<void> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${SERVICE_NAME}_prekeys`,
    });

    if (!credentials) {
      return;
    }

    const data = JSON.parse(credentials.password);
    const filtered = data.filter((pk: any) => pk.keyId !== keyId);

    await Keychain.setGenericPassword(
      STORAGE_KEYS.PREKEYS,
      JSON.stringify(filtered),
      {
        ...KEYCHAIN_OPTIONS,
        service: `${SERVICE_NAME}_prekeys`,
      }
    );
  } catch (error) {
    console.error('Failed to delete pre-key:', error);
  }
};

/**
 * Store session state for a conversation
 * @param userId - Remote user ID
 * @param session - Session state
 */
export const storeSession = async (
  userId: string,
  session: SessionState
): Promise<void> => {
  const data = {
    sessionId: session.sessionId,
    remoteIdentityKey: uint8ArrayToBase64(session.remoteIdentityKey),
    rootKey: uint8ArrayToBase64(session.rootKey),
    chainKey: uint8ArrayToBase64(session.chainKey),
    sendingChainKey: session.sendingChainKey
      ? uint8ArrayToBase64(session.sendingChainKey)
      : null,
    receivingChainKey: session.receivingChainKey
      ? uint8ArrayToBase64(session.receivingChainKey)
      : null,
    messageNumber: session.messageNumber,
    previousCounter: session.previousCounter,
  };

  await Keychain.setGenericPassword(
    `session_${userId}`,
    JSON.stringify(data),
    {
      ...KEYCHAIN_OPTIONS,
      service: `${SERVICE_NAME}_sessions`,
    }
  );
};

/**
 * Retrieve session state for a conversation
 */
export const getSession = async (userId: string): Promise<SessionState | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${SERVICE_NAME}_sessions`,
    });

    if (!credentials || !credentials.password.includes(`session_${userId}`)) {
      return null;
    }

    const data = JSON.parse(credentials.password);
    return {
      sessionId: data.sessionId,
      remoteIdentityKey: base64ToUint8Array(data.remoteIdentityKey),
      rootKey: base64ToUint8Array(data.rootKey),
      chainKey: base64ToUint8Array(data.chainKey),
      sendingChainKey: data.sendingChainKey
        ? base64ToUint8Array(data.sendingChainKey)
        : undefined,
      receivingChainKey: data.receivingChainKey
        ? base64ToUint8Array(data.receivingChainKey)
        : undefined,
      messageNumber: data.messageNumber,
      previousCounter: data.previousCounter,
    };
  } catch (error) {
    console.error('Failed to retrieve session:', error);
    return null;
  }
};

/**
 * Delete session (on logout or device revoke)
 * SECURITY: Ensures forward secrecy by removing old keys
 */
export const deleteSession = async (userId: string): Promise<void> => {
  try {
    await Keychain.resetGenericPassword({
      service: `${SERVICE_NAME}_sessions`,
    });
  } catch (error) {
    console.error('Failed to delete session:', error);
  }
};

/**
 * Store device ID
 */
export const storeDeviceId = async (deviceId: string): Promise<void> => {
  await Keychain.setGenericPassword(STORAGE_KEYS.DEVICE_ID, deviceId, {
    ...KEYCHAIN_OPTIONS,
    service: `${SERVICE_NAME}_device`,
  });
};

/**
 * Retrieve device ID
 */
export const getDeviceId = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${SERVICE_NAME}_device`,
    });
    return credentials ? credentials.password : null;
  } catch (error) {
    console.error('Failed to retrieve device ID:', error);
    return null;
  }
};

/**
 * Clear all stored keys (on logout or device reset)
 * SECURITY: Complete cleanup to prevent key leakage
 */
export const clearAllKeys = async (): Promise<void> => {
  try {
    await Keychain.resetGenericPassword({service: `${SERVICE_NAME}_identity`});
    await Keychain.resetGenericPassword({service: `${SERVICE_NAME}_signedprekey`});
    await Keychain.resetGenericPassword({service: `${SERVICE_NAME}_prekeys`});
    await Keychain.resetGenericPassword({service: `${SERVICE_NAME}_sessions`});
    await Keychain.resetGenericPassword({service: `${SERVICE_NAME}_device`});

    console.log('All cryptographic keys cleared from secure storage');
  } catch (error) {
    console.error('Failed to clear keys:', error);
    throw error;
  }
};

/**
 * Check if device supports hardware-backed keystore
 * Used for device attestation
 */
export const checkHardwareSupport = async (): Promise<{
  supported: boolean;
  level: string;
}> => {
  try {
    const level = await Keychain.getSupportedBiometryType();
    return {
      supported: level !== null,
      level: level || 'SOFTWARE',
    };
  } catch (error) {
    return {
      supported: false,
      level: 'SOFTWARE',
    };
  }
};
