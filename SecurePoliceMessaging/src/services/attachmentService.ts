/**
 * Attachment Service - Stub Implementation
 */

import axios from 'axios';
import CryptoJS from 'crypto-js';

const API_BASE_URL = 'http://localhost:3000/api';

export interface EncryptedAttachment {
  id: string;
  url: string;
  encryptedKey: string;
  mimeType: string;
  size: number;
  thumbnail?: string;
}

export const pickDocument = async () => {
  console.log('[STUB] Document picker not implemented');
  return null;
};

export const pickImage = async () => {
  console.log('[STUB] Image picker not implemented');
  return null;
};

export const encryptFile = async (fileUri: string) => {
  console.log('[STUB] File encryption not implemented');
  const key = CryptoJS.lib.WordArray.random(32).toString();
  return { encryptedData: '', key };
};

export const decryptFile = async (encryptedData: string, key: string) => {
  console.log('[STUB] File decryption not implemented');
  return '';
};

export const uploadAttachment = async (
  encryptedData: string,
  metadata: { mimeType: string; size: number },
  token: string,
): Promise<EncryptedAttachment> => {
  console.log('[STUB] Attachment upload not implemented');
  return {
    id: 'stub-' + Date.now(),
    url: 'http://localhost:3000/attachments/stub',
    encryptedKey: CryptoJS.lib.WordArray.random(32).toString(),
    mimeType: metadata.mimeType,
    size: metadata.size,
  };
};

export const downloadAttachment = async (
  attachment: EncryptedAttachment,
  decryptionKey: string,
  token: string,
) => {
  console.log('[STUB] Attachment download not implemented');
  return '';
};
