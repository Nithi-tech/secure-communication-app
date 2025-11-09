# Architecture Documentation

## System Overview

The Secure Police Messaging App is an end-to-end encrypted communication platform built with Signal Protocol, designed for law enforcement with emphasis on security, privacy, and administrative oversight.

## Core Components

### 1. Mobile Application (React Native)

**Technology Stack:**
- React Native 0.73
- TypeScript
- React Navigation
- Socket.io Client
- React Native Keychain (hardware-backed storage)

**Key Modules:**

#### Crypto Module (`/mobile/src/crypto/`)
- **X3DH (Extended Triple Diffie-Hellman)**: Initial key agreement
- **Double Ratchet**: Continuous key derivation for conversations
- **AES-256**: Symmetric encryption for files
- **Ed25519**: Digital signatures
- **X25519**: Elliptic curve Diffie-Hellman

#### Services Layer (`/mobile/src/services/`)
- **Auth Service**: OTP/SSO authentication, device provisioning
- **Messaging Service**: E2EE message send/receive with WebSocket
- **Key Storage**: Secure key management with Keychain/Keystore
- **Attachment Service**: Client-side file encryption

#### UI Layer (`/mobile/src/screens/`)
- Login with OTP/SSO
- Device approval workflow
- Contact list with search
- 1:1 encrypted chat
- Group messaging
- Admin dashboard

### 2. Backend API (Node.js + Express)

**Technology Stack:**
- Node.js 18+
- Express.js
- MongoDB (metadata storage only)
- Socket.io (real-time)
- JWT authentication
- Helmet (security headers)

**API Endpoints:**

```
Authentication:
  POST   /api/auth/request-otp
  POST   /api/auth/verify-otp
  POST   /api/auth/refresh
  GET    /api/auth/me
  POST   /api/auth/logout

Device Management:
  POST   /api/devices
  GET    /api/devices/me
  POST   /api/devices/:id/revoke

Messaging:
  POST   /api/messages
  GET    /api/messages/pending
  POST   /api/receipts

Key Exchange:
  GET    /api/keys/:userId
  POST   /api/keys/rotate

Attachments:
  POST   /api/attachments/init
  GET    /api/attachments/:id

Groups:
  POST   /api/groups
  GET    /api/groups/:id
  POST   /api/groups/:id/members

Admin:
  GET    /api/admin/devices
  POST   /api/admin/devices/:id/approve
  GET    /api/admin/audit
  POST   /api/admin/policy
```

### 3. Database (MongoDB)

**Collections:**

```javascript
users {
  badgeNo, phoneNumber, name, rank,
  department, role, status, registrationId
}

devices {
  userId, deviceId, model, os,
  publicIdentityKey,        // Base64 encoded public key
  publicSignedPreKey,       // Base64 encoded public key
  approved, revoked
}

messages {
  fromUserId, toUserId, groupId,
  encryptedContent,         // Server cannot decrypt
  messageType, delivered, readAt
}

prekeys {
  userId, deviceId, keyId,
  publicKey,                // Base64 encoded
  consumed, consumedAt
}

groups {
  name, createdBy,
  members: [{userId, role}]
}

audit_logs {
  actorUserId, action, targetUserId,
  details, timestamp, signature
}
```

**CRITICAL**: No plaintext message content or private keys stored on server.

## Security Architecture

### Signal Protocol Implementation

#### Phase 1: X3DH Key Agreement

```
Alice wants to send first message to Bob:

1. Alice fetches Bob's pre-key bundle:
   - Identity Key (long-term, Ed25519)
   - Signed Pre-Key (medium-term, X25519, rotated weekly)
   - One-Time Pre-Key (ephemeral, consumed once)

2. Alice verifies Signed Pre-Key signature

3. Alice performs 4 DH exchanges:
   DH1 = DH(IK_A, SPK_B)    # Identity to Signed PreKey
   DH2 = DH(EK_A, IK_B)     # Ephemeral to Identity
   DH3 = DH(EK_A, SPK_B)    # Ephemeral to Signed PreKey
   DH4 = DH(EK_A, OPK_B)    # Ephemeral to One-Time PreKey

4. Derive shared secret using HKDF:
   SK = HKDF(DH1 || DH2 || DH3 || DH4)

5. Initialize Double Ratchet with SK
```

#### Phase 2: Double Ratchet (Ongoing Conversation)

```
Message Encryption:
1. Ratchet chain key:
   Chain_Key_New = HMAC(Chain_Key, 0x02)
   Message_Key = HMAC(Chain_Key, 0x01)

2. Derive encryption keys from Message_Key:
   Cipher_Key = HKDF(Message_Key, "cipher")[0:32]
   MAC_Key = HKDF(Message_Key, "mac")[32:64]
   IV = HKDF(Message_Key, "iv")[64:80]

3. Encrypt message:
   Ciphertext = AES-256-CBC(Plaintext, Cipher_Key, IV)

4. Send: {Ciphertext, Message_Number}

5. Delete Message_Key (forward secrecy)
```

### Key Storage

**iOS (Keychain):**
```
Service: SecurePoliceMessaging_identity
Item: Identity Key Pair
Access: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
Protection: Hardware-backed when available
```

**Android (Keystore):**
```
Alias: SecurePoliceMessaging_identity
Algorithm: RSA
Key Size: 2048 bits
User Authentication: Biometric or PIN required
Hardware Backed: Yes (on supported devices)
```

### Device Attestation

**Checks:**
1. Root/Jailbreak detection
2. Debugger detection
3. SSL pinning validation
4. Hardware keystore availability
5. SafetyNet/DeviceCheck API

**Implementation:**
```javascript
// Block compromised devices
if (isRooted() || isJailbroken()) {
  throw new Error('Device security compromised');
}

// Verify hardware key storage
const hwSupport = await checkHardwareSupport();
if (!hwSupport.supported) {
  // Warn user or fallback to software storage
}
```

### File Encryption

**Upload Flow:**
```
1. User selects file
2. Generate random 256-bit AES key + 128-bit IV
3. Encrypt file: AES-256-CBC(file, key, iv)
4. Calculate SHA-256 checksum
5. Request upload URL from server
6. Upload ciphertext to S3
7. Store key + IV locally (never on server)
8. Send message with attachment reference
```

**Download Flow:**
```
1. Receive message with attachment ID
2. Retrieve key + IV from local storage
3. Get download URL from server
4. Download ciphertext from S3
5. Decrypt: AES-256-CBC-DECRYPT(ciphertext, key, iv)
6. Verify checksum
7. Save plaintext file to device
```

## Data Flow Diagrams

### Authentication Flow
```
User               Mobile App          Backend API         Database
 |                     |                    |                  |
 |--Phone Number------>|                    |                  |
 |                     |--Request OTP------>|                  |
 |                     |                    |--Generate OTP--->|
 |                     |                    |<--Store OTP------|
 |                     |<--OTP Sent---------|                  |
 |<--Enter OTP---------|                    |                  |
 |                     |--Verify OTP------->|                  |
 |                     |                    |--Check OTP------>|
 |                     |                    |<--Valid----------|
 |                     |<--JWT Tokens-------|                  |
 |                     |                    |                  |
 |                [Generate Keys]           |                  |
 |                     |                    |                  |
 |                     |--Register Device-->|                  |
 |                     |  (Public Keys)     |--Store Device--->|
 |                     |<--Device ID--------|                  |
```

### Message Send Flow
```
Alice              Alice's App         Backend             Bob's App           Bob
 |                     |                  |                   |                |
 |--Type Message------>|                  |                   |                |
 |                [Fetch Bob's Keys]      |                   |                |
 |                     |--Get Keys------->|                   |                |
 |                     |<--PreKey Bundle--|                   |                |
 |                [X3DH Key Agreement]    |                   |                |
 |                [Double Ratchet Encrypt]|                   |                |
 |                     |--Encrypted Msg-->|                   |                |
 |                     |                  |--Push Notify----->|                |
 |                     |                  |--Deliver Msg----->|                |
 |                     |                  |                [Decrypt]           |
 |                     |                  |                   |--Display----->|
 |                     |<--Delivered------|<--Receipt---------|                |
```

## Deployment Architecture

### Production Setup

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │    (AWS ALB)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  API Servers    │
                    │  (EC2 / ECS)    │
                    │  + Socket.io    │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐
    │   MongoDB    │  │   Redis   │  │   AWS S3    │
    │   (Atlas)    │  │  (Cache)  │  │ (File Stor) │
    └──────────────┘  └───────────┘  └─────────────┘
```

### Scaling Considerations

**Horizontal Scaling:**
- Stateless API servers behind load balancer
- Socket.io with Redis adapter for multi-server
- MongoDB replica set for high availability

**Performance:**
- Redis cache for pre-key bundles
- CDN for static assets
- Database indexes on frequently queried fields

**Security:**
- WAF (Web Application Firewall)
- DDoS protection
- Rate limiting per IP/user
- SSL/TLS termination at load balancer

## Monitoring & Logging

### Application Logs
```javascript
// Structured logging
{
  level: 'info',
  timestamp: '2025-11-06T12:00:00Z',
  userId: 'user_123',
  action: 'message_sent',
  metadata: {
    toUserId: 'user_456',
    messageType: 'text'
    // No message content logged
  }
}
```

### Audit Logs
```javascript
{
  actorUserId: 'admin_123',
  action: 'device_approved',
  targetDeviceId: 'device_789',
  timestamp: '2025-11-06T12:00:00Z',
  signature: 'base64_hmac_signature'
}
```

### Metrics
- Message delivery latency
- API response times
- WebSocket connection count
- Authentication success/failure rates
- Key rotation frequency

## Security Best Practices

### Server-Side
✅ No plaintext storage
✅ No access to encryption keys
✅ JWT with short expiry (1 hour)
✅ Rate limiting on all endpoints
✅ Helmet.js security headers
✅ Input validation with Joi
✅ MongoDB injection prevention
✅ HTTPS only
✅ CORS restrictions

### Client-Side
✅ Hardware-backed key storage
✅ Certificate pinning
✅ Device attestation
✅ Secure random number generation
✅ Memory wiping after key use
✅ Session cleanup on logout
✅ Auto-lock after inactivity

### Compliance
✅ GDPR: Right to deletion
✅ Data retention policies
✅ Audit trail (tamper-evident)
✅ Admin oversight controls
✅ Encryption at rest and in transit

## Future Enhancements

1. **Voice/Video Calls**: WebRTC with DTLS-SRTP
2. **Multi-Device Sync**: Sealed sender protocol
3. **Disappearing Messages**: Auto-delete with timers
4. **Backup**: Encrypted cloud backup
5. **Advanced Analytics**: Admin dashboard insights
6. **Incident Integration**: Link to case management
7. **Panic Mode**: Emergency data wipe
8. **Geolocation**: Secure location sharing

---

**Security Note**: This architecture prioritizes end-to-end encryption with zero-knowledge server design. The server acts only as a message relay and cannot decrypt any communication.
