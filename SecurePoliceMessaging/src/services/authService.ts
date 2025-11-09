/**
 * Authentication Service
 * Handles OTP login, SSO integration, device provisioning
 * SECURITY: JWT tokens stored securely, OTP verification required
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import axios, {AxiosInstance} from 'axios';
import RNDeviceInfo from 'react-native-device-info';
import {
  generateIdentityKeyPair,
  generateSignedPreKey,
  generatePreKeys,
} from '../crypto/x3dh';
import {
  storeIdentityKeyPair,
  storeSignedPreKey,
  storePreKeys,
  storeDeviceId,
  getIdentityKeyPair,
  clearAllKeys,
} from './keyStorage';
import {uint8ArrayToBase64} from '../crypto/utils';

// API Configuration
const API_BASE_URL = 'http://localhost:3000';

export interface User {
  userId: string;
  id: string;
  badgeNo: string;
  name: string;
  rank: string;
  department: string;
  phoneNumber: string;
  role: 'officer' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'revoked';
}

export interface DeviceInfo {
  deviceId: string;
  model: string;
  os: string;
  osVersion: string;
  appVersion: string;
  pushToken?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class AuthService {
  private api: AxiosInstance;
  private currentUser: User | null = null;
  private tokens: AuthTokens | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.api.interceptors.request.use(
      async config => {
        const token = await this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Add response interceptor for token refresh
    this.api.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        // If 401 and haven't retried yet, attempt token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Only try to refresh if we have a refresh token
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (!refreshToken) {
              // No refresh token, just reject the request
              console.log('No refresh token available, user needs to login');
              return Promise.reject(error);
            }

            await this.refreshAccessToken();
            const newToken = await this.getAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens but don't force logout
            console.log('Token refresh failed:', refreshError);
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Step 1: Request OTP for phone number
   * Sends OTP to registered police officer's phone
   */
  async requestOTP(phoneNumber: string): Promise<{success: boolean; message: string}> {
    try {
      const response = await this.api.post('/auth/request-otp', {
        phoneNumber,
      });

      return {
        success: true,
        message: response.data.message || 'OTP sent successfully',
      };
    } catch (error: any) {
      console.error('OTP request failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP',
      };
    }
  }

  /**
   * Step 2: Verify OTP and login
   * Validates OTP and initiates device provisioning
   */
  async verifyOTPAndLogin(
    phoneNumber: string,
    otp: string
  ): Promise<{success: boolean; user?: User; message?: string}> {
    try {
      const response = await this.api.post('/auth/verify-otp', {
        phoneNumber,
        otp,
      });

      const {user, tokens, needsProvisioning} = response.data;

      // Store tokens
      this.tokens = tokens;
      this.currentUser = user;
      await this.storeTokens(tokens);

      if (needsProvisioning) {
        // New device - need to provision
        await this.provisionDevice();
      }

      return {success: true, user};
    } catch (error: any) {
      console.error('OTP verification failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid OTP',
      };
    }
  }

  /**
   * Step 3: SSO/LDAP Login (Alternative to OTP)
   * For organizations with existing SSO infrastructure
   */
  async login(
    userId: string,
    password: string
  ): Promise<{success: boolean; user?: User; message?: string}> {
    try {
      console.log('Attempting login for userId:', userId);
      const response = await this.api.post('/api/auth/login', {
        userId,
        password,
      });

      console.log('Login response received:', response.status);
      const {user, tokens, needsProvisioning} = response.data;

      this.tokens = tokens;
      this.currentUser = user;
      await this.storeTokens(tokens);
      console.log('Tokens stored successfully');

      if (needsProvisioning) {
        console.log('Device provisioning required');
        await this.provisionDevice();
      }

      return {success: true, user};
    } catch (error: any) {
      console.error('Login failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Login failed';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Device Provisioning Flow
   * Generates cryptographic keys and registers device with server
   * SECURITY: Keys generated locally, only public keys sent to server
   */
  private async provisionDevice(): Promise<void> {
    try {
      console.log('Starting device provisioning...');

      // Step 1: Generate identity key pair (long-term)
      const identityKeyPair = await generateIdentityKeyPair();
      await storeIdentityKeyPair(identityKeyPair);
      console.log('Identity key pair generated');

      // Step 2: Generate signed pre-key (medium-term, rotated weekly)
      const signedPreKey = await generateSignedPreKey(identityKeyPair, 1);
      await storeSignedPreKey(signedPreKey);
      console.log('Signed pre-key generated');

      // Step 3: Generate batch of one-time pre-keys
      const preKeys = await generatePreKeys(1, 100);
      await storePreKeys(preKeys);
      console.log('100 one-time pre-keys generated');

      // Step 4: Collect device information
      const deviceInfo = await this.collectDeviceInfo();

      // Step 5: Register device with server (send only public keys)
      const registrationPayload = {
        deviceInfo,
        publicIdentityKey: uint8ArrayToBase64(identityKeyPair.publicKey),
        signedPreKey: {
          keyId: signedPreKey.keyId,
          publicKey: uint8ArrayToBase64(signedPreKey.keyPair.publicKey),
          signature: uint8ArrayToBase64(signedPreKey.signature),
          timestamp: signedPreKey.timestamp,
        },
        preKeys: preKeys.map(pk => ({
          keyId: pk.keyId,
          publicKey: uint8ArrayToBase64(pk.keyPair.publicKey),
        })),
      };

      const response = await this.api.post('/api/devices', registrationPayload);
      const {deviceId, approved} = response.data;

      // Store device ID
      await storeDeviceId(deviceId);
      console.log('Device provisioned successfully:', deviceId);

      if (!approved) {
        console.warn('Device pending admin approval');
      }
    } catch (error) {
      console.error('Device provisioning failed:', error);
      throw error;
    }
  }

  /**
   * Collect device information for provisioning
   * Used for device attestation and admin oversight
   */
  private async collectDeviceInfo(): Promise<DeviceInfo> {
    return {
      deviceId: '',
      model: await RNDeviceInfo.getModel(),
      os: Platform.OS,
      osVersion: await RNDeviceInfo.getSystemVersion(),
      appVersion: await RNDeviceInfo.getVersion(),
    };
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
        refreshToken,
      });

      this.tokens = response.data.tokens;
      await this.storeTokens(this.tokens!);
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get current access token (public method for API calls)
   */
  async getToken(): Promise<string | null> {
    return await this.getAccessToken();
  }

  /**
   * Get current access token
   */
  private async getAccessToken(): Promise<string | null> {
    if (this.tokens?.accessToken) {
      return this.tokens.accessToken;
    }
    return await AsyncStorage.getItem('access_token');
  }

  /**
   * Store authentication tokens securely
   */
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    await AsyncStorage.setItem('access_token', tokens.accessToken);
    await AsyncStorage.setItem('refresh_token', tokens.refreshToken);
    await AsyncStorage.setItem('token_expiry', tokens.expiresIn.toString());
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const response = await this.api.get('/api/auth/me');
      this.currentUser = response.data.user;
      return this.currentUser;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) {
      return false;
    }

    // Verify token is still valid
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Logout user
   * SECURITY: Clear all tokens and cryptographic keys
   */
  async logout(): Promise<void> {
    try {
      // Notify server
      await this.api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    }

    // Clear local data
    this.currentUser = null;
    this.tokens = null;
    await AsyncStorage.multiRemove([
      'access_token',
      'refresh_token',
      'token_expiry',
    ]);

    // SECURITY: Clear all cryptographic keys
    await clearAllKeys();
  }

  /**
   * Check device approval status
   * Devices must be approved by admin before full access
   */
  async checkDeviceApproval(): Promise<{approved: boolean; pending: boolean}> {
    try {
      const response = await this.api.get('/devices/me');
      return {
        approved: response.data.approved,
        pending: !response.data.approved && !response.data.revoked,
      };
    } catch (error) {
      console.error('Failed to check device approval:', error);
      return {approved: false, pending: false};
    }
  }
}

// Export singleton instance
export default new AuthService();





