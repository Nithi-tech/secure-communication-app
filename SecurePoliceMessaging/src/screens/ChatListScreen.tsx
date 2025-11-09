/**
 * Chat List Screen
 * Shows all conversations with contacts and groups
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
} from 'react-native';
import authService, {User} from '../services/authService';
import messagingService from '../services/messagingService';

interface Contact {
  id: string;
  name: string;
  rank: string;
  lastMessage?: string;
  timestamp?: number;
  unreadCount?: number;
  avatar?: string;
  type: 'direct' | 'group';
}

interface Props {
  navigation: any;
}

const ChatListScreen: React.FC<Props> = ({navigation}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadContacts();
    connectMessaging();

    return () => {
      messagingService.disconnect();
    };
  }, []);

  const loadCurrentUser = async () => {
    const user = await authService.getCurrentUser();
    setCurrentUser(user);
  };

  const loadContacts = async () => {
    try {
      // Get authentication token
      const token = await authService.getToken();
      
      if (!token) {
        console.log('❌ No auth token available');
        loadMockContacts();
        return;
      }

      console.log('🔄 Fetching contacts from API...');

      // Fetch all users from API (excluding self)
      const response = await fetch('http://localhost:3000/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 API Response:', JSON.stringify(data, null, 2));
        
        // Backend returns { success: true, users: [...] }
        const users: User[] = data.users || [];
        
        if (users.length === 0) {
          console.log('⚠️ No users returned from API');
          loadMockContacts();
          return;
        }
        
        // Convert API users to Contact format
        const userContacts: Contact[] = users.map(user => ({
          id: user.id,
          name: user.name,
          rank: user.rank,
          lastMessage: 'Tap to start encrypted chat',
          timestamp: Date.now(),
          unreadCount: 0,
          type: 'direct' as const,
        }));

        setContacts(userContacts);
        console.log(`✅ Loaded ${userContacts.length} contacts from API`);
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to fetch users: ${response.status}`, errorText);
        // Fallback to mock data if API fails
        loadMockContacts();
      }
    } catch (error) {
      console.error('❌ Error loading contacts:', error);
      // Fallback to mock data
      loadMockContacts();
    }
  };

  const loadMockContacts = () => {
    console.log('⚠️ Using fallback: No contacts available');
    setContacts([]);
  };

  const connectMessaging = async () => {
    // Connect to messaging service
    const token = ''; // Get from auth service
    const userId = currentUser?.id || '';
    await messagingService.connect(token, userId);
  };

  const handleOpenChat = (contact: Contact) => {
    if (contact.type === 'group') {
      navigation.navigate('GroupChat', {
        groupId: contact.id,
        groupName: contact.name,
      });
    } else {
      navigation.navigate('Chat', {
        userId: contact.id,
        userName: contact.name,
        userRank: contact.rank,
      });
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigation.replace('Login');
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContact = ({item}: {item: Contact}) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleOpenChat(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name.split(' ').map(n => n[0]).join('')}
        </Text>
      </View>

      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.timestamp && (
            <Text style={styles.timestamp}>
              {formatTimestamp(item.timestamp)}
            </Text>
          )}
        </View>

        <View style={styles.contactFooter}>
          <Text style={styles.rank}>{item.rank}</Text>
          {item.lastMessage && (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          )}
        </View>
      </View>

      {item.unreadCount && item.unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, {currentUser?.rank} {currentUser?.name}
        </Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Contact List */}
      {filteredContacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {searchQuery ? 'No contacts found' : 'No contacts available'}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {searchQuery ? 'Try a different search' : 'Pull to refresh'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={item => item.id}
          renderItem={renderContact}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Admin Button (if admin user) */}
      {currentUser?.role === 'admin' || currentUser?.role === 'super_admin' ? (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => navigation.navigate('AdminDashboard')}
        >
          <Text style={styles.adminButtonText}>Admin Dashboard</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  logoutText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  contactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rank: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  badge: {
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  adminButton: {
    margin: 16,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatListScreen;
