/**
 * Login Screen
 * OTP-based authentication for police officers
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import authService from '@services/authService';

interface Props {
  navigation: any;
}

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'otp' | 'sso'>('otp');

  const handleRequestOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.requestOTP(phoneNumber);

      if (result.success) {
        navigation.navigate('OTPVerification', {phoneNumber});
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../assets/badge.png')}
          style={styles.logo}
          defaultSource={require('../assets/badge.png')}
        />
        <Text style={styles.title}>Secure Police Messaging</Text>
        <Text style={styles.subtitle}>End-to-End Encrypted Communication</Text>
      </View>

      {/* Login Method Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, loginMethod === 'otp' && styles.toggleActive]}
          onPress={() => setLoginMethod('otp')}
        >
          <Text style={[styles.toggleText, loginMethod === 'otp' && styles.toggleTextActive]}>
            OTP Login
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, loginMethod === 'sso' && styles.toggleActive]}
          onPress={() => setLoginMethod('sso')}
        >
          <Text style={[styles.toggleText, loginMethod === 'sso' && styles.toggleTextActive]}>
            SSO Login
          </Text>
        </TouchableOpacity>
      </View>

      {/* OTP Login Form */}
      {loginMethod === 'otp' ? (
        <View style={styles.form}>
          <Text style={styles.label}>Badge Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your badge number"
            value={badgeNumber}
            onChangeText={setBadgeNumber}
            keyboardType="numeric"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 (XXX) XXX-XXXX"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRequestOTP}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        // SSO Login Form
        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Security Info */}
      <View style={styles.securityInfo}>
        <Text style={styles.securityText}>🔒 All messages are end-to-end encrypted</Text>
        <Text style={styles.securityText}>🛡️ Your data is protected with Signal Protocol</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: '#fff',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#1E40AF',
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1E40AF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityInfo: {
    marginTop: 'auto',
    marginBottom: 40,
    alignItems: 'center',
  },
  securityText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
});

export default LoginScreen;
