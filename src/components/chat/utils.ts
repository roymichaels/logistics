export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'עכשיו';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `לפני ${minutes} דק'`;
  } else if (diffInSeconds < 86400) {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `לפני ${days} ימים`;
  } else {
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit'
    });
  }
}

export function groupMessagesBySender(messages: any[]): any[] {
  const groups: any[] = [];
  let currentGroup: any[] = [];
  let currentSender: string | null = null;

  messages.forEach((message, index) => {
    const isSameSender = message.sender_id === currentSender;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const timeDiff = prevMessage
      ? new Date(message.created_at).getTime() -
        new Date(prevMessage.created_at).getTime()
      : 0;
    const isWithinTimeWindow = timeDiff < 60000;

    if (isSameSender && isWithinTimeWindow) {
      currentGroup.push(message);
    } else {
      if (currentGroup.length > 0) {
        groups.push({
          senderId: currentSender,
          messages: [...currentGroup]
        });
      }
      currentGroup = [message];
      currentSender = message.sender_id;
    }
  });

  if (currentGroup.length > 0) {
    groups.push({
      senderId: currentSender,
      messages: currentGroup
    });
  }

  return groups;
}
