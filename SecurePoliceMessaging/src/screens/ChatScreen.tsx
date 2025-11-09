/**
 * Chat Screen - 1:1 Encrypted Messaging
 * Real-time E2EE conversation
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import messagingService, {ChatMessage} from '../services/messagingService';
import * as attachmentService from '../services/attachmentService';

interface Props {
  route: any;
  navigation: any;
}

const ChatScreen: React.FC<Props> = ({route, navigation}) => {
  const {userId, userName, userRank} = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({title: `${userRank} ${userName}`});

    // Subscribe to incoming messages
    const unsubscribe = messagingService.onMessage(handleIncomingMessage);

    return () => {
      unsubscribe();
    };
  }, []);

  const handleIncomingMessage = (message: ChatMessage) => {
    if (message.fromUserId === userId) {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
      
      // Mark as read
      if (message.id) {
        messagingService.markAsRead(message.id);
      }
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText('');

    // Optimistically add message to UI
    const tempMessage: ChatMessage = {
      fromUserId: 'me',
      toUserId: userId,
      content: messageText,
      type: 'text',
      timestamp: Date.now(),
      senderName: 'You',
      isOwn: true,
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      // Send encrypted message
      const sent = await messagingService.sendMessage(userId, messageText, 'text');
      
      // Update message with ID
      setMessages(prev =>
        prev.map(msg =>
          msg.timestamp === tempMessage.timestamp
            ? {...msg, id: sent.id, delivered: true}
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // TODO: Show error indicator
    }
  };

  const handleAttachment = async () => {
    try {
      const file = await attachmentService.pickDocument();
      if (file) {
        // TODO: Encrypt and upload file (stub)
        console.log('[STUB] File selected');
      }
    } catch (error) {
      console.error('Attachment error:', error);
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    // Send typing indicator
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      messagingService.sendTypingIndicator(userId, true);
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false);
      messagingService.sendTypingIndicator(userId, false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({animated: true});
    }, 100);
  };

  const renderMessage = ({item}: {item: ChatMessage}) => (
    <View
      style={[
        styles.messageBubble,
        item.isOwn ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      {!item.isOwn && (
        <Text style={styles.senderName}>
          {item.senderRank} {item.senderName}
        </Text>
      )}
      <Text style={styles.messageText}>{item.content}</Text>
      <View style={styles.messageFooter}>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        {item.isOwn && (
          <Text style={styles.status}>
            {item.read ? '✓✓' : item.delivered ? '✓' : '○'}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item.id || `temp_${index}`}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={scrollToBottom}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton} onPress={handleAttachment}>
          <Text style={styles.attachIcon}>📎</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#1E40AF',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  status: {
    fontSize: 11,
    color: '#10B981',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  attachIcon: {
    fontSize: 24,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendIcon: {
    fontSize: 20,
    color: '#fff',
  },
});

export default ChatScreen;
