/**
 * Attachment Service
 * Handles secure file encryption, upload, and download
 * SECURITY: Files encrypted client-side before upload, keys never sent to server
 */

import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import axios from 'axios';
import {generateRandomBytes, aes256Encrypt, aes256Decrypt} from '@crypto/utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export interface Attachment {
  id?: string;
  messageId?: string;
  name: string;
  size: number;
  mimeType: string;
  encryptionKey: Uint8Array; // NEVER send to server
  iv: Uint8Array; // NEVER send to server
  localPath?: string;
  remoteUrl?: string;
  checksum: string;
  thumbnail?: string;
}

class AttachmentService {
  /**
   * Pick file from device storage
   */
  async pickFile(): Promise<{uri: string; name: string; size: number; type: string} | null> {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });

      return {
        uri: result[0].uri,
        name: result[0].name || 'file',
        size: result[0].size || 0,
        type: result[0].type || 'application/octet-stream',
      };
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        return null;
      }
      console.error('File picker error:', error);
      throw error;
    }
  }

  /**
   * Pick image from gallery
   */
  async pickImage(): Promise<{uri: string; name: string; size: number; type: string} | null> {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2048,
        maxHeight: 2048,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri || '',
        name: asset.fileName || 'image.jpg',
        size: asset.fileSize || 0,
        type: asset.type || 'image/jpeg',
      };
    } catch (error) {
      console.error('Image picker error:', error);
      throw error;
    }
  }

  /**
   * Take photo with camera
   */
  async takePhoto(): Promise<{uri: string; name: string; size: number; type: string} | null> {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2048,
        maxHeight: 2048,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri || '',
        name: asset.fileName || 'photo.jpg',
        size: asset.fileSize || 0,
        type: asset.type || 'image/jpeg',
      };
    } catch (error) {
      console.error('Camera error:', error);
      throw error;
    }
  }

  /**
   * Encrypt and upload file
   * SECURITY: File encrypted with AES-256, key stored locally only
   */
  async encryptAndUpload(
    fileUri: string,
    fileName: string,
    mimeType: string,
    messageId: string
  ): Promise<Attachment> {
    try {
      // Step 1: Read file from local storage
      const fileData = await RNFS.readFile(fileUri, 'base64');
      const fileBuffer = Buffer.from(fileData, 'base64');

      // Step 2: Generate encryption key and IV
      const encryptionKey = await generateRandomBytes(32); // 256-bit key
      const iv = await generateRandomBytes(16); // 128-bit IV

      // Step 3: Encrypt file content
      const encrypted = aes256Encrypt(fileBuffer.toString('utf-8'), encryptionKey, iv);

      // Step 4: Calculate checksum
      const checksum = await this.calculateChecksum(encrypted);

      // Step 5: Request upload URL from server
      const initResponse = await axios.post(
        `${API_BASE_URL}/api/attachments/init`,
        {
          messageId,
          fileName,
          mimeType,
          size: encrypted.length,
          checksum,
        }
      );

      const {attachmentId, uploadUrl} = initResponse.data;

      // Step 6: Upload encrypted file to storage (S3, etc.)
      await axios.put(uploadUrl, encrypted, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      // Step 7: Return attachment metadata
      return {
        id: attachmentId,
        messageId,
        name: fileName,
        size: fileBuffer.length,
        mimeType,
        encryptionKey, // Stored locally, never sent to server
        iv, // Stored locally, never sent to server
        localPath: fileUri,
        checksum,
      };
    } catch (error) {
      console.error('Failed to encrypt and upload file:', error);
      throw error;
    }
  }

  /**
   * Download and decrypt file
   * SECURITY: File decrypted only after download complete
   */
  async downloadAndDecrypt(
    attachmentId: string,
    encryptionKey: Uint8Array,
    iv: Uint8Array
  ): Promise<string> {
    try {
      // Step 1: Get download URL from server
      const response = await axios.get(`${API_BASE_URL}/api/attachments/${attachmentId}`);
      const {downloadUrl, fileName} = response.data;

      // Step 2: Download encrypted file
      const downloadPath = `${RNFS.TemporaryDirectoryPath}/${attachmentId}_encrypted`;
      const download = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: downloadPath,
      }).promise;

      if (download.statusCode !== 200) {
        throw new Error('Download failed');
      }

      // Step 3: Read encrypted file
      const encryptedData = await RNFS.readFile(downloadPath, 'base64');

      // Step 4: Decrypt file
      const decrypted = aes256Decrypt(encryptedData, encryptionKey, iv);

      // Step 5: Save decrypted file
      const decryptedPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      await RNFS.writeFile(decryptedPath, decrypted, 'utf8');

      // Step 6: Clean up encrypted file
      await RNFS.unlink(downloadPath);

      return decryptedPath;
    } catch (error) {
      console.error('Failed to download and decrypt file:', error);
      throw error;
    }
  }

  /**
   * Generate thumbnail for image/video
   */
  async generateThumbnail(fileUri: string, mimeType: string): Promise<string | null> {
    if (!mimeType.startsWith('image/')) {
      return null;
    }

    try {
      // For images, create a smaller version
      // In production, use image processing library
      return fileUri; // Simplified for demo
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return null;
    }
  }

  /**
   * Calculate file checksum for integrity verification
   */
  private async calculateChecksum(data: string): Promise<string> {
    // In production, use SHA-256 hash
    // For demo, return simple checksum
    return Buffer.from(data).toString('base64').substring(0, 32);
  }

  /**
   * Delete local file
   */
  async deleteLocalFile(filePath: string): Promise<void> {
    try {
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }
}

export default new AttachmentService();
