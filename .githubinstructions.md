# Secure Police Messaging App - Copilot Instructions

## Project Overview
End-to-end encrypted mobile messaging application for police teams with Signal protocol implementation, secure file sharing, and admin controls.

## Technology Stack
- **Mobile**: React Native with TypeScript
- **Backend**: Node.js with Express
- **Database**: MongoDB (metadata only, no plaintext)
- **Encryption**: Signal Protocol (X3DH, Double Ratchet), AES-256
- **Authentication**: JWT with OTP/2FA, SSO/LDAP support

## Security Requirements
- All message content encrypted client-side only
- Keys stored in device secure storage (Keychain/Keystore)
- Hardware-backed key storage where available
- Device attestation (block rooted/jailbroken devices)
- Sealed-sender push notifications
- Metadata-only server logging
- No plaintext or encryption keys on server

## Project Structure
- `/mobile` - React Native app (Android/iOS)
- `/backend` - Node.js API server
- `/shared` - Shared types and utilities
- `/docs` - Architecture and API documentation

## Coding Guidelines
- Use TypeScript for type safety
- Comment all security-critical operations
- Follow Signal protocol best practices
- Store secrets only on device
- Use existing Signal libraries where possible
- Modular architecture: auth, messaging, attachments, crypto, admin

## API Design
- REST with JSON payloads only
- JWT bearer authentication
- Never transmit plaintext or cipher keys
- Metadata-only storage on server

## Testing Requirements
- Unit tests for crypto operations
- Auth flow testing
- Key exchange validation
- Device provisioning tests
