# Quick Start Guide - Secure Police Messaging App

## 🚀 Setup in 5 Minutes

### Step 1: Install Dependencies

#### Backend
```powershell
cd backend
npm install
```

#### Mobile
```powershell
cd mobile
npm install
```

### Step 2: Configure Environment

```powershell
# Backend - copy and edit .env
cd backend
Copy-Item .env.example .env
# Edit .env with your MongoDB URI and secrets
```

### Step 3: Start MongoDB

```powershell
# If using MongoDB locally
mongod --dbpath ./data
```

Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

### Step 4: Start Backend Server

```powershell
cd backend
npm run dev
```

Server will run on `http://localhost:3000`

### Step 5: Run Mobile App

```powershell
cd mobile

# Start Metro bundler
npm start

# In another terminal - Run on Android
npm run android

# OR Run on iOS (Mac only)
npm run ios
```

## 📱 Testing the App

### Test Flow:

1. **Login Screen** - Enter phone number and badge number
2. **OTP** - Use code from console (check backend logs)
3. **Device Approval** - Will show "pending" status
4. **Admin Approval** - Use Postman to approve device (see below)
5. **Chat List** - View contacts and groups
6. **Send Message** - Encrypted end-to-end

### Approve Device via Postman:

```http
POST http://localhost:3000/api/admin/devices/{deviceId}/approve
Headers:
  Authorization: Bearer <admin_jwt_token>
```

## 🔧 Common Issues

### Issue: Dependencies not installing
**Solution:** Delete `node_modules` and `package-lock.json`, then run `npm install` again

### Issue: Metro bundler cache
**Solution:** 
```powershell
cd mobile
npm start -- --reset-cache
```

### Issue: iOS build fails
**Solution:** 
```powershell
cd mobile/ios
pod install
cd ..
npm run ios
```

### Issue: Android build fails
**Solution:** Check Android Studio SDK is installed, then:
```powershell
cd mobile/android
./gradlew clean
cd ..
npm run android
```

### Issue: Crypto library errors
**Solution:** Some dependencies need to be installed after linking:
```powershell
cd mobile
npm install
npx react-native link
```

## 📊 Project Status

✅ **Completed:**
- Signal Protocol (X3DH + Double Ratchet) implementation
- OTP authentication with device provisioning
- Secure key storage (Keychain/Keystore)
- End-to-end encrypted messaging
- File attachment encryption
- Admin dashboard for device approval
- Audit logging
- Backend API with metadata-only storage

🚧 **To Complete for Production:**
- Install dependencies: `npm install` in both directories
- Set up MongoDB connection
- Configure Twilio for real OTP
- Set up AWS S3 for file storage
- Add proper error handling
- Write more unit tests
- Security audit
- Performance testing

## 🎯 Demo Script

### For Hackathon Presentation:

1. **Introduction** (30 sec)
   - "Secure messaging for police using Signal Protocol"
   - End-to-end encryption, no server access to content

2. **Architecture** (1 min)
   - Show code: X3DH implementation
   - Explain Double Ratchet for forward secrecy
   - Device provisioning with client-side keys

3. **Live Demo** (2 min)
   - Login with OTP
   - Device provisioning
   - Send encrypted message
   - Show admin dashboard

4. **Security Features** (1 min)
   - Hardware-backed keys
   - Metadata-only server
   - Audit logs
   - Device attestation

5. **Q&A** (1 min)

## 🔐 Security Notes

⚠️ **IMPORTANT FOR PRODUCTION:**

1. Change all default secrets in `.env`
2. Use strong JWT secrets (32+ characters)
3. Enable HTTPS only
4. Configure certificate pinning
5. Set up proper firewall rules
6. Enable MongoDB authentication
7. Use AWS IAM roles for S3
8. Implement rate limiting
9. Add input validation
10. Regular security audits

## 📞 Support

For questions or issues:
- Check README.md for detailed docs
- Review code comments for implementation details
- All security-critical operations are documented

---

**Built for Secure Police Communication** 🛡️
