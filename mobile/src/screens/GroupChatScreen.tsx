/**
 * Group Chat Screen
 * Encrypted group messaging
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface Props {
  route: any;
  navigation: any;
}

const GroupChatScreen: React.FC<Props> = ({route, navigation}) => {
  const {groupId, groupName} = route.params;

  React.useEffect(() => {
    navigation.setOptions({title: groupName});
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Group Chat: {groupName}</Text>
      <Text style={styles.subtext}>Group messaging with E2EE coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 24,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default GroupChatScreen;
