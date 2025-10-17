import { useContext } from 'react';

import { ChatContext, type ChatContextValue } from '@/context/ChatContext.shared';

export const useChatContext = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
