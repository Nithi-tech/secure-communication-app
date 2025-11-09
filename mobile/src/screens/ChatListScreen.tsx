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
import authService, {User} from '@services/authService';
import messagingService from '@services/messagingService';

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
    // Mock data - in production, fetch from API
    const mockContacts: Contact[] = [
      {
        id: '1',
        name: 'Captain Smith',
        rank: 'Captain',
        lastMessage: 'Copy that, will check the area',
        timestamp: Date.now() - 300000,
        unreadCount: 2,
        type: 'direct',
      },
      {
        id: '2',
        name: 'Officer Johnson',
        rank: 'Officer',
        lastMessage: 'On my way to location',
        timestamp: Date.now() - 3600000,
        unreadCount: 0,
        type: 'direct',
      },
      {
        id: 'g1',
        name: 'Patrol Team Alpha',
        rank: 'Group',
        lastMessage: 'Shift change at 6 PM',
        timestamp: Date.now() - 7200000,
        unreadCount: 5,
        type: 'group',
      },
    ];

    setContacts(mockContacts);
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
      <FlatList
        data={filteredContacts}
        keyExtractor={item => item.id}
        renderItem={renderContact}
        contentContainerStyle={styles.listContent}
      />

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
