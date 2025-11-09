/**
 * Main App Component
 * Entry point with navigation and authentication flow
 */

import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ActivityIndicator, View, StyleSheet} from 'react-native';

// Screens
import LoginScreen from './screens/LoginScreen';
import OTPVerificationScreen from './screens/OTPVerificationScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';
import GroupChatScreen from './screens/GroupChatScreen';
import AdminDashboard from './screens/AdminDashboard';
import DeviceApprovalScreen from './screens/DeviceApprovalScreen';

// Services
import authService from './services/authService';

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    
    // Check auth status every 2 seconds to detect login
    const interval = setInterval(() => {
      checkAuthStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1E40AF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
          initialRouteName={isAuthenticated ? 'ChatList' : 'Login'}
        >
          {/* Auth Screens */}
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="OTPVerification"
            component={OTPVerificationScreen}
            options={{title: 'Verify OTP'}}
          />
          <Stack.Screen
            name="DeviceApproval"
            component={DeviceApprovalScreen}
            options={{title: 'Device Approval Pending'}}
          />
          
          {/* Main App Screens */}
          <Stack.Screen
            name="ChatList"
            component={ChatListScreen}
            options={{title: 'Secure Messaging'}}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{title: 'Chat'}}
          />
          <Stack.Screen
            name="GroupChat"
            component={GroupChatScreen}
            options={{title: 'Group Chat'}}
          />
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboard}
            options={{title: 'Admin Dashboard'}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
});

export default App;
