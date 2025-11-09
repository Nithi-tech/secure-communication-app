# Secure Police Messaging App

## 🛡️ Overview

End-to-end encrypted mobile messaging application for police teams with **Signal Protocol** implementation, secure file sharing, device attestation, and admin controls.

### Key Features

✅ **End-to-End Encryption** - Signal Protocol (X3DH + Double Ratchet)  
✅ **Device Provisioning** - Client-side key generation, hardware-backed storage  
✅ **1:1 & Group Messaging** - Encrypted conversations with delivery/read receipts  
✅ **Secure File Sharing** - Client-side file encryption with AES-256  
✅ **Admin Dashboard** - Device approval, audit logs, user management  
✅ **Device Attestation** - Block rooted/jailbroken devices  
✅ **Metadata-Only Server** - No plaintext or encryption keys on server  

---

## 📁 Project Structure

```
secure-communication-system/
├── mobile/                    # React Native mobile app
│   ├── src/
│   │   ├── crypto/           # Signal protocol implementation
│   │   │   ├── types.ts      # Cryptographic type definitions
│   │   │   ├── utils.ts      # AES-256, HMAC, HKDF utilities
│   │   │   ├── x3dh.ts       # X3DH key agreement
│   │   │   └── doubleRatchet.ts # Double Ratchet algorithm
│   │   ├── services/         # Core services
│   │   │   ├── authService.ts     # OTP/SSO authentication
│   │   │   ├── keyStorage.ts      # Secure key storage
│   │   │   ├── messagingService.ts # E2EE messaging
│   │   │   └── attachmentService.ts # Encrypted attachments
│   │   ├── screens/          # UI screens
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── OTPVerificationScreen.tsx
│   │   │   ├── ChatListScreen.tsx
│   │   │   ├── ChatScreen.tsx
│   │   │   ├── GroupChatScreen.tsx
│   │   │   └── AdminDashboard.tsx
│   │   └── App.tsx           # Main app entry point
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                   # Node.js API server
│   ├── src/
│   │   ├── models/           # MongoDB schemas (metadata only)
│   │   │   ├── User.js       # User accounts
│   │   │   ├── Device.js     # Registered devices
│   │   │   ├── Message.js    # Encrypted messages
│   │   │   ├── PreKey.js     # One-time pre-keys
│   │   │   ├── Group.js      # Group chats
│   │   │   └── AuditLog.js   # Tamper-evident logs
│   │   ├── routes/           # API endpoints
│   │   │   ├── auth.js       # Authentication
│   │   │   ├── devices.js    # Device provisioning
│   │   │   ├── messages.js   # Message delivery
│   │   │   ├── keys.js       # Pre-key bundles
│   │   │   ├── attachments.js # File upload/download
│   │   │   ├── groups.js     # Group management
│   │   │   └── admin.js      # Admin operations
│   │   ├── middleware/       # Express middleware
│   │   │   ├── auth.js       # JWT authentication
│   │   │   └── errorHandler.js
│   │   └── server.js         # Express + Socket.io server
│   ├── package.json
│   └── .env.example
│
└── docs/                      # Documentation
    ├── ARCHITECTURE.md        # System design
    ├── API.md                 # API reference
    └── SECURITY.md            # Security implementation details
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **React Native** development environment ([setup guide](https://reactnative.dev/docs/environment-setup))
- **MongoDB** 5.0+ (local or Atlas)
- **Android Studio** (for Android) or **Xcode** (for iOS)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Edit .env with your configuration
# - MongoDB URI
# - JWT secrets
# - Twilio credentials (for OTP)
# - AWS S3 credentials (for file storage)

# Start server
npm run dev
```

Server will run on `http://localhost:3000`

### Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Install iOS pods (Mac only)
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on Android (in new terminal)
npm run android

# OR run on iOS (Mac only)
npm run ios
```

---

## 🔐 Security Architecture

### 1. **Signal Protocol Implementation**

#### X3DH (Extended Triple Diffie-Hellman)
- **Initial key agreement** between two parties
- 4 DH exchanges for forward secrecy and deniability
- Signed pre-keys verified with identity keys

#### Double Ratchet
- **Continuous key derivation** for ongoing conversations
- Forward secrecy: Old keys deleted after use
- Post-compromise security: Recovery from key compromise

### 2. **Key Management**

```
Client-Side Key Storage:
├── Identity Key Pair (long-term, Ed25519)
├── Signed Pre-Key (rotated weekly, X25519)
├── One-Time Pre-Keys (100 keys, consumed once)
└── Session Keys (ephemeral, per conversation)

Storage Location:
- iOS: Keychain (hardware-backed when available)
- Android: Keystore (hardware-backed when available)
```

**SECURITY CRITICAL**: Private keys NEVER leave device, never transmitted to server.

### 3. **Message Flow**

```
Alice → Bob (First Message)
1. Alice fetches Bob's pre-key bundle from server
2. Verify signed pre-key signature
3. Perform X3DH key agreement → shared secret
4. Initialize Double Ratchet session
5. Encrypt message with session keys
6. Upload encrypted message to server
7. Server delivers to Bob (metadata only)
8. Bob decrypts with session keys
```

### 4. **File Encryption**

```
Attachment Upload:
1. Select file on device
2. Generate random 256-bit AES key + IV
3. Encrypt file content with AES-256-CBC
4. Calculate checksum for integrity
5. Upload ciphertext to S3
6. Store encryption key locally (never on server)
7. Send message with attachment reference

Attachment Download:
1. Receive message with attachment ID
2. Retrieve encryption key from local storage
3. Download encrypted file from S3
4. Decrypt with stored key
5. Save plaintext file
```

### 5. **Device Attestation**

- Detect rooted/jailbroken devices
- Verify hardware-backed key storage
- Block compromised devices from registration

### 6. **Admin Controls**

- **Device Approval Workflow**: New devices require admin approval
- **Audit Logging**: All admin actions logged with digital signatures
- **Device Revocation**: Instant remote device disable
- **Retention Policies**: Automated message metadata cleanup

---

## 📱 Mobile App Features

### Authentication
- ✅ SMS OTP verification
- ✅ SSO/LDAP integration support
- ✅ Device provisioning with key generation
- ✅ JWT token management with refresh

### Messaging
- ✅ Real-time 1:1 encrypted chat
- ✅ Group messaging with member management
- ✅ Delivery and read receipts
- ✅ Typing indicators
- ✅ Offline message sync

### Security
- ✅ End-to-end encryption for all messages
- ✅ Client-side key generation and storage
- ✅ Hardware-backed key security
- ✅ Device attestation checks
- ✅ Secure session management

### Attachments
- ✅ Send images, files, audio
- ✅ Client-side encryption
- ✅ Thumbnail generation
- ✅ Progress indicators

---

## 🔧 API Reference

### Authentication Endpoints

```
POST /api/auth/request-otp
POST /api/auth/verify-otp
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/logout
```

### Device Management

```
POST /api/devices              # Register new device
GET  /api/devices/me           # Get device status
POST /api/devices/{id}/revoke  # Admin: Revoke device
```

### Messaging

```
POST /api/messages             # Send encrypted message
GET  /api/messages/pending     # Fetch pending messages
POST /api/receipts             # Send delivery/read receipt
```

### Key Exchange

```
GET /api/keys/{userId}         # Fetch pre-key bundle
POST /api/keys/rotate          # Rotate signed pre-key
```

### Attachments

```
POST /api/attachments/init     # Initialize upload
GET  /api/attachments/{id}     # Get download URL
```

### Groups

```
POST /api/groups               # Create group
GET  /api/groups/{id}          # Get group info
POST /api/groups/{id}/members  # Add/remove members
```

### Admin

```
GET  /api/admin/devices        # List pending devices
POST /api/admin/devices/:id/approve
GET  /api/admin/audit          # View audit logs
POST /api/admin/policy         # Update retention policy
```

See [docs/API.md](docs/API.md) for detailed documentation.

---

## 🧪 Testing

### Run Tests

```bash
# Mobile app tests
cd mobile
npm test

# Backend tests
cd backend
npm test
```

### Test Scenarios

1. **Crypto Operations**: Key generation, X3DH, Double Ratchet
2. **Authentication Flow**: OTP request → verify → login
3. **Device Provisioning**: Key generation → upload → approval
4. **Message Encryption**: Encrypt → transmit → decrypt
5. **Session Management**: Token refresh, logout

---

## 📊 Database Schema

### Users Collection
```javascript
{
  badgeNo: String,
  phoneNumber: String,
  name: String,
  rank: String,
  role: "officer" | "admin" | "super_admin",
  status: "active" | "suspended" | "revoked"
}
```

### Devices Collection (Public Keys Only)
```javascript
{
  userId: ObjectId,
  deviceId: String,
  publicIdentityKey: String,    // Base64 encoded
  publicSignedPreKey: String,    // Base64 encoded
  approved: Boolean,
  revoked: Boolean
}
```

### Messages Collection (Encrypted Ciphertext Only)
```javascript
{
  fromUserId: ObjectId,
  toUserId: ObjectId,
  encryptedContent: String,      // Server cannot decrypt
  delivered: Boolean,
  readAt: Date
}
```

**IMPORTANT**: Server stores only metadata. No plaintext or decryption keys.

---

## 🎯 Hackathon Showcase

### Demo Script

1. **Show Security Features** (2 min)
   - Explain Signal Protocol
   - Show device key generation
   - Demonstrate hardware-backed storage

2. **Live Demo** (3 min)
   - Login with OTP
   - Device provisioning workflow
   - Send encrypted message
   - Show admin dashboard

3. **Technical Deep Dive** (2 min)
   - Code walkthrough: X3DH implementation
   - Explain Double Ratchet
   - Show audit logging

### Key Talking Points

✅ **"Zero Knowledge Server"** - Server cannot read any messages  
✅ **"Forward Secrecy"** - Past messages safe even if keys compromised  
✅ **"Hardware Security"** - Keys protected in device secure element  
✅ **"Compliance Ready"** - Audit logs, admin controls, device attestation  
✅ **"Production Grade"** - Signal protocol, industry best practices  

---

## 🔒 Security Best Practices

### Client-Side
- ✅ Generate all keys locally
- ✅ Use hardware-backed storage
- ✅ Validate signed pre-keys
- ✅ Delete old message keys
- ✅ Implement session cleanup on logout

### Server-Side
- ✅ Never store plaintext
- ✅ Never receive encryption keys
- ✅ Use JWT with short expiry
- ✅ Rate limit all endpoints
- ✅ Log admin actions with signatures

### Deployment
- ✅ Use HTTPS only
- ✅ Certificate pinning
- ✅ Environment-based secrets
- ✅ Regular security audits
- ✅ Automated vulnerability scanning

---

## 📝 TODO / Future Enhancements

- [ ] Voice/Video calls with WebRTC
- [ ] Message expiration (disappearing messages)
- [ ] Sealed-sender metadata protection
- [ ] Multi-device sync
- [ ] Backup and restore (encrypted)
- [ ] Panic button for emergency wipe
- [ ] Advanced admin analytics
- [ ] Integration with incident reporting

---

## 📄 License

This project is for educational/hackathon purposes. Ensure compliance with local laws regarding encryption and law enforcement tools.

---

## 👥 Team

Built for secure communication in law enforcement. Contact for demo or questions.

---

## 🆘 Troubleshooting

### Common Issues

**OTP not received**: Check Twilio configuration in `.env`

**Keys not persisting**: Verify Keychain/Keystore permissions

**Messages not delivering**: Check Socket.io connection, ensure server running

**Build errors**: Run `npm install`, clear Metro cache: `npm start -- --reset-cache`

---

## 📚 References

- [Signal Protocol Specification](https://signal.org/docs/)
- [React Native Security Best Practices](https://reactnative.dev/docs/security)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)

---

**Built with ❤️ for secure police communication**
