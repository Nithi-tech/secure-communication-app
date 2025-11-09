/**
 * Messaging Service
 * Handles end-to-end encrypted messaging using Signal protocol
 * SECURITY: All encryption/decryption happens client-side
 */

import axios, {AxiosInstance} from 'axios';
import {io, Socket} from 'socket.io-client';
import {
  x3dhInitiator,
  x3dhResponder,
  verifySignedPreKey,
} from '@crypto/x3dh';
import {
  initializeSession,
  ratchetEncrypt,
  ratchetDecrypt,
} from '@crypto/doubleRatchet';
import {PreKeyBundle, EncryptedMessage} from '@crypto/types';
import {
  getIdentityKeyPair,
  getSignedPreKey,
  getPreKey,
  deletePreKey,
  storeSession,
  getSession,
} from './keyStorage';
import {base64ToUint8Array, uint8ArrayToBase64} from '@crypto/utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export interface Message {
  id?: string;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio';
  encryptedContent?: string;
  timestamp: number;
  delivered?: boolean;
  read?: boolean;
  attachmentId?: string;
}

export interface ChatMessage extends Message {
  senderName: string;
  senderRank?: string;
  isOwn: boolean;
}

class MessagingService {
  private api: AxiosInstance;
  private socket: Socket | null = null;
  private messageListeners: Array<(message: ChatMessage) => void> = [];
  private receiptListeners: Array<(messageId: string, type: 'delivered' | 'read') => void> = [];

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 30000,
    });
  }

  /**
   * Connect to WebSocket for real-time messaging
   * SECURITY: Authenticated connection with JWT
   */
  async connect(accessToken: string, userId: string): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(API_BASE_URL, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Listen for incoming encrypted messages
    this.socket.on('message', async (data: any) => {
      try {
        const decrypted = await this.decryptIncomingMessage(data);
        this.notifyMessageListeners(decrypted);

        // Send delivery receipt
        await this.sendReceipt(data.id, 'delivered');
      } catch (error) {
        console.error('Failed to process incoming message:', error);
      }
    });

    // Listen for message receipts
    this.socket.on('receipt', (data: {messageId: string; type: 'delivered' | 'read'}) => {
      this.notifyReceiptListeners(data.messageId, data.type);
    });

    // Listen for typing indicators
    this.socket.on('typing', (data: {userId: string; isTyping: boolean}) => {
      // Handle typing indicator
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Send encrypted message to user
   * @param toUserId - Recipient user ID
   * @param content - Plaintext message content
   * @param type - Message type (text, image, file, audio)
   */
  async sendMessage(
    toUserId: string,
    content: string,
    type: Message['type'] = 'text'
  ): Promise<Message> {
    try {
      // Step 1: Check if we have an existing session
      let session = await getSession(toUserId);

      if (!session) {
        // No session exists - need to perform X3DH key agreement
        session = await this.establishSession(toUserId);
      }

      // Step 2: Encrypt message with Double Ratchet
      const {encrypted, newSession} = await ratchetEncrypt(session, content);

      // Step 3: Store updated session
      await storeSession(toUserId, newSession);

      // Step 4: Send encrypted message to server
      const payload = {
        toUserId,
        type,
        encryptedContent: uint8ArrayToBase64(encrypted.ciphertext),
        messageType: encrypted.type,
        registrationId: encrypted.registrationId,
        timestamp: Date.now(),
      };

      const response = await this.api.post('/messages', payload, {
        headers: {
          Authorization: `Bearer ${await this.getAccessToken()}`,
        },
      });

      return {
        id: response.data.messageId,
        fromUserId: response.data.fromUserId,
        toUserId,
        content,
        type,
        timestamp: payload.timestamp,
      };
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Establish new session with user using X3DH
   * SECURITY: Fetches remote pre-key bundle, verifies signature
   */
  private async establishSession(toUserId: string): Promise<any> {
    try {
      // Fetch remote user's pre-key bundle from server
      const response = await this.api.get(`/keys/${toUserId}`, {
        headers: {
          Authorization: `Bearer ${await this.getAccessToken()}`,
        },
      });

      const bundle: PreKeyBundle = {
        identityKey: base64ToUint8Array(response.data.identityKey),
        signedPreKey: base64ToUint8Array(response.data.signedPreKey.publicKey),
        signedPreKeyId: response.data.signedPreKey.keyId,
        signedPreKeySignature: base64ToUint8Array(response.data.signedPreKey.signature),
        preKey: response.data.preKey ? base64ToUint8Array(response.data.preKey.publicKey) : undefined,
        preKeyId: response.data.preKey?.keyId,
        registrationId: response.data.registrationId,
      };

      // Verify signed pre-key
      const isValid = verifySignedPreKey(
        bundle.signedPreKey,
        bundle.signedPreKeySignature,
        bundle.identityKey
      );

      if (!isValid) {
        throw new Error('Invalid signed pre-key signature');
      }

      // Perform X3DH as initiator
      const identityKeyPair = await getIdentityKeyPair();
      if (!identityKeyPair) {
        throw new Error('No identity key pair found');
      }

      const {sharedSecret, ephemeralKey} = await x3dhInitiator(
        identityKeyPair,
        bundle
      );

      // Initialize Double Ratchet session
      const session = await initializeSession(
        sharedSecret,
        bundle.identityKey,
        true // isInitiator
      );

      // Store session
      await storeSession(toUserId, session);

      return session;
    } catch (error) {
      console.error('Failed to establish session:', error);
      throw error;
    }
  }

  /**
   * Decrypt incoming message
   * @param encryptedData - Encrypted message from server
   */
  private async decryptIncomingMessage(encryptedData: any): Promise<ChatMessage> {
    try {
      const fromUserId = encryptedData.fromUserId;

      // Get or establish session
      let session = await getSession(fromUserId);

      if (!session) {
        // First message from this user - establish session as responder
        session = await this.establishSessionAsResponder(encryptedData);
      }

      // Decrypt message
      const encrypted: EncryptedMessage = {
        type: encryptedData.messageType,
        registrationId: encryptedData.registrationId,
        messageVersion: 1,
        ciphertext: base64ToUint8Array(encryptedData.encryptedContent),
      };

      const {plaintext, newSession} = await ratchetDecrypt(session, encrypted);

      // Store updated session
      await storeSession(fromUserId, newSession);

      return {
        id: encryptedData.id,
        fromUserId,
        toUserId: encryptedData.toUserId,
        content: plaintext,
        type: encryptedData.type || 'text',
        timestamp: encryptedData.timestamp,
        senderName: encryptedData.senderName,
        senderRank: encryptedData.senderRank,
        isOwn: false,
        delivered: true,
      };
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw error;
    }
  }

  /**
   * Establish session as responder (receiving first message)
   */
  private async establishSessionAsResponder(encryptedData: any): Promise<any> {
    // Implementation of X3DH responder flow
    // Extract ephemeral key, perform DH exchanges, initialize session
    // This is simplified - full implementation would handle prekey message parsing

    const identityKeyPair = await getIdentityKeyPair();
    const signedPreKey = await getSignedPreKey();

    if (!identityKeyPair || !signedPreKey) {
      throw new Error('Missing local keys');
    }

    // For this demo, we'll use a simplified session initialization
    // In production, parse prekey message and perform full X3DH responder flow

    const remoteIdentityKey = base64ToUint8Array(encryptedData.remoteIdentityKey);
    const remoteEphemeralKey = base64ToUint8Array(encryptedData.ephemeralKey);

    const sharedSecret = await x3dhResponder(
      identityKeyPair,
      signedPreKey,
      null, // oneTimePreKey
      remoteIdentityKey,
      remoteEphemeralKey
    );

    const session = await initializeSession(
      sharedSecret,
      remoteIdentityKey,
      false // isInitiator
    );

    return session;
  }

  /**
   * Fetch pending messages from server
   * Useful for offline message sync
   */
  async fetchPendingMessages(cursor?: string): Promise<ChatMessage[]> {
    try {
      const response = await this.api.get('/messages/pending', {
        params: {cursor},
        headers: {
          Authorization: `Bearer ${await this.getAccessToken()}`,
        },
      });

      const messages: ChatMessage[] = [];

      for (const msg of response.data.messages) {
        try {
          const decrypted = await this.decryptIncomingMessage(msg);
          messages.push(decrypted);

          // Mark as delivered
          await this.sendReceipt(msg.id, 'delivered');
        } catch (error) {
          console.error('Failed to decrypt pending message:', error);
        }
      }

      return messages;
    } catch (error) {
      console.error('Failed to fetch pending messages:', error);
      return [];
    }
  }

  /**
   * Send message receipt (delivered/read)
   */
  async sendReceipt(messageId: string, type: 'delivered' | 'read'): Promise<void> {
    try {
      await this.api.post(
        '/receipts',
        {messageId, type, timestamp: Date.now()},
        {
          headers: {
            Authorization: `Bearer ${await this.getAccessToken()}`,
          },
        }
      );
    } catch (error) {
      console.error('Failed to send receipt:', error);
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.sendReceipt(messageId, 'read');
  }

  /**
   * Subscribe to incoming messages
   */
  onMessage(callback: (message: ChatMessage) => void): () => void {
    this.messageListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.messageListeners.indexOf(callback);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to message receipts
   */
  onReceipt(callback: (messageId: string, type: 'delivered' | 'read') => void): () => void {
    this.receiptListeners.push(callback);

    return () => {
      const index = this.receiptListeners.indexOf(callback);
      if (index > -1) {
        this.receiptListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify message listeners
   */
  private notifyMessageListeners(message: ChatMessage): void {
    this.messageListeners.forEach(listener => listener(message));
  }

  /**
   * Notify receipt listeners
   */
  private notifyReceiptListeners(messageId: string, type: 'delivered' | 'read'): void {
    this.receiptListeners.forEach(listener => listener(messageId, type));
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(toUserId: string, isTyping: boolean): Promise<void> {
    if (this.socket) {
      this.socket.emit('typing', {toUserId, isTyping});
    }
  }

  /**
   * Get access token from storage
   */
  private async getAccessToken(): Promise<string> {
    // This would be implemented to retrieve token from AsyncStorage
    // For now, return empty string
    return '';
  }
}

// Export singleton instance
export default new MessagingService();
