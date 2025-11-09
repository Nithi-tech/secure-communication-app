/**
 * Admin Dashboard
 * Device approval, audit logs, user management
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import axios from 'axios';

const API_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface PendingDevice {
  _id: string;
  userId: {name: string; rank: string; badgeNo: string};
  model: string;
  os: string;
  createdAt: string;
}

interface Props {
  navigation: any;
}

const AdminDashboard: React.FC<Props> = ({navigation}) => {
  const [pendingDevices, setPendingDevices] = useState<PendingDevice[]>([]);
  const [activeTab, setActiveTab] = useState<'devices' | 'audit'>('devices');

  useEffect(() => {
    loadPendingDevices();
  }, []);

  const loadPendingDevices = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/devices`);
      setPendingDevices(response.data.devices);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const handleApprove = async (deviceId: string) => {
    Alert.alert(
      'Approve Device',
      'Are you sure you want to approve this device?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await axios.post(`${API_URL}/api/admin/devices/${deviceId}/approve`);
              Alert.alert('Success', 'Device approved');
              loadPendingDevices();
            } catch (error) {
              Alert.alert('Error', 'Failed to approve device');
            }
          },
        },
      ]
    );
  };

  const renderDevice = ({item}: {item: PendingDevice}) => (
    <View style={styles.deviceCard}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>
          {item.userId.rank} {item.userId.name}
        </Text>
        <Text style={styles.deviceDetails}>
          Badge: {item.userId.badgeNo}
        </Text>
        <Text style={styles.deviceDetails}>
          Device: {item.model} ({item.os})
        </Text>
        <Text style={styles.deviceDate}>
          Requested: {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.approveButton}
        onPress={() => handleApprove(item._id)}
      >
        <Text style={styles.approveButtonText}>Approve</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'devices' && styles.activeTab]}
          onPress={() => setActiveTab('devices')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'devices' && styles.activeTabText,
            ]}
          >
            Pending Devices ({pendingDevices.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'audit' && styles.activeTab]}
          onPress={() => setActiveTab('audit')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'audit' && styles.activeTabText,
            ]}
          >
            Audit Logs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'devices' ? (
        pendingDevices.length > 0 ? (
          <FlatList
            data={pendingDevices}
            keyExtractor={item => item._id}
            renderItem={renderDevice}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No pending devices</Text>
          </View>
        )
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Audit logs coming soon...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#DC2626',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#DC2626',
  },
  listContent: {
    padding: 16,
  },
  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  deviceDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  deviceDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  approveButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

export default AdminDashboard;
