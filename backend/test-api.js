/**
 * API Test Script
 * Tests all the enhanced backend functionality
 * Run after server is started: node test-api.js
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
let authToken = '';
let currentUserId = '';
let targetUserId = '';

// Helper function to make authenticated requests
const api = axios.create({
  baseURL: BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

async function test1_Login() {
  console.log('\n🧪 Test 1: Login with credentials');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      userId: 'officer001',
      password: 'Police@123',
    });
    
    authToken = response.data.tokens.accessToken;
    currentUserId = response.data.user.id;
    
    console.log('✅ Login successful');
    console.log('   User:', response.data.user.name);
    console.log('   Police Station:', response.data.user.policeStation || 'N/A');
    console.log('   Posting:', response.data.user.posting || 'N/A');
    console.log('   Token:', authToken.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function test2_GetAllUsers() {
  console.log('\n🧪 Test 2: Get all users (contact list)');
  try {
    const response = await api.get('/users');
    
    console.log('✅ Fetched users:', response.data.users.length);
    if (response.data.users.length > 0) {
      targetUserId = response.data.users[0].id;
      const user = response.data.users[0];
      console.log('   First user:', user.name);
      console.log('   Police Station:', user.policeStation);
      console.log('   Posting:', user.posting);
    }
    return true;
  } catch (error) {
    console.log('❌ Get users failed:', error.response?.data || error.message);
    return false;
  }
}

async function test3_SearchUsers() {
  console.log('\n🧪 Test 3: Search users by police station');
  try {
    const response = await api.get('/users/search?q=Chennai');
    
    console.log('✅ Search results:', response.data.users.length);
    response.data.users.slice(0, 3).forEach(user => {
      console.log(`   - ${user.name} at ${user.policeStation}`);
    });
    return true;
  } catch (error) {
    console.log('❌ Search failed:', error.response?.data || error.message);
    return false;
  }
}

async function test4_SendMessage() {
  console.log('\n🧪 Test 4: Send encrypted message');
  try {
    const response = await api.post('/messages', {
      toUserId: targetUserId,
      encryptedContent: 'ENCRYPTED_MESSAGE_CONTENT_BASE64',
      contentType: 'text',
      messageType: 'message',
    });
    
    console.log('✅ Message sent successfully');
    console.log('   Message ID:', response.data.message.id);
    console.log('   To User ID:', response.data.message.toUserId);
    return true;
  } catch (error) {
    console.log('❌ Send message failed:', error.response?.data || error.message);
    return false;
  }
}

async function test5_GetRecentChats() {
  console.log('\n🧪 Test 5: Get recent chat list');
  try {
    const response = await api.get('/messages/recent-chats');
    
    console.log('✅ Recent chats:', response.data.chats.length);
    response.data.chats.slice(0, 3).forEach(chat => {
      console.log(`   - ${chat.user.name} (${chat.unreadCount} unread)`);
    });
    return true;
  } catch (error) {
    console.log('❌ Get recent chats failed:', error.response?.data || error.message);
    return false;
  }
}

async function test6_GetConversation() {
  console.log('\n🧪 Test 6: Get conversation history');
  try {
    const response = await api.get(`/messages/conversation/${targetUserId}`);
    
    console.log('✅ Conversation messages:', response.data.messages.length);
    if (response.data.messages.length > 0) {
      console.log('   Latest message timestamp:', response.data.messages[response.data.messages.length - 1].timestamp);
    }
    return true;
  } catch (error) {
    console.log('❌ Get conversation failed:', error.response?.data || error.message);
    return false;
  }
}

async function test7_GetPendingMessages() {
  console.log('\n🧪 Test 7: Get pending/undelivered messages');
  try {
    const response = await api.get('/messages/pending');
    
    console.log('✅ Pending messages:', response.data.messages.length);
    return true;
  } catch (error) {
    console.log('❌ Get pending messages failed:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════');
  console.log('🚀 Tamil Nadu Police Chat API Test Suite');
  console.log('═══════════════════════════════════════════');
  console.log('Server URL:', BASE_URL);
  
  const results = [];
  
  results.push(await test1_Login());
  if (!authToken) {
    console.log('\n❌ Cannot continue tests without authentication');
    return;
  }
  
  results.push(await test2_GetAllUsers());
  results.push(await test3_SearchUsers());
  results.push(await test4_SendMessage());
  results.push(await test5_GetRecentChats());
  results.push(await test6_GetConversation());
  results.push(await test7_GetPendingMessages());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n═══════════════════════════════════════════');
  console.log(`📊 Test Results: ${passed}/${total} passed`);
  console.log('═══════════════════════════════════════════');
  
  if (passed === total) {
    console.log('✅ All tests passed! Backend is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
