import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { MessagingQueries, MessagingCommands } from '../';
import type { Message, Conversation } from '../queries/messaging.queries';
import type { SendMessageInput, CreateRoomInput } from '../commands/messaging.commands';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';

export const useConversations = (userId: string) => {
  const app = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new MessagingQueries(app.db);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getConversations(userId);

    if (result.success) {
      setConversations(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
  };
};

export const useMessages = (roomId: string, limit?: number) => {
  const app = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new MessagingQueries(app.db);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getMessages(roomId, limit);

    if (result.success) {
      setMessages(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [roomId, limit]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    error,
    refetch: fetchMessages,
  };
};

export const useUnreadCount = (userId: string) => {
  const app = useApp();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new MessagingQueries(app.db);

  const fetchUnreadCount = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getUnreadCount(userId);

    if (result.success) {
      setCount(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  return {
    count,
    loading,
    error,
    refetch: fetchUnreadCount,
  };
};

export const useSendMessage = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new MessagingCommands(app.db);

  const sendMessage = useCallback(async (input: SendMessageInput): AsyncResult<{ id: string }, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.sendMessage(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    sendMessage,
    loading,
    error,
  };
};

export const useCreateRoom = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new MessagingCommands(app.db);

  const createRoom = useCallback(async (input: CreateRoomInput): AsyncResult<{ id: string }, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.createRoom(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    createRoom,
    loading,
    error,
  };
};

export const useMarkAsRead = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new MessagingCommands(app.db);

  const markAsRead = useCallback(
    async (messageIds: string[], userId: string): AsyncResult<void, ClassifiedError> => {
      setLoading(true);
      setError(null);

      const result = await commands.markAsRead(messageIds, userId);

      if (!result.success) {
        setError(result.error);
      }

      setLoading(false);
      return result;
    },
    []
  );

  return {
    markAsRead,
    loading,
    error,
  };
};
